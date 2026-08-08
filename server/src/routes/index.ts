import { Router } from 'express';
import healthRouter from './health';

const router = Router();

// Health check endpoint
router.use('/health', healthRouter);

export default router;
