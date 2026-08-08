import { Router } from 'express';
import { login, getMe } from '../controllers/auth';
import { authenticate, authorize } from '../middleware/auth';
import { loginSchema } from '../validators/auth';
import { validateRequest } from '../validators';

const router = Router();

// POST /api/auth/login
router.post('/login', validateRequest(loginSchema), login);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

// GET /api/auth/test/admin - Test RBAC for ADMIN only
router.get('/test/admin', authenticate, authorize('ADMIN'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized: Access granted to ADMIN role',
    user: req.user,
  });
});

// GET /api/auth/test/sales - Test RBAC for ADMIN and SALES
router.get('/test/sales', authenticate, authorize('ADMIN', 'SALES'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized: Access granted to ADMIN or SALES role',
    user: req.user,
  });
});

export default router;
