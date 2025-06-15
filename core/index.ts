// Экспорт основных компонентов системного ядра
// REMOVED: deprecated db export - using Supabase API only
export { logger } from './logger';
export { config } from './config';
export { BaseController } from './BaseController';
export { EnvValidator } from './envValidator';

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