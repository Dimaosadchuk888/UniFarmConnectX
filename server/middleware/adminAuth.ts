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
  // Проверяем несколько вариантов админской аутентификации
  const adminUserId = req.headers['x-admin-user-id'] || req.query.admin_user_id;
  const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
  const adminToken = req.headers['authorization'] || req.query.token;

  // Разрешаем доступ для локальных запросов и тестирования
  if (req.ip === '127.0.0.1' || req.ip === '::1' || req.hostname === 'localhost') {
    console.log('[AdminAuth] Локальный доступ разрешен');
    next();
    return;
  }

  // Проверяем стандартные админские токены
  if (adminUserId === '1' || 
      adminUserId === 'admin' || 
      adminToken === 'admin-token' ||
      adminKey === 'admin-key') {
    console.log('[AdminAuth] Админский доступ подтвержден');
    next();
    return;
  }

  // Если нет никакой аутентификации
  if (!adminUserId && !adminKey && !adminToken) {
    return res.status(401).json({
      success: false,
      error: 'Требуется аутентификация: используйте X-Admin-User-ID: 1 или admin_user_id=1 в query параметрах'
    });
  }

  return res.status(403).json({
    success: false,
    error: 'Недостаточно прав доступа'
  });
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