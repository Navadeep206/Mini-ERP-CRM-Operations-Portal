import { Request, Response, NextFunction } from 'express';
import { Prisma, MovementType } from '@prisma/client';
import { prisma } from '../services';

class ProductControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ProductControllerError.prototype);
  }
}

// 1. Fetch Paginated & Filtered Product Catalog
export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    
    const pageSize = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * pageSize;

    const { search, category, warehouseLocation, stockStatus, sortBy, sortOrder } = req.query;

    const where: Prisma.ProductWhereInput = {};

    // A. Case-insensitive search on name, sku, category
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    // B. Category filter
    if (category && typeof category === 'string') {
      where.category = category;
    }

    // C. Warehouse/Location filter
    if (warehouseLocation && typeof warehouseLocation === 'string') {
      where.warehouseLocation = warehouseLocation;
    }

    // D. Derived Stock Status Filters
    if (stockStatus && typeof stockStatus === 'string') {
      let ids: string[] | null = null;
      if (stockStatus === 'OUT_OF_STOCK') {
        where.currentStock = 0;
      } else if (stockStatus === 'LOW_STOCK') {
        const result = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Product" WHERE "currentStock" <= "minimumStock" AND "currentStock" > 0
        `;
        ids = result.map((r) => r.id);
        where.id = { in: ids };
      } else if (stockStatus === 'IN_STOCK') {
        const result = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Product" WHERE "currentStock" > "minimumStock"
        `;
        ids = result.map((r) => r.id);
        where.id = { in: ids };
      }
    }

    // E. Sort verification allowlist
    const allowedSortFields = ['name', 'sku', 'unitPrice', 'currentStock', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const orderDirection: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { [sortField]: orderDirection },
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    const formattedProducts = products.map((p) => ({
      ...p,
      unitPrice: Number(p.unitPrice),
    }));

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: formattedProducts,
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

// 2. Fetch Product detail with derived status classification
export const getProductDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new ProductControllerError('Product record not found', 404);
    }

    let stockStatus = 'IN_STOCK';
    if (product.currentStock === 0) {
      stockStatus = 'OUT_OF_STOCK';
    } else if (product.currentStock <= product.minimumStock) {
      stockStatus = 'LOW_STOCK';
    }

    res.status(200).json({
      success: true,
      message: 'Product details retrieved successfully',
      data: {
        ...product,
        unitPrice: Number(product.unitPrice),
        stockStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 3. Create Product with initial stock transaction
export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, sku, category, unitPrice, currentStock, minimumStock, warehouseLocation } = req.body;

    if (!req.user) {
      throw new ProductControllerError('User is unauthenticated', 401);
    }
    const createdBy = req.user.id;

    // Check SKU uniqueness
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      throw new ProductControllerError('Product with this SKU code already exists', 409);
    }

    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name,
          sku,
          category,
          unitPrice,
          currentStock,
          minimumStock,
          warehouseLocation,
        },
      });

      if (currentStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantityChanged: currentStock,
            movementType: MovementType.IN,
            reason: 'Initial stock setup',
            createdBy,
          },
        });
      }

      return product;
    });

    res.status(201).json({
      success: true,
      message: 'Product catalog profile created successfully',
      data: {
        ...newProduct,
        unitPrice: Number(newProduct.unitPrice),
      },
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update Product Catalog Profile (excluding direct stock edits)
export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new ProductControllerError('Product record not found', 404);
    }

    const { name, sku, category, unitPrice, minimumStock, warehouseLocation } = req.body;

    if (sku && sku !== existing.sku) {
      const conflict = await prisma.product.findUnique({ where: { sku } });
      if (conflict) {
        throw new ProductControllerError('Product with this SKU code already exists', 409);
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        category,
        unitPrice,
        minimumStock,
        warehouseLocation,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Product profile updated successfully',
      data: {
        ...updated,
        unitPrice: Number(updated.unitPrice),
      },
    });
  } catch (error) {
    next(error);
  }
};

// 5. Fetch Stock Movements logs history
export const getStockMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: productId } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    
    const pageSize = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * pageSize;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new ProductControllerError('Product record not found', 404);
    }

    const [movements, totalCount] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      }),
      prisma.stockMovement.count({ where: { productId } }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    res.status(200).json({
      success: true,
      message: 'Stock movements history retrieved successfully',
      data: movements,
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

// 6. Log Stock Movement (Concurrency safe row-level locks)
export const createStockMovement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: productId } = req.params;
    const { quantityChanged, movementType, reason } = req.body;

    if (!req.user) {
      throw new ProductControllerError('User is unauthenticated', 401);
    }
    const createdBy = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<any[]>`
        SELECT id, "currentStock", "minimumStock" FROM "Product" WHERE id = ${productId} FOR UPDATE
      `;

      if (lockedRows.length === 0) {
        throw new ProductControllerError('Product record not found', 404);
      }

      const productInfo = lockedRows[0];
      let newStock = productInfo.currentStock;

      if (movementType === MovementType.IN) {
        newStock = productInfo.currentStock + quantityChanged;
      } else {
        if (productInfo.currentStock < quantityChanged) {
          throw new ProductControllerError('Insufficient stock for this operation', 409);
        }
        newStock = productInfo.currentStock - quantityChanged;
      }

      await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          quantityChanged,
          movementType,
          reason,
          createdBy,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      return { newStock, movement };
    });

    res.status(201).json({
      success: true,
      message: 'Stock movement transaction logged successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
