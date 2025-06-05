// Экспорт основных компонентов системного ядра
export { db } from './db';
export { logger } from './logger';
export { config } from './config';

// Middleware
export { 
  authenticateTelegram, 
  authenticateJWT, 
  optionalAuth,
  type AuthenticatedRequest 
} from './middleware/auth';

export { 
  globalErrorHandler, 
  notFoundHandler, 
  asyncHandler,
  createAppError,
  type AppError 
} from './middleware/errorHandler';

export { 
  validateBody, 
  validateParams, 
  validateQuery 
} from './middleware/validate';

export {
  requireTelegramAuth,
  optionalTelegramAuth
} from './middleware/telegramAuth';