import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';

export interface TokenPayload {
  sub: string;
  role: Role;
}

// Global AppError configuration helper
class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

// 1. Authentication Middleware - verifies the incoming JWT token
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('Access token is missing or malformed', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AuthError('Access token is missing', 401);
    }

    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (err) {
        const message = err.name === 'TokenExpiredError' ? 'Access token has expired' : 'Access token is invalid';
        return next(new AuthError(message, 401));
      }

      const payload = decoded as TokenPayload;
      
      if (!payload || !payload.sub || !payload.role) {
        return next(new AuthError('Access token payload is corrupt', 401));
      }

      // Attach user credentials to standard request object
      req.user = {
        id: payload.sub,
        role: payload.role,
      };

      next();
    });
  } catch (error) {
    next(error);
  }
};

// 2. Authorization Middleware - checks permissions using role parameters
export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthError('User identity unauthenticated', 401);
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AuthError('Insufficient permissions to access this endpoint', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
