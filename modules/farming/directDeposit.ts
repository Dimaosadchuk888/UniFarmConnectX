/**
 * КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Прямой депозит минуя BaseController
 * Цель: Обойти проблему с BaseController.handleRequest который блокирует выполнение
 */

import { Request, Response } from 'express';
import { farmingService } from './service';
import { logger } from '../../core/logger';

export async function directDepositHandler(req: Request, res: Response) {
  try {
    console.log('\n\n=== DIRECT DEPOSIT HANDLER CALLED ===');
    console.log('Body:', JSON.stringify(req.body));
    console.log('User from JWT:', req.user);
    console.log('Timestamp:', new Date().toISOString());
    
    console.log('[DirectDeposit] CRITICAL: Прямой вызов депозита');
    logger.info('[DirectDeposit] Прямой вызов депозита', {
      body: req.body,
      headers: req.headers,
      user: req.user,
      telegramUser: req.telegramUser
    });

    // Получаем user_id из тела запроса (frontend отправляет его там)
    const { amount, user_id } = req.body;
    
    // Проверяем авторизацию через JWT
    const jwtUserId = req.user?.id;
    
    if (!jwtUserId) {
      console.log('[DirectDeposit] CRITICAL: Отсутствует JWT авторизация');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Используем user_id из тела запроса или из JWT
    const userId = user_id || jwtUserId;

    if (!amount) {
      console.log('[DirectDeposit] CRITICAL: Отсутствует amount в body');
      return res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
    }

    console.log('[DirectDeposit] CRITICAL: Вызов farmingService.depositUniForFarming', {
      userId,
      amount,
      requestBodyUserId: user_id,
      jwtUserId
    });

    // Передаем userId напрямую в farmingService
    const result = await farmingService.depositUniForFarming(
      userId.toString(),
      amount
    );

    console.log('[DirectDeposit] CRITICAL: Результат depositUniForFarming', result);

    // Проверяем результат от farmingService
    if (result && result.success === false) {
      console.log('[DirectDeposit] CRITICAL: farmingService вернул ошибку', result);
      return res.status(400).json({
        success: false,
        error: result.message || 'Ошибка обновления данных',
        data: result
      });
    }

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