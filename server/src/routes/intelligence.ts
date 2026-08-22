import { Router } from 'express';
import { getBulkRisk, getProductRisk } from '../controllers/intelligence';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';
import { validateRequest } from '../validators';

const router = Router();

// Zod schema for request validation
const getProductRiskQuerySchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid Product ID format'),
  }).strict('Unknown path parameters'),
  query: z.object({
    horizon: z.string().regex(/^\d+$/).transform(Number).refine(val => val >= 1 && val <= 12, {
      message: 'Forecast horizon query parameter must be an integer between 1 and 12'
    }).optional()
  }).strict('Unknown query parameters')
});

const getBulkRiskQuerySchema = z.object({
  query: z.object({
    horizon: z.string().regex(/^\d+$/).transform(Number).refine(val => val >= 1 && val <= 12, {
      message: 'Forecast horizon query parameter must be an integer between 1 and 12'
    }).optional()
  }).strict('Unknown query parameters')
});

// GET /api/inventory/intelligence - Bulk catalog risk analysis
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS'),
  validateRequest(getBulkRiskQuerySchema),
  getBulkRisk
);

// GET /api/inventory/intelligence/:productId - Single product detailed risk analysis
router.get(
  '/:productId',
  authenticate,
  authorize('ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS'),
  validateRequest(getProductRiskQuerySchema),
  getProductRisk
);

export default router;
