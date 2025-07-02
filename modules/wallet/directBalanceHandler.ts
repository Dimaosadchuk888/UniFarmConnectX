import { Request, Response } from 'express';
import { SupabaseUserRepository } from '../user/service';
import { logger } from '../../core/logger';

const userRepository = new SupabaseUserRepository();

/**
 * Обработчик для получения баланса пользователя без авторизации
 * Принимает user_id через query параметр
 */
export const getDirectBalance = async (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id as string;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Отсутствует параметр user_id'
      });
    }

    // Получаем данные пользователя напрямую из базы
    const user = await userRepository.getUserById(parseInt(userId));
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    const balanceData = {
      uniBalance: parseFloat(user.balance_uni?.toString() || "0"),
      tonBalance: parseFloat(user.balance_ton?.toString() || "0"),
      uniFarmingActive: user.uni_farming_active || false,
      uniDepositAmount: parseFloat(user.uni_deposit_amount?.toString() || "0"),
      uniFarmingBalance: parseFloat(user.uni_farming_balance?.toString() || "0")
    };

    logger.info('[Wallet] Баланс пользователя получен', {
      user_id: userId,
      uniBalance: balanceData.uniBalance,
      tonBalance: balanceData.tonBalance
    });

    return res.status(200).json({
      success: true,
      data: balanceData
    });
  } catch (error) {
    logger.error('[Wallet] Ошибка получения баланса', { error });
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
};