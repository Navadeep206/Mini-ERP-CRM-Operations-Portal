import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export const checkHealth = (_req: Request, res: Response, next: NextFunction): void => {
  try {
    res.status(200).json({
      status: 'success',
      app: 'Mini ERP & CRM Operations Portal API',
      timestamp: new Date().toISOString(),
      env: config.env,
      uptime: process.uptime(),
    });
  } catch (error) {
    next(error);
  }
};
