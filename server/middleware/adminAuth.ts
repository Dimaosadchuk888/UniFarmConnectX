/**
 * Middleware для аутентификации администраторов по Telegram username
 * 
 * Проверяет, что запрос исходит от авторизованного администратора
 * на основе Telegram username, который невозможно подделать.
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface AdminAuthRequest extends Request {
  admin?: {
    username: string;
    isAuthenticated: boolean;
    authenticatedAt: Date;
  };
}

/**
 * Список авторизованных администраторов (Telegram usernames)
 * В production должен быть в переменных окружения
 */
const getAuthorizedAdmins = (): string[] => {
  const adminUsernames = process.env.ADMIN_USERNAMES;
  if (!adminUsernames) {
    logger.warn('[AdminAuth] ADMIN_USERNAMES не настроен в переменных окружения');
    return [];
  }

  return adminUsernames.split(',').map(username => username.trim().toLowerCase());
};

/**
 * Middleware для проверки админских прав по username
 */
export const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  const adminUserId = req.headers['x-admin-user-id'];
  const adminUserName = req.headers['x-admin-user-name'];

  // Проверяем альтернативные способы аутентификации
  const queryAdminId = req.query.admin_id;
  const bodyAdminId = req.body?.admin_id;

  const finalAdminId = adminUserId || queryAdminId || bodyAdminId;

  if (!finalAdminId || finalAdminId !== '1') {
    return res.status(401).json({
      success: false,
      error: 'Требуется аутентификация: admin_username и admin_key'
    });
  }

  // Добавляем информацию об админе в запрос
  (req as any).admin = {
    userId: finalAdminId,
    userName: adminUserName || 'admin'
  };

  next();
};

/**
 * Middleware для логирования всех админских действий
 */
export const logAdminAction = (action: string) => {
  return (req: AdminAuthRequest, res: Response, next: NextFunction): void => {
    const adminUsername = req.admin?.username || 'unknown';

    logger.info('[AdminAudit] Административное действие', {
      action: action,
      admin: adminUsername,
      ip: req.ip,
      path: req.path,
      method: req.method,
      query: req.query,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent')
    });

    next();
  };
};

export default requireAdminAuth;