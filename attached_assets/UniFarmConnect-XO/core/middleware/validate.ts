import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { createAppError } from './errorHandler';

/**
 * Middleware для валидации тела запроса
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = createAppError(
          `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
          400
        );
        next(validationError);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Middleware для валидации параметров запроса
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = createAppError(
          `Parameter validation error: ${error.errors.map(e => e.message).join(', ')}`,
          400
        );
        next(validationError);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Middleware для валидации query параметров
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = createAppError(
          `Query validation error: ${error.errors.map(e => e.message).join(', ')}`,
          400
        );
        next(validationError);
      } else {
        next(error);
      }
    }
  };
}