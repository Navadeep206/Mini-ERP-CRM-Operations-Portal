import { Router } from 'express';
import { analyzeImport, confirmImport } from '../controllers/import';
import { authenticate, authorize } from '../middleware/auth';
import { uploadExcel } from '../middleware/multer';
import { validateRequest } from '../validators';
import { importConfirmSchema } from '../validators/import';

const router = Router();

// POST /api/import/analyze - Analyze spreadsheet columns, mapping, valid states, and duplicate alerts
// Open to WAREHOUSE and ADMIN
router.post(
  '/analyze',
  authenticate,
  authorize('ADMIN', 'WAREHOUSE'),
  uploadExcel.single('file'),
  analyzeImport
);

// POST /api/import/confirm - Perform transactional DB writes for validated spreadsheet records
// Open to WAREHOUSE and ADMIN (USER imports are role-checked inside the controller)
router.post(
  '/confirm',
  authenticate,
  authorize('ADMIN', 'WAREHOUSE'),
  validateRequest(importConfirmSchema),
  confirmImport
);

export default router;
