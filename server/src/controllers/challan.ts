import { Request, Response, NextFunction } from 'express';
import { Prisma, ChallanStatus, MovementType } from '@prisma/client';
import { prisma } from '../services';

class ChallanControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ChallanControllerError.prototype);
  }
}

// 1. Helper: Generate unique challan sequence code SC-YYYYMM-XXXXXX
async function generateChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
  const dateObj = new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const prefix = `SC-${year}${month}`;

  const lastChallans = await tx.$queryRaw<any[]>`
    SELECT "challanNumber" FROM "SalesChallan"
    WHERE "challanNumber" LIKE ${prefix + '-%'}
    ORDER BY "challanNumber" DESC
    LIMIT 1
    FOR UPDATE
  `;

  let nextSeq = 1;
  if (lastChallans.length > 0) {
    const lastNum = lastChallans[0].challanNumber;
    const parts = lastNum.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  const seqStr = String(nextSeq).padStart(6, '0');
  return `${prefix}-${seqStr}`;
}

// 2. Helper: Shared transaction stock-deduction logic
async function executeChallanConfirmation(tx: Prisma.TransactionClient, challanId: string, createdBy: string) {
  const challan = await tx.salesChallan.findUnique({
    where: { id: challanId },
    include: { items: true },
  });

  if (!challan) {
    throw new ChallanControllerError('Challan record not found', 404);
  }

  if (challan.status !== ChallanStatus.DRAFT) {
    throw new ChallanControllerError('Only draft challans can be confirmed', 409);
  }

  const items = challan.items;
  const sortedProductIds = Array.from(new Set(items.map((i) => i.productId))).sort();

  if (sortedProductIds.length === 0) {
    throw new ChallanControllerError('Challan has no line items', 400);
  }

  const lockedProducts = await tx.$queryRaw<any[]>`
    SELECT id, name, "currentStock" FROM "Product"
    WHERE id IN (${Prisma.join(sortedProductIds)})
    FOR UPDATE
  `;

  const productStockMap = new Map<string, number>();
  const productNameMap = new Map<string, string>();
  for (const p of lockedProducts) {
    productStockMap.set(p.id, p.currentStock);
    productNameMap.set(p.id, p.name);
  }

  for (const item of items) {
    const available = productStockMap.get(item.productId);
    if (available === undefined) {
      throw new ChallanControllerError(`Product ${item.productId} does not exist`, 404);
    }
    if (available < item.quantity) {
      throw new ChallanControllerError(
        `Insufficient stock for product "${productNameMap.get(item.productId)}". Required: ${item.quantity}, Available: ${available}`,
        409
      );
    }
  }

  for (const item of items) {
    const current = productStockMap.get(item.productId)!;
    const newStock = current - item.quantity;
    
    await tx.product.update({
      where: { id: item.productId },
      data: { currentStock: newStock },
    });

    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        quantityChanged: item.quantity,
        movementType: MovementType.OUT,
        reason: `Sales Challan ${challan.challanNumber}`,
        createdBy,
      },
    });

    productStockMap.set(item.productId, newStock);
  }

  await tx.salesChallan.update({
    where: { id: challanId },
    data: { status: ChallanStatus.CONFIRMED },
  });
}

// 3. Create Challan (Draft or direct Confirmation)
export const createChallan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customerId, items, status } = req.body;

    if (!req.user) {
      throw new ChallanControllerError('User is unauthenticated', 401);
    }
    const createdBy = req.user.id;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new ChallanControllerError('Customer record not found', 404);
    }

    const mergedMap = new Map<string, number>();
    for (const item of items) {
      const current = mergedMap.get(item.productId) || 0;
      mergedMap.set(item.productId, current + item.quantity);
    }

    const uniqueProductIds = Array.from(mergedMap.keys());
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new ChallanControllerError('One or more products inside line items do not exist', 404);
    }

    const productInfoMap = new Map<string, any>();
    for (const p of products) {
      productInfoMap.set(p.id, p);
    }

    let totalQuantity = 0;
    const itemsData = uniqueProductIds.map((productId) => {
      const quantity = mergedMap.get(productId)!;
      totalQuantity += quantity;
      
      const p = productInfoMap.get(productId)!;
      return {
        productId,
        productNameSnapshot: p.name,
        skuSnapshot: p.sku,
        unitPriceSnapshot: p.unitPrice,
        quantity,
      };
    });

    let retryCount = 0;
    const maxRetries = 3;
    let challanRecord: any = null;

    while (retryCount < maxRetries) {
      try {
        challanRecord = await prisma.$transaction(async (tx) => {
          const num = await generateChallanNumber(tx);
          
          const salesChallan = await tx.salesChallan.create({
            data: {
              challanNumber: num,
              customerId,
              totalQuantity,
              status: status === ChallanStatus.CONFIRMED ? ChallanStatus.DRAFT : status,
              createdBy,
              items: {
                createMany: {
                  data: itemsData,
                },
              },
            },
          });

          if (status === ChallanStatus.CONFIRMED) {
            await executeChallanConfirmation(tx, salesChallan.id, createdBy);
          }

          return salesChallan;
        });

        break;
      } catch (err: any) {
        if (err.code === 'P2002' && retryCount < maxRetries - 1) {
          retryCount++;
          continue;
        }
        throw err;
      }
    }

    const completedChallan = await prisma.salesChallan.findUnique({
      where: { id: challanRecord.id },
      include: {
        customer: true,
        items: true,
      },
    });

    res.status(201).json({
      success: true,
      message: `Sales challan successfully recorded in status ${status}`,
      data: completedChallan,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Get Challans List
export const getChallans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    
    const pageSize = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * pageSize;

    const { search, status, customerId } = req.query;

    const where: Prisma.SalesChallanWhereInput = {};

    if (status && Object.values(ChallanStatus).includes(status as ChallanStatus)) {
      where.status = status as ChallanStatus;
    }

    if (customerId && typeof customerId === 'string') {
      where.customerId = customerId;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { challanNumber: { contains: search, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { businessName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [challans, totalCount] = await Promise.all([
      prisma.salesChallan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              businessName: true,
            },
          },
          creator: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      }),
      prisma.salesChallan.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    res.status(200).json({
      success: true,
      message: 'Challans retrieved successfully',
      data: challans,
      pagination: {
        page,
        limit: pageSize,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 5. Get Challan Details (displays product snapshots)
export const getChallanDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!challan) {
      throw new ChallanControllerError('Challan record not found', 404);
    }

    const formattedItems = challan.items.map((item) => ({
      ...item,
      unitPriceSnapshot: Number(item.unitPriceSnapshot),
    }));

    res.status(200).json({
      success: true,
      message: 'Challan details retrieved successfully',
      data: {
        ...challan,
        items: formattedItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 6. Update Draft Challan
export const updateChallan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { customerId, items } = req.body;

    const existing = await prisma.salesChallan.findUnique({ where: { id } });
    if (!existing) {
      throw new ChallanControllerError('Challan record not found', 404);
    }

    if (existing.status !== ChallanStatus.DRAFT) {
      throw new ChallanControllerError('Only draft challans can be edited', 409);
    }

    const updatedChallan = await prisma.$transaction(async (tx) => {
      let finalCustomerId = existing.customerId;
      
      if (customerId && customerId !== existing.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
          throw new ChallanControllerError('Customer record not found', 404);
        }
        finalCustomerId = customerId;
      }

      let totalQuantity = existing.totalQuantity;

      if (items && Array.isArray(items)) {
        const mergedMap = new Map<string, number>();
        for (const item of items) {
          const current = mergedMap.get(item.productId) || 0;
          mergedMap.set(item.productId, current + item.quantity);
        }

        const uniqueProductIds = Array.from(mergedMap.keys());
        const products = await tx.product.findMany({
          where: { id: { in: uniqueProductIds } },
        });

        if (products.length !== uniqueProductIds.length) {
          throw new ChallanControllerError('One or more products inside line items do not exist', 404);
        }

        const productInfoMap = new Map<string, any>();
        for (const p of products) {
          productInfoMap.set(p.id, p);
        }

        totalQuantity = 0;
        const itemsData = uniqueProductIds.map((productId) => {
          const quantity = mergedMap.get(productId)!;
          totalQuantity += quantity;
          const p = productInfoMap.get(productId)!;
          return {
            productId,
            productNameSnapshot: p.name,
            skuSnapshot: p.sku,
            unitPriceSnapshot: p.unitPrice,
            quantity,
          };
        });

        await tx.salesChallanItem.deleteMany({ where: { challanId: id } });

        await tx.salesChallanItem.createMany({
          data: itemsData.map((item) => ({
            ...item,
            challanId: id,
          })),
        });
      }

      return tx.salesChallan.update({
        where: { id },
        data: {
          customerId: finalCustomerId,
          totalQuantity,
        },
      });
    });

    const completed = await prisma.salesChallan.findUnique({
      where: { id: updatedChallan.id },
      include: { customer: true, items: true },
    });

    res.status(200).json({
      success: true,
      message: 'Draft challan updated successfully',
      data: completed,
    });
  } catch (error) {
    next(error);
  }
};

// 7. Confirm Challan
export const confirmChallan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      throw new ChallanControllerError('User is unauthenticated', 401);
    }
    const createdBy = req.user.id;

    await prisma.$transaction(async (tx) => {
      await executeChallanConfirmation(tx, id, createdBy);
    });

    res.status(200).json({
      success: true,
      message: 'Sales challan confirmed and stock inventory deducted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// 8. Cancel Challan (draft cancellation only)
export const cancelChallan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.salesChallan.findUnique({ where: { id } });
    if (!existing) {
      throw new ChallanControllerError('Challan record not found', 404);
    }

    if (existing.status === ChallanStatus.CANCELLED) {
      res.status(200).json({
        success: true,
        message: 'Challan is already in CANCELLED status',
      });
      return;
    }

    if (existing.status === ChallanStatus.CONFIRMED) {
      throw new ChallanControllerError('Confirmed sales challans cannot be cancelled (stock reversal is blocked)', 409);
    }

    if (existing.status !== ChallanStatus.DRAFT) {
      throw new ChallanControllerError(`Invalid status transition from ${existing.status} to CANCELLED`, 400);
    }

    await prisma.salesChallan.update({
      where: { id },
      data: { status: ChallanStatus.CANCELLED },
    });

    res.status(200).json({
      success: true,
      message: 'Draft challan successfully marked as CANCELLED',
    });
  } catch (error) {
    next(error);
  }
};
