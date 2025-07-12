import { Request, Response } from 'express';
import { SupabaseUserRepository } from '../user/service';
import { logger } from '../../core/logger';

const userRepository = new SupabaseUserRepository();

/**
 * Обработчик для получения баланса пользователя с обязательной авторизацией
 * Принимает user_id через query параметр или использует ID из JWT токена
 */
export const getDirectBalance = async (req: Request, res: Response) => {
  try {
    // Получаем ID авторизованного пользователя из JWT
    const authenticatedUserId = (req as any).user?.id;
    
    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        error: 'Требуется авторизация'
      });
    }
    
    // Получаем запрошенный user_id из параметров или используем ID из JWT
    const requestedUserId = req.query.user_id as string;
    const userId = requestedUserId || authenticatedUserId.toString();
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: пользователь может получать только свой баланс
    if (userId !== authenticatedUserId.toString()) {
      logger.warn('[Wallet] Попытка несанкционированного доступа к балансу', {
        authenticated_user_id: authenticatedUserId,
        requested_user_id: userId,
        ip: req.ip
      });
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещен. Вы можете просматривать только свой баланс'
      });
    }

    // Получаем данные пользователя из базы
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