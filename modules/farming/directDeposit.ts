/**
 * КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Прямой депозит минуя BaseController
 * Цель: Обойти проблему с BaseController.handleRequest который блокирует выполнение
 */

import { Request, Response } from 'express';
import { farmingService } from './service';
import { logger } from '../../core/logger.js';

export async function directDepositHandler(req: Request, res: Response) {
  try {
    console.log('[DirectDeposit] CRITICAL: Прямой вызов депозита');
    logger.info('[DirectDeposit] Прямой вызов депозита', {
      body: req.body,
      headers: req.headers,
      user: req.user,
      telegramUser: req.telegramUser
    });

    // Извлекаем user_id из JWT
    const userId = req.user?.id;
    const telegramId = req.telegramUser?.telegram_id;

    if (!userId || !telegramId) {
      console.log('[DirectDeposit] CRITICAL: Отсутствует авторизация', {
        userId,
        telegramId,
        user: req.user,
        telegramUser: req.telegramUser
      });
      
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        debug: {
          userId,
          telegramId,
          hasUser: !!req.user,
          hasTelegramUser: !!req.telegramUser
        }
      });
    }

    const { amount } = req.body;
    if (!amount) {
      console.log('[DirectDeposit] CRITICAL: Отсутствует amount в body');
      return res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
    }

    console.log('[DirectDeposit] CRITICAL: Вызов farmingService.depositUniForFarming', {
      telegramId,
      amount,
      userId
    });

    const result = await farmingService.depositUniForFarming(
      telegramId.toString(),
      amount
    );

    console.log('[DirectDeposit] CRITICAL: Результат depositUniForFarming', result);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[DirectDeposit] CRITICAL: Исключение в directDepositHandler', error);
    logger.error('[DirectDeposit] Исключение в directDepositHandler', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}