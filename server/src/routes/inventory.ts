import { Router } from 'express';
import { getLowStockProducts, getInventoryStats } from '../controllers/inventory';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../validators';
import { getLowStockQuerySchema } from '../validators/inventory';

const router = Router();

// GET /api/inventory/stats - Dashboard aggregate indicators (open to ADMIN, WAREHOUSE, ACCOUNTS)
router.get('/stats', authenticate, authorize('ADMIN', 'WAREHOUSE', 'ACCOUNTS'), getInventoryStats);

// GET /api/inventory/low-stock - List of products below safety margin (open to ADMIN, WAREHOUSE, ACCOUNTS)
router.get('/low-stock', authenticate, authorize('ADMIN', 'WAREHOUSE', 'ACCOUNTS'), validateRequest(getLowStockQuerySchema), getLowStockProducts);

export default router;
