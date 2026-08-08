import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/summary - Retrieve ERP/CRM aggregated metrics (open to all roles)
router.get('/summary', authenticate, authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'), getDashboardSummary);

export default router;
