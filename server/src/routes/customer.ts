import { Router } from 'express';
import {
  getCustomers,
  getCustomerDetail,
  createCustomer,
  updateCustomer,
  createFollowUp,
} from '../controllers/customer';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../validators';
import {
  getCustomersQuerySchema,
  getCustomerDetailSchema,
  createCustomerSchema,
  updateCustomerSchema,
  createFollowUpSchema,
} from '../validators/customer';

const router = Router();

// GET /api/customers - List paginated, filtered, searched customers
router.get('/', authenticate, authorize('ADMIN', 'SALES', 'ACCOUNTS'), validateRequest(getCustomersQuerySchema), getCustomers);

// GET /api/customers/:id - View details & follow-up logs
router.get('/:id', authenticate, authorize('ADMIN', 'SALES', 'ACCOUNTS'), validateRequest(getCustomerDetailSchema), getCustomerDetail);

// POST /api/customers - Create a customer profile
router.post('/', authenticate, authorize('ADMIN', 'SALES'), validateRequest(createCustomerSchema), createCustomer);

// PATCH /api/customers/:id - Edit customer details
router.patch('/:id', authenticate, authorize('ADMIN', 'SALES'), validateRequest(updateCustomerSchema), updateCustomer);

// POST /api/customers/:id/follow-ups - Append a follow-up action log
router.post('/:id/follow-ups', authenticate, authorize('ADMIN', 'SALES'), validateRequest(createFollowUpSchema), createFollowUp);

export default router;
