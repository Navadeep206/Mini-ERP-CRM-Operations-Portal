import { Router } from 'express';
import { postQuery } from '../controllers/ai';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { validateRequest } from '../validators';

const router = Router();

// Zod schema for RAG queries
const ragQuerySchema = z.object({
  body: z.object({
    question: z.string().min(1, 'Question must not be empty').max(500, 'Question prompt is too long (500 chars max)'),
  }).strict('Unknown request parameters')
});

// POST /api/ai/query - Process natural language operations queries
router.post(
  '/query',
  authenticate,
  validateRequest(ragQuerySchema),
  postQuery
);

export default router;
