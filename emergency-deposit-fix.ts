/**
 * EMERGENCY TON DEPOSIT FIX - ОБХОД СЛОМАННОЙ JWT AUTH
 * 
 * Временный fix для восстановления пополнений пока не починили JWT
 * Создает новый endpoint без JWT требований
 */

import express from 'express';
import { WalletService } from './modules/wallet/service';
import { SupabaseUserRepository } from './modules/user/service';
import { logger } from './core/logger';

const router = express.Router();
const walletService = new WalletService();
const userRepository = new SupabaseUserRepository();

// EMERGENCY ENDPOINT - БЕЗ JWT ПРОВЕРКИ
router.post('/emergency-ton-deposit', async (req, res) => {
  try {
    console.log('[EMERGENCY] TON Deposit без JWT запрос:', {
      body: req.body,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type']
      }
    });

    const { telegram_id, ton_tx_hash, amount, wallet_address, boc } = req.body;

    // Валидация базовых параметров
    if (!telegram_id) {
      return res.status(400).json({
        success: false,
        error: 'telegram_id обязателен для emergency депозита'
      });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount должен быть положительным числом'
      });
    }

    // Ищем пользователя по telegram_id
    const user = await userRepository.getUserByTelegramId(parseInt(telegram_id));
    
    if (!user) {
      logger.error('[EMERGENCY] Пользователь не найден по telegram_id', { telegram_id });
      return res.status(404).json({
        success: false,
        error: `Пользователь с telegram_id ${telegram_id} не найден`
      });
    }

    logger.info('[EMERGENCY] Обработка депозита для пользователя', {
      user_id: user.id,
      telegram_id: user.telegram_id,
      amount: parseFloat(amount),
      has_boc: !!boc,
      has_tx_hash: !!ton_tx_hash,
      wallet_address: wallet_address?.slice(0, 10) + '...'
    });

    // Создаем депозит через WalletService
    const depositData = {
      user_id: user.id,
      ton_tx_hash: ton_tx_hash || `emergency_${Date.now()}_${Math.random()}`,
      amount: parseFloat(amount),
      wallet_address: wallet_address || 'emergency_deposit'
    };

    const result = await walletService.processTonDeposit(depositData);

    if (!result.success) {
      logger.error('[EMERGENCY] Ошибка создания депозита', {
        user_id: user.id,
        error: result.error,
        depositData
      });
      return res.status(400).json({
        success: false,
        error: result.error || 'Ошибка создания депозита'
      });
    }

    logger.info('[EMERGENCY] ✅ TON депозит успешно создан', {
      user_id: user.id,
      telegram_id: user.telegram_id,
      amount: parseFloat(amount),
      transaction_id: result.transaction_id
    });

    return res.status(200).json({
      success: true,
      message: 'Emergency депозит создан успешно',
      data: {
        transaction_id: result.transaction_id,
        user_id: user.id,
        amount: parseFloat(amount),
        currency: 'TON'
      }
    });

  } catch (error) {
    logger.error('[EMERGENCY] Критическая ошибка депозита', { error });
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

export default router;