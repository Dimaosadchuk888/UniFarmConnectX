import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services/walletService';
import { sendSuccess } from '../utils/responseUtils';
import { ValidationError } from '../middleware/errorHandler';
import { userIdSchema } from '../validators/schemas';
import { formatZodErrors } from '../utils/validationUtils';
import { wrapServiceFunction } from '../db-service-wrapper';

/**
 * Контроллер для работы с кошельком пользователя с поддержкой fallback режима
 */
export class WalletControllerFallback {
  /**
   * Получает баланс кошелька пользователя
   * @route GET /api/wallet/balance
   */
  static async getWalletBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = userIdSchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      // Заворачиваем вызов сервиса в обработчик ошибок
      const getWalletBalanceWithFallback = wrapServiceFunction(
        WalletService.getBalance.bind(WalletService),
        async (error, userId) => {
          console.log(`[WalletControllerFallback] Возвращаем заглушку для баланса по ID: ${userId}`, error);
          
          // Возвращаем данные по умолчанию при отсутствии соединения с БД
          return {
            uni_balance: "0",
            ton_balance: "0",
            total_earned_uni: "0",
            total_earned_ton: "0",
            total_withdrawn_uni: "0",
            total_withdrawn_ton: "0",
            is_fallback: true
          };
        }
      );
      
      const balance = await getWalletBalanceWithFallback(user_id);
      sendSuccess(res, balance);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получает историю транзакций пользователя
   * @route GET /api/wallet/history
   */
  static async getTransactionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = userIdSchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      // Заворачиваем вызов сервиса в обработчик ошибок
      const getTransactionHistoryWithFallback = wrapServiceFunction(
        WalletService.getTransactionHistory.bind(WalletService),
        async (error, userId) => {
          console.log(`[WalletControllerFallback] Возвращаем заглушку для истории транзакций по ID: ${userId}`, error);
          
          // Возвращаем пустой массив при отсутствии соединения с БД
          return {
            transactions: [],
            has_more: false,
            total_count: 0,
            is_fallback: true
          };
        }
      );
      
      const history = await getTransactionHistoryWithFallback(user_id);
      sendSuccess(res, history);
    } catch (error) {
      next(error);
    }
  }
}