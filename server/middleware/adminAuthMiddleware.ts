/**
 * Middleware для проверки прав доступа администратора
 * 
 * Проверяет, имеет ли текущий пользователь права администратора.
 * В простейшей реализации проверяет, является ли пользователь
 * пользователем с ID=1 (суперадминистратор).
 * 
 * В более сложной реализации может проверять роли пользователя
 * из базы данных или другого источника.
 */

import { Request, Response, NextFunction } from 'express';

// Интерфейс для типизации расширенного объекта запроса с пользователем
interface RequestWithUser extends Request {
  user?: {
    id: number;
    [key: string]: any;
  };
}

/**
 * Middleware для проверки прав администратора
 * В текущей реализации считаем администратором пользователя с ID=1
 */
export function adminAuthMiddleware(req: RequestWithUser, res: Response, next: NextFunction) {
  // Проверка аутентификации: пользователь должен быть авторизован
  if (!req.user) {
    console.log('[AdminAuth] Доступ запрещен: пользователь не авторизован');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Для доступа к этому ресурсу требуется авторизация'
    });
  }
  
  // ID администратора (в продакшне лучше хранить в базе или переменных окружения)
  const adminUserId = 1;
  
  // Проверка прав: пользователь должен быть администратором
  if (req.user.id !== adminUserId) {
    console.log(`[AdminAuth] Доступ запрещен: пользователь #${req.user.id} не является администратором`);
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Недостаточно прав для доступа к этому ресурсу'
    });
  }
  
  // Если все проверки пройдены, пропускаем запрос дальше
  console.log(`[AdminAuth] Доступ разрешен: пользователь #${req.user.id} аутентифицирован как администратор`);
  next();
}