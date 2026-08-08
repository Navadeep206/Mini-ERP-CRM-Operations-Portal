import { Router } from 'express';
import {
  getProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  getStockMovements,
  createStockMovement,
} from '../controllers/product';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../validators';
import {
  getProductsQuerySchema,
  getProductDetailSchema,
  createProductSchema,
  updateProductSchema,
  getStockMovementsQuerySchema,
  createStockMovementSchema,
} from '../validators/product';

const router = Router();

// GET /api/products - Paginated & filtered catalog list
router.get('/', authenticate, authorize('ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS'), validateRequest(getProductsQuerySchema), getProducts);

// GET /api/products/:id - Product detail
router.get('/:id', authenticate, authorize('ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS'), validateRequest(getProductDetailSchema), getProductDetail);

// POST /api/products - Create a catalog entry
router.post('/', authenticate, authorize('ADMIN', 'WAREHOUSE'), validateRequest(createProductSchema), createProduct);

// PATCH /api/products/:id - Update product profile specifications
router.patch('/:id', authenticate, authorize('ADMIN', 'WAREHOUSE'), validateRequest(updateProductSchema), updateProduct);

// GET /api/products/:id/stock-movements - View audit movements history
router.get('/:id/stock-movements', authenticate, authorize('ADMIN', 'WAREHOUSE', 'ACCOUNTS'), validateRequest(getStockMovementsQuerySchema), getStockMovements);

// POST /api/products/:id/stock-movements - Adjust inventory count
router.post('/:id/stock-movements', authenticate, authorize('ADMIN', 'WAREHOUSE'), validateRequest(createStockMovementSchema), createStockMovement);

export default router;
