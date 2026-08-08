import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services';

export const getDashboardSummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Fetch low stock product IDs
    const lowStockIdsResult = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product" WHERE "currentStock" <= "minimumStock"
    `;
    const lowStockIds = lowStockIdsResult.map((r) => r.id);

    // 2. Fetch metrics concurrently
    const [
      totalCustomers,
      activeCustomers,
      totalProducts,
      draftChallans,
      confirmedChallans,
      recentCustomers,
      recentChallans,
      lowStockProducts,
      recentStockMovements,
      upcomingFollowUps,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count(),
      prisma.salesChallan.count({ where: { status: 'DRAFT' } }),
      prisma.salesChallan.count({ where: { status: 'CONFIRMED' } }),
      
      // Recent lists
      prisma.customer.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.salesChallan.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          customer: {
            select: {
              name: true,
              businessName: true,
            },
          },
        },
      }),
      prisma.product.findMany({
        where: { id: { in: lowStockIds } },
        orderBy: { currentStock: 'asc' },
        take: 5,
      }),
      prisma.stockMovement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          product: {
            select: {
              name: true,
              sku: true,
            },
          },
          creator: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.customer.findMany({
        where: {
          followUpDate: {
            not: null,
          },
        },
        orderBy: { followUpDate: 'asc' },
        take: 5,
      }),
    ]);

    const formattedLowStockProducts = lowStockProducts.map((p) => ({
      ...p,
      unitPrice: Number(p.unitPrice),
    }));

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics summary retrieved successfully',
      data: {
        metrics: {
          totalCustomers,
          activeCustomers,
          totalProducts,
          lowStockProducts: lowStockIds.length,
          draftChallans,
          confirmedChallans,
        },
        recentCustomers,
        recentChallans,
        lowStockProducts: formattedLowStockProducts,
        recentStockMovements,
        upcomingFollowUps,
      },
    });
  } catch (error) {
    next(error);
  }
};
