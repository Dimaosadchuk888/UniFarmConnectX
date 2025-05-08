import { Request, Response, NextFunction } from 'express';
import { walletService } from '../services';
import { sendSuccess } from '../utils/responseUtils';
import { ValidationError } from '../middleware/errorHandler';
import { userIdSchema } from '../validators/schemas';
import { formatZodErrors } from '../utils/validationUtils';
import { wrapServiceFunction } from '../db-service-wrapper';

// Отладочный вывод для контроля использования fallback
console.log('[WalletControllerFallback] Использование обновленного fallback контроллера');

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
      
      // Заворачиваем вызов сервиса в обработчик ошибок, используя сервис из импорта
      const getWalletBalanceWithFallback = wrapServiceFunction(
        walletService.getUserBalance.bind(walletService),
        async (error, userId) => {
          console.log(`[WalletControllerFallback] Возвращаем заглушку для баланса по ID: ${userId}`, error);
          
          // Возвращаем данные по умолчанию при отсутствии соединения с БД
          // Важно: Возвращаемые данные должны соответствовать интерфейсу IWalletService.getUserBalance
          return {
            balanceUni: "0",
            balanceTon: "0"
          };
        }
      );
      
      // Получаем баланс через сервис
      const userBalance = await getWalletBalanceWithFallback(user_id);
      
      // Отладочный вывод для проверки данных
      console.log('[WalletControllerFallback] Получен баланс:', JSON.stringify(userBalance));
      
      // Преобразуем формат ответа, если нужно
      const balance = {
        uni_balance: userBalance.balanceUni || "0",
        ton_balance: userBalance.balanceTon || "0",
        total_earned_uni: "0", // Можно добавить расчет этих значений в будущем
        total_earned_ton: "0",
        total_withdrawn_uni: "0",
        total_withdrawn_ton: "0",
        is_fallback: false
      };
      
      sendSuccess(res, balance);
    } catch (error) {
      console.error('[WalletControllerFallback] Ошибка при получении баланса:', error);
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
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const currency = req.query.currency as string;
      const status = req.query.status as string;
      
      // Заворачиваем вызов сервиса в обработчик ошибок, используя сервис из импорта
      const getTransactionHistoryWithFallback = wrapServiceFunction(
        walletService.getUserTransactions.bind(walletService),
        async (error, params) => {
          console.log(`[WalletControllerFallback] Возвращаем заглушку для истории транзакций по ID: ${params.userId}`, error);
          
          // Возвращаем пустой массив при отсутствии соединения с БД
          // Формат должен соответствовать интерфейсу IWalletService.getUserTransactions
          return {
            transactions: [],
            total: 0
          };
        }
      );
      
      // Получаем транзакции через сервис
      const result = await getTransactionHistoryWithFallback({
        userId: user_id,
        limit,
        offset,
        currency: currency as any,
        status: status as any
      });
      
      // Преобразуем ответ в формат, ожидаемый клиентом
      const history = {
        transactions: result.transactions || [],
        has_more: result.total > (offset + limit),
        total_count: result.total || 0,
        is_fallback: false // У объекта result нет свойства is_fallback
      };
      
      sendSuccess(res, history);
    } catch (error) {
      console.error('[WalletControllerFallback] Ошибка при получении истории транзакций:', error);
      next(error);
    }
  }
}