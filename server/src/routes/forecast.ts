import { Router } from 'express';
import { triggerTrain, getProductForecast } from '../controllers/forecast';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';
import { validateRequest } from '../validators';

const router = Router();

// Zod schemas for request validation
const getForecastQuerySchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid Product ID format'),
  }).strict('Unknown path parameters'),
  query: z.object({
    horizon: z.string().regex(/^\d+$/).transform(Number).refine(val => val >= 1 && val <= 12, {
      message: 'Forecast horizon query parameter must be an integer between 1 and 12'
    }).optional()
  }).strict('Unknown query parameters')
});

// POST /api/forecast/train - Trigger model training pipeline (restricted to ADMIN only)
router.post(
  '/train',
  authenticate,
  authorize('ADMIN'),
  triggerTrain
);

// GET /api/forecast/:productId - Fetch forecast predictions (open to roles allowed to view catalog)
router.get(
  '/:productId',
  authenticate,
  authorize('ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS'),
  validateRequest(getForecastQuerySchema),
  getProductForecast
);

export default router;
