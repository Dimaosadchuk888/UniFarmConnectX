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

// Расширяем интерфейс Request для поддержки пользовательских данных
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
  try {
    // Проверяем, авторизован ли пользователь
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Необходима авторизация'
      });
    }
    
    // Получаем ID пользователя
    const userId = req.user.id;
    
    // Проверяем, является ли пользователь администратором
    // В простой реализации администратором считаем пользователя с ID=1
    // В реальном приложении здесь должна быть проверка роли в базе данных
    const isAdmin = userId === 1;
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Недостаточно прав для выполнения операции'
      });
    }
    
    // Если пользователь администратор, продолжаем выполнение запроса
    next();
  } catch (error: any) {
    console.error('Ошибка в adminAuthMiddleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Внутренняя ошибка сервера'
    });
  }
}