import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase';
import { logger } from '../logger';

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

    // Проверяем статус администратора в базе данных через Supabase API
    const { data: user, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('telegram_id', telegramUser.telegram_id.toString())
      .single();

    if (error) {
      logger.error('[AdminAuth] Ошибка запроса к базе данных', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Ошибка проверки прав доступа'
      });
    }

    if (!user || !user.is_admin) {
      logger.warn('[AdminAuth] Попытка доступа без прав администратора', { 
        telegram_id: telegramUser.telegram_id 
      });
      return res.status(403).json({
        success: false,
        error: 'Недостаточно прав доступа'
      });
    }

    logger.info('[AdminAuth] Доступ администратора подтвержден', { 
      telegram_id: telegramUser.telegram_id 
    });
    next();
  } catch (error) {
    logger.error('[AdminAuth] Ошибка проверки прав:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
}