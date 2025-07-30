/**
 * Direct Balance Handler - временный диагностический обработчик
 * для проверки проблемы с балансом 0.01 TON
 */

import { Request, Response } from 'express';
import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';

export async function directBalanceCheck(req: Request, res: Response) {
  try {
    const telegram = (req as any).telegram;
    const telegramUser = (req as any).telegramUser;
    const user = (req as any).user;
    
    // Логируем все доступные данные пользователя из middleware
    logger.error('[DIRECT_BALANCE_CHECK] Данные из middleware', {
      telegram: telegram ? JSON.stringify(telegram) : 'null',
      telegramUser: telegramUser ? JSON.stringify(telegramUser) : 'null',
      user: user ? JSON.stringify(user) : 'null',
      headers: req.headers
    });
    
    // Определяем ID пользователя
    const userId = telegram?.user?.id || telegramUser?.id || user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID not found in request',
        availableData: {
          hasTelegram: !!telegram,
          hasTelegramUser: !!telegramUser,
          hasUser: !!user
        }
      });
    }
    
    // Получаем данные из БД напрямую
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error || !dbUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found in database',
        userId,
        dbError: error?.message
      });
    }
    
    // Парсим баланс точно так же как в processWithdrawal
    const currentBalance = parseFloat(dbUser.balance_ton || "0");
    
    // Возвращаем полную диагностическую информацию
    return res.json({
      success: true,
      diagnostic: {
        middlewareUser: {
          id: userId,
          telegram_id: telegram?.user?.telegram_id || telegramUser?.telegram_id,
          balance_from_middleware: telegram?.user?.balance_ton || telegramUser?.balance_ton || user?.balance_ton
        },
        databaseUser: {
          id: dbUser.id,
          telegram_id: dbUser.telegram_id,
          username: dbUser.username,
          balance_ton_raw: dbUser.balance_ton,
          balance_ton_type: typeof dbUser.balance_ton,
          balance_ton_parsed: currentBalance
        },
        validation: {
          canWithdraw1TON: currentBalance >= 1,
          availableForWithdrawal: currentBalance
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('[DIRECT_BALANCE_CHECK] Ошибка', { error });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}