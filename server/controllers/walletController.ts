import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import 'express-session';
import { walletService, validationService } from '../services';
import { WalletCurrency, TransactionStatusType } from '../services/walletService';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { createValidationErrorFromZod, extractUserId, formatZodErrors } from '../utils/validationUtils';
import { wrapServiceFunction } from '../db-service-wrapper';
import { userIdSchema } from '../validators/schemas';
import { sendSuccess } from '../utils/responseUtils';

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
 * Поддерживает работу в fallback режиме при отсутствии соединения с БД
 */
export class WalletController {
  
  /**
   * Получает баланс кошелька пользователя
   * с поддержкой работы при отсутствии соединения с БД
   * @route GET /api/wallet/balance
   */
  static async getWalletBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Проверка заголовков разработки
      const isDevelopmentMode = process.env.NODE_ENV === 'development' || req.headers['x-development-mode'] === 'true';
      
      // Валидация параметров запроса
      let validationResult;
      let user_id;
      
      if (isDevelopmentMode && req.headers['x-development-user-id']) {
        // В режиме разработки можем использовать ID из заголовков
        user_id = Number(req.headers['x-development-user-id']);
        console.log(`[WalletController] Используем ID пользователя из заголовков разработки: ${user_id}`);
      } else {
        // Стандартная валидация для production
        validationResult = userIdSchema.safeParse(req.query);
        
        if (!validationResult.success) {
          throw new ValidationError('Ошибка валидации', formatZodErrors(validationResult.error));
        }
        
        user_id = validationResult.data.user_id;
      }
      
      // Заворачиваем вызов сервиса в обработчик ошибок
      const getWalletBalanceWithFallback = wrapServiceFunction(
        walletService.getUserBalance.bind(walletService),
        async (error, userId) => {
          console.log(`[WalletController] Возвращаем заглушку для баланса по ID: ${userId}`, error);
          
          // Возвращаем тестовые данные при отсутствии соединения с БД
          // Важно: Возвращаемые данные должны соответствовать интерфейсу IWalletService.getUserBalance
          
          // В режиме разработки возвращаем тестовые данные для наглядности
          const isDevelopmentMode = process.env.NODE_ENV === 'development';
          
          if (isDevelopmentMode) {
            console.log(`[WalletController] Возвращаем тестовые данные баланса для режима разработки`);
            return {
              balanceUni: "1000000",
              balanceTon: "25.5"
            };
          }
          
          // В production возвращаем нули
          return {
            balanceUni: "0",
            balanceTon: "0"
          };
        }
      );
      
      // Получаем баланс с обработкой ошибок
      const balance = await getWalletBalanceWithFallback(user_id);
      
