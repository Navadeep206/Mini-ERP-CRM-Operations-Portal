import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services';

// 1. Fetch Paginated Low Stock Products Catalog
export const getLowStockProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    
    const pageSize = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * pageSize;

    const lowStockIdsResult = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product" WHERE "currentStock" <= "minimumStock"
    `;
    const ids = lowStockIdsResult.map((r) => r.id);

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: ids } },
        orderBy: { currentStock: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.product.count({
        where: { id: { in: ids } },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    const classifiedProducts = products.map((p) => {
      let classification = 'LOW_STOCK';
      if (p.currentStock === 0) {
        classification = 'OUT_OF_STOCK';
      }
      return {
        ...p,
        unitPrice: Number(p.unitPrice),
        classification,
      };
    });

    res.status(200).json({
      success: true,
      message: 'Low stock products retrieved successfully',
      data: classifiedProducts,
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

// 2. Compile Real-time Inventory Dashboard Statistics
export const getInventoryStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [totalProducts, stockSum, outOfStockCount, lowStockResult] = await Promise.all([
      prisma.product.count(),
      prisma.product.aggregate({
        _sum: {
          currentStock: true,
        },
      }),
      prisma.product.count({
        where: {
          currentStock: 0,
        },
      }),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count FROM "Product" 
        WHERE "currentStock" <= "minimumStock" AND "currentStock" > 0
      `,
    ]);

    const totalUnits = stockSum._sum.currentStock || 0;
    const lowStockCount = Number(lowStockResult[0]?.count || 0);

    res.status(200).json({
      success: true,
      message: 'Inventory dashboard statistics compiled successfully',
      data: {
        totalProducts,
        totalUnits,
        outOfStockProducts: outOfStockCount,
        lowStockProducts: lowStockCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
