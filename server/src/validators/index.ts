import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

// Middleware generator to validate incoming requests against a Zod schema
export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
};
