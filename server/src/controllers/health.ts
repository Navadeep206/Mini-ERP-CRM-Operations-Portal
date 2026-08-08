import { Request, Response, NextFunction } from 'express';

export const checkHealth = (_req: Request, res: Response, next: NextFunction): void => {
  try {
    res.status(200).json({
      success: true,
      app: 'Mini ERP & CRM Operations Portal API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