      // Отправляем успешный ответ
      sendSuccess(res, balance);
    } catch (error) {
      // Передаем ошибку централизованному обработчику
      next(error);
    }
  }
  
  /**
   * Получает историю транзакций пользователя
   * с поддержкой работы при отсутствии соединения с БД
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
      
      // Заворачиваем вызов сервиса в обработчик ошибок
      const getTransactionHistoryWithFallback = wrapServiceFunction(
        walletService.getUserTransactions.bind(walletService),
        async (error, params) => {
          console.log(`[WalletController] Возвращаем заглушку для истории транзакций по ID: ${params.userId}`, error);
          
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
        current_offset: offset,
        current_limit: limit
      };
      
      // Отправляем успешный ответ
      sendSuccess(res, history);
    } catch (error) {
      // Передаем ошибку централизованному обработчику
      next(error);
    }
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
      
      try {
        // Делегируем всю логику валидации и обновления адреса кошелька WalletService
        const updatedWallet = await walletService.updateWalletAddress(userId, wallet_address);
        
        // Для аудита логируем результат
        console.log(`[WalletController] Успешно обновлен адрес кошелька для пользователя ${userId}`);
        console.log(`[WalletController] Новое значение в БД: ${updatedWallet.walletAddress}`);
        
        // Возвращаем успешный ответ через responseFormatter
        res.success({
          user_id: updatedWallet.userId,
          wallet_address: updatedWallet.walletAddress,
          message: 'Адрес кошелька успешно привязан к аккаунту'
        });
      } catch (dbError) {
        // Обработка ошибок подключения к БД
        console.log(`[WalletController] Fallback: Ошибка БД при привязке адреса ${wallet_address} к пользователю: ${userId}`);
        
        // Возвращаем информативный ответ об ошибке с флагом is_fallback
        res.success({
          success: false,
          message: 'База данных недоступна, привязка адреса кошелька временно невозможна',
          error: 'database_unavailable',
          is_fallback: true,
          user_id: userId,
          wallet_address: wallet_address
        });
      }
    } catch (error) {
      console.error('[WalletController] Ошибка при привязке адреса кошелька:', error);
      
      // В случае непредвиденной ошибки также добавляем флаг is_fallback
      if (error instanceof ValidationError) {
        // Для валидационных ошибок просто передаем их обработчику
        next(error);
      } else {
        // Для других ошибок возвращаем ответ с флагом is_fallback
        res.success({
          success: false,
          message: 'Произошла ошибка при привязке адреса кошелька',
          error: 'request_error',
          is_fallback: true
        });
      }
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
      
      try {
        // Делегируем получение адреса кошелька WalletService
        const walletData = await walletService.getWalletAddress(userId);
        
        // Возвращаем успешный ответ через responseFormatter
        res.success({
          user_id: walletData.userId,
          wallet_address: walletData.walletAddress
        });
      } catch (dbError) {
        // Обработка ошибок подключения к БД
        console.log(`[WalletController] Fallback: Ошибка БД при получении адреса кошелька пользователя: ${userId}`);
        
        // Возвращаем фиктивный адрес кошелька с флагом is_fallback
        // Обратите внимание: адрес не указывается, чтобы избежать случайных транзакций
        res.success({
          user_id: userId,
          wallet_address: null,
          message: 'База данных недоступна, невозможно получить адрес кошелька',
          is_fallback: true
        });
      }
    } catch (error) {
      console.error('[WalletController] Ошибка при получении адреса кошелька:', error);
      
      // В случае ошибки валидации просто передаем ошибку обработчику
      if (error instanceof ValidationError) {
        next(error);
      } else {
        // Для других ошибок возвращаем ответ с флагом is_fallback
        res.success({
          success: false,
          message: 'Произошла ошибка при получении адреса кошелька',
          error: 'request_error',
          is_fallback: true
        });
      }
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
      const walletInfo = await walletService.getWalletInfo(userId);
      
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
      const result = await walletService.getUserTransactions({
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
      
      // Валидация входных данных с помощью Zod для базовой проверки структуры
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
      
      // Используем idempotency key из заголовка, если он есть
      const idempotencyKey = req.headers['x-idempotency-key'] as string;
      
      // Используем centralized ValidationService для проверки операции с балансом
      const balanceOperationValidation = validationService.validateBalanceOperation({
        userId,
        amount,
        currency,
        operationType: 'withdraw',
        idempotencyKey,
        source: 'wallet',
        category: 'withdraw'
      });
      
      if (!balanceOperationValidation.success) {
        throw new ValidationError(
          balanceOperationValidation.error || 'Невалидные данные для вывода средств',
          { amount: String(amount), currency, userId: String(userId) }
        );
      }
      
      // Проверяем наличие дублирующих операций, если предоставлен ключ идемпотентности
      if (idempotencyKey && validationService.isOperationDuplicate(idempotencyKey)) {
        console.log(`[WalletController] Дублирующая операция вывода с ключом: ${idempotencyKey}`);
        
        // Если операция уже была выполнена, возвращаем сообщение о дубликате
        res.success({
          transaction_id: null,
          user_id: userId,
          message: `Вывод ${amount} ${currency} уже был инициирован ранее с тем же идентификатором`,
          duplicate: true
        });
        return;
      }
      
      // Проверяем и форматируем сумму с указанной точностью
      const validatedAmount = validationService.validateAndParseNumber(amount, {
        min: currency === 'UNI' ? 1000 : 0.1,  // Минимальная сумма вывода 1000 UNI или 0.1 TON
        max: currency === 'UNI' ? 1000000 : 1000,  // Максимальная сумма вывода 1,000,000 UNI или 1000 TON
        currency,
        precision: currency === 'UNI' ? 6 : 6  // Точность для UNI - 6 знаков, для TON - 6 знаков
      });
      
      try {
        // Делегируем операцию вывода средств WalletService с валидированной суммой
        const result = await walletService.withdrawFunds({
          userId,
          amount: validatedAmount,
          currency: currency as WalletCurrency,
          walletAddress: wallet_address
        });
        
        // Если предоставлен ключ идемпотентности, регистрируем завершенную операцию
        if (idempotencyKey) {
          validationService.registerCompletedOperation(idempotencyKey, result);
        }
        
        // Возвращаем успешный ответ через responseFormatter
        res.success({
          transaction_id: result.transactionId,
          new_balance: result.newBalance,
          user_id: result.userId,
          message: result.message || `Вывод ${validatedAmount} ${currency} успешно инициирован`,
          wallet_address: result.walletAddress
        });
      } catch (dbError) {
        // Обработка ошибок подключения к БД
        console.log(`[WalletController] Fallback: Ошибка БД при выводе средств для пользователя: ${userId}`);
        
        // Возвращаем информативный ответ об ошибке с флагом is_fallback
        res.success({
          success: false,
          message: 'База данных недоступна, вывод средств временно невозможен',
          error: 'database_unavailable',
          is_fallback: true,
          user_id: userId,
          amount: validatedAmount,
          currency: currency,
          wallet_address: wallet_address
        });
      }
    } catch (error) {
      console.error('[WalletController] Ошибка при выводе средств:', error);
      
      // В случае непредвиденной ошибки также добавляем флаг is_fallback
      if (error instanceof ValidationError) {
        // Для валидационных ошибок просто передаем их обработчику
        next(error);
      } else {
        // Для других ошибок возвращаем ответ с флагом is_fallback
        res.success({
          success: false,
          message: 'Произошла ошибка при запросе вывода средств',
          error: 'request_error',
          is_fallback: true
        });
      }
    }
  }
}