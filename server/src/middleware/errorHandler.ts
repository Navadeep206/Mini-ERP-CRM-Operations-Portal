import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { config } from '../config';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors: Array<{ field?: string; message: string }> = [];

  // 1. Zod Validation Error handler
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  // 2. Prisma Database Constraint leaks masking
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`[Prisma Database Error Code: ${err.code}]`, err.message);
    
    // Mask specific codes as clean responses
    if (err.code === 'P2002') {
      statusCode = 409;
      message = 'A resource with this unique constraint identifier already exists';
      const target = (err.meta?.target as string[]) || [];
      errors = [{ field: target.join('.'), message: 'Unique constraint key violation' }];
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Target database record not found';
    } else {
      // General database mask
      statusCode = 400;
      message = 'Invalid database transaction parameters submitted';
    }
  }
  // 3. Fallback General errors
  else {
    // If statusCode is 500 and not in development, mask raw stack trace
    if (statusCode === 500 && config.env !== 'development') {
      message = 'An unexpected server error occurred';
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    ...(config.env === 'development' && { stack: err.stack }),
  });
};
