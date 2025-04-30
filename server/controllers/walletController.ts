import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import 'express-session';
import { WalletService, WalletCurrency, TransactionStatusType } from '../services/walletService';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { createValidationErrorFromZod, extractUserId } from '../utils/validationUtils';

// Типизация для доступа к свойствам сессии
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    user?: {
      id: number;
      username: string;
      ref_code?: string;
      guest_id?: string;
    };
  }
}

/**
 * Контроллер для работы с TON-кошельками пользователей
 * Делегирует всю бизнес-логику WalletService
 */
export class WalletController {
  // Создаем одиночный экземпляр WalletService
  private static _walletServiceInstance: WalletService | null = null;
  
  // Геттер для доступа к сервису из статического метода
  private static get walletService(): WalletService {
    if (!WalletController._walletServiceInstance) {
      WalletController._walletServiceInstance = new WalletService();
    }
    return WalletController._walletServiceInstance;
  }
  
  /**
   * Привязывает TON-адрес кошелька к пользователю
   */
  static async linkWalletAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация входных данных с помощью Zod
      const schema = z.object({
        wallet_address: z.string().min(1, "Адрес кошелька не может быть пустым"),
        user_id: z.number().positive("ID пользователя должен быть положительным числом").optional()
      });

      const validation = schema.safeParse(req.body);
      
      if (!validation.success) {
        throw createValidationErrorFromZod('Некорректные параметры запроса', validation.error);
      }
      
      const { wallet_address } = validation.data;
      
      // Получение user_id из различных источников в запросе
      const userId = extractUserId(req) || validation.data.user_id;
      
      if (!userId) {
        throw new ValidationError('Отсутствует идентификатор пользователя');
      }
      
      console.log(`[WalletController] Привязка адреса ${wallet_address} к пользователю ${userId}`);
      
      // Делегируем всю логику валидации и обновления адреса кошелька WalletService
      const updatedWallet = await this.walletService.updateWalletAddress(userId, wallet_address);
      
      // Для аудита логируем результат
      console.log(`[WalletController] Успешно обновлен адрес кошелька для пользователя ${userId}`);
      console.log(`[WalletController] Новое значение в БД: ${updatedWallet.walletAddress}`);
      
      // Возвращаем успешный ответ через responseFormatter
      res.success({
        user_id: updatedWallet.userId,
        wallet_address: updatedWallet.walletAddress,
        message: 'Адрес кошелька успешно привязан к аккаунту'
      });
    } catch (error) {
      console.error('[WalletController] Ошибка при привязке адреса кошелька:', error);
      next(error); // Передаем ошибку централизованному обработчику
    }
  }
  
  /**
   * Получает адрес кошелька пользователя
   */
  static async getUserWalletAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров запроса
      const schema = z.object({
        user_id: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val) && val > 0, {
          message: "ID пользователя должен быть положительным числом"
        }).optional()
      });
      
      const validation = schema.safeParse(req.query);
      
      if (!validation.success) {
        throw createValidationErrorFromZod('Некорректные параметры запроса', validation.error);
      }
      
      // Получение userId из различных источников
      const userId = extractUserId(req);
      
      if (!userId) {
        throw new ValidationError('Отсутствует идентификатор пользователя');
      }
      
      console.log(`[WalletController] Получение адреса кошелька для пользователя ${userId}`);
      
      // Делегируем получение адреса кошелька WalletService
      const walletData = await this.walletService.getWalletAddress(userId);
      
      // Возвращаем успешный ответ через responseFormatter
      res.success({
        user_id: walletData.userId,
        wallet_address: walletData.walletAddress
      });
    } catch (error) {
      console.error('[WalletController] Ошибка при получении адреса кошелька:', error);
      next(error); // Передаем ошибку централизованному обработчику
    }
  }
  
  /**
   * Получает полную информацию о кошельке пользователя
   */
  static async getWalletInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Получение userId из различных источников с более подробной диагностикой
      console.log(`[WalletController] Запрос информации о кошельке | URL: ${req.url}`);
      console.log(`[WalletController] Query params:`, req.query);
      console.log(`[WalletController] Body:`, req.body);
      
      let userId: number | undefined;
      
      // Явная проверка query параметра
      if (req.query && req.query.userId) {
        userId = parseInt(req.query.userId as string);
        console.log(`[WalletController] Найден userId в query: ${userId}`);
      } else if (req.query && req.query.user_id) {
        userId = parseInt(req.query.user_id as string);
        console.log(`[WalletController] Найден user_id в query: ${userId}`);
      }
      
      // Проверка body параметра
      if (!userId && req.body) {
        if (req.body.userId) {
          userId = parseInt(req.body.userId);
          console.log(`[WalletController] Найден userId в body: ${userId}`);
        } else if (req.body.user_id) {
          userId = parseInt(req.body.user_id);
          console.log(`[WalletController] Найден user_id в body: ${userId}`);
        }
      }
      
      // Проверка сессии
      if (!userId && req.session && req.session.userId) {
        userId = req.session.userId;
        console.log(`[WalletController] Найден userId в сессии: ${userId}`);
      }
      
      if (!userId || isNaN(userId)) {
        // Для отладки, пытаемся использовать стандартную функцию
        const extractedUserId = extractUserId(req);
        console.log(`[WalletController] extractUserId вернул: ${extractedUserId}`);
        
        throw new ValidationError('Отсутствует идентификатор пользователя');
      }
      
      console.log(`[WalletController] Получение информации о кошельке для пользователя ${userId}`);
      
      // Получаем полную информацию о кошельке
      const walletInfo = await this.walletService.getWalletInfo(userId);
      
      // Возвращаем успешный ответ через responseFormatter
      res.success({
        user_id: walletInfo.userId,
        balance_uni: walletInfo.balanceUni,
        balance_ton: walletInfo.balanceTon,
        wallet_address: walletInfo.walletAddress
      });
    } catch (error) {
      console.error('[WalletController] Ошибка при получении информации о кошельке:', error);
      next(error); // Передаем ошибку централизованному обработчику
    }
  }
  
  /**
   * Получает историю транзакций пользователя с поддержкой фильтрации и пагинации
   */
  static async getUserTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Диагностика для отладки
      console.log(`[WalletController] Запрос истории транзакций | URL: ${req.url}`);
      console.log(`[WalletController] Query params:`, req.query);
      console.log(`[WalletController] Body:`, req.body);
      
      // Валидация параметров запроса
      const schema = z.object({
        user_id: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val) && val > 0, {
          message: "ID пользователя должен быть положительным числом"
        }).optional(),
        userId: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val) && val > 0, {
          message: "ID пользователя должен быть положительным числом"
        }).optional(),
        limit: z.string().transform(val => parseInt(val)).optional(),
        offset: z.string().transform(val => parseInt(val)).optional(),
        currency: z.enum(['UNI', 'TON']).optional(),
        status: z.enum(['pending', 'confirmed', 'rejected']).optional()
      });
      
      const validation = schema.safeParse(req.query);
      
      if (!validation.success) {
        throw createValidationErrorFromZod('Некорректные параметры запроса', validation.error);
      }
      
      // Приоритетное использование userId/user_id из query параметров
      let userId = validation.data.user_id || validation.data.userId;
      
      // Если не найдено в query параметрах, проверяем тело запроса для POST запросов
      if (!userId && req.body) {
        if (req.body.user_id) {
          userId = parseInt(req.body.user_id);
        } else if (req.body.userId) {
          userId = parseInt(req.body.userId);
        }
      }
      
      // Если всё ещё не найдено, проверяем сессию
      if (!userId && req.session && req.session.userId) {
        userId = req.session.userId;
      }
      
      // Наконец, пробуем использовать общую функцию extractUserId, если никакие другие способы не сработали
      if (!userId) {
        userId = extractUserId(req);
      }
      
      if (!userId) {
        throw new ValidationError('Отсутствует идентификатор пользователя');
      }
      
      console.log(`[WalletController] Получение транзакций для пользователя ${userId}`);
      
      // Преобразуем параметры запроса в формат, понятный WalletService
      const { limit, offset, currency, status } = validation.data;
      
      // Получаем транзакции через WalletService
      const result = await this.walletService.getUserTransactions({
        userId,
        limit,
        offset,
        currency: currency as WalletCurrency,
        status: status as TransactionStatusType
      });
      
      // Преобразуем ответ в понятный клиенту формат (camelCase -> snake_case)
      const formattedTransactions = result.transactions.map(tx => ({
        id: tx.id,
        user_id: tx.userId,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        created_at: tx.createdAt,
        status: tx.status,
        wallet_address: tx.walletAddress,
        source: tx.source,
        category: tx.category,
        tx_hash: tx.txHash
      }));
      
      // Возвращаем успешный ответ через responseFormatter
      res.success({
        total: result.total,
        transactions: formattedTransactions
      });
    } catch (error) {
      console.error('[WalletController] Ошибка при получении транзакций:', error);
      next(error); // Передаем ошибку централизованному обработчику
    }
  }
  
  /**
   * Отправляет запрос на вывод средств
   */
  static async withdrawFunds(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Диагностика для отладки
      console.log(`[WalletController] Запрос на вывод средств | URL: ${req.url}`);
      console.log(`[WalletController] Query params:`, req.query);
      console.log(`[WalletController] Body:`, req.body);
      
      // Валидация входных данных с помощью Zod
      const schema = z.object({
        amount: z.union([
          z.string().min(1, "Сумма должна быть указана"),
          z.number().positive("Сумма должна быть положительным числом")
        ]),
        currency: z.enum(['UNI', 'TON'], {
          errorMap: () => ({ message: "Валюта должна быть UNI или TON" })
        }),
        wallet_address: z.string().optional(),
        userId: z.number().positive("ID пользователя должен быть положительным числом").optional(),
        user_id: z.number().positive("ID пользователя должен быть положительным числом").optional()
      });

      const validation = schema.safeParse(req.body);
      
      if (!validation.success) {
        throw createValidationErrorFromZod('Некорректные параметры запроса', validation.error);
      }
      
      const { amount, currency, wallet_address } = validation.data;
      
      // Приоритетное использование userId/user_id из тела запроса
      let userId = validation.data.user_id || validation.data.userId;
      
      // Если не найдено в теле, проверяем query параметры
      if (!userId && req.query) {
        if (req.query.user_id) {
          userId = parseInt(req.query.user_id as string);
          console.log(`[WalletController] Найден user_id в query: ${userId}`);
        } else if (req.query.userId) {
          userId = parseInt(req.query.userId as string);
          console.log(`[WalletController] Найден userId в query: ${userId}`);
        }
      }
      
      // Если всё ещё не найдено, проверяем сессию
      if (!userId && req.session && req.session.userId) {
        userId = req.session.userId;
        console.log(`[WalletController] Найден userId в сессии: ${userId}`);
      }
      
      // Наконец, пробуем использовать общую функцию extractUserId, если никакие другие способы не сработали
      if (!userId) {
        userId = extractUserId(req);
        console.log(`[WalletController] extractUserId вернул: ${userId}`);
      }
      
      if (!userId) {
        throw new ValidationError('Отсутствует идентификатор пользователя');
      }
      
      console.log(`[WalletController] Запрос на вывод ${amount} ${currency} для пользователя ${userId}`);
      
      // Делегируем операцию вывода средств WalletService
      const result = await this.walletService.withdrawFunds({
        userId,
        amount,
        currency: currency as WalletCurrency,
        walletAddress: wallet_address
      });
      
      // Возвращаем успешный ответ через responseFormatter
      res.success({
        transaction_id: result.transactionId,
        new_balance: result.newBalance,
        user_id: result.userId,
        message: result.message || `Вывод ${amount} ${currency} успешно инициирован`,
        wallet_address: result.walletAddress
      });
    } catch (error) {
      console.error('[WalletController] Ошибка при выводе средств:', error);
      next(error); // Передаем ошибку централизованному обработчику
    }
  }
}