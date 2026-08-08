import { Router } from 'express';
import {
  getChallans,
  getChallanDetail,
  createChallan,
  updateChallan,
  confirmChallan,
  cancelChallan,
} from '../controllers/challan';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../validators';
import {
  getChallansQuerySchema,
  challanIdParamSchema,
  createChallanSchema,
  updateChallanSchema,
} from '../validators/challan';

const router = Router();

// GET /api/challans - List paginated, filtered, and searched challans (open to all roles)
router.get('/', authenticate, authorize('ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE'), validateRequest(getChallansQuerySchema), getChallans);

// GET /api/challans/:id - View historical challan details (open to all roles)
router.get('/:id', authenticate, authorize('ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE'), validateRequest(challanIdParamSchema), getChallanDetail);

// POST /api/challans - Create a sales challan as Draft or Confirmed (restricted to ADMIN, SALES)
router.post('/', authenticate, authorize('ADMIN', 'SALES'), validateRequest(createChallanSchema), createChallan);

// PATCH /api/challans/:id - Edit draft challan attributes (restricted to ADMIN, SALES)
router.patch('/:id', authenticate, authorize('ADMIN', 'SALES'), validateRequest(updateChallanSchema), updateChallan);

// POST /api/challans/:id/confirm - Trigger inventory deduction and confirm challan (restricted to ADMIN, SALES)
router.post('/:id/confirm', authenticate, authorize('ADMIN', 'SALES'), validateRequest(challanIdParamSchema), confirmChallan);

// POST /api/challans/:id/cancel - Cancel draft challan status (restricted to ADMIN, SALES)
router.post('/:id/cancel', authenticate, authorize('ADMIN', 'SALES'), validateRequest(challanIdParamSchema), cancelChallan);

export default router;
