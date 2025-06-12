import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Middleware для проверки прав администратора
 * Должен использоваться после requireTelegramAuth
 */
export async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const telegramUser = (req as any).telegram?.user;
    
    if (!telegramUser) {
      return res.status(401).json({
        success: false,
        error: 'Требуется авторизация'
      });
    }

    // Проверяем статус администратора в базе данных
    const [user] = await db
      .select({ is_admin: users.is_admin })
      .from(users)
      .where(eq(users.telegram_id, telegramUser.telegram_id.toString()))
      .limit(1);

    if (!user || !user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Недостаточно прав доступа'
      });
    }

    next();
  } catch (error) {
    console.error('[AdminAuth] Ошибка проверки прав:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
}