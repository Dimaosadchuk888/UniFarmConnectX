import { Request, Response } from 'express';
import { ReferralService } from '../services/referralService';
import { UserService } from '../services/userService';
import { sendSuccess, sendSuccessArray, sendError, sendServerError } from '../utils/responseUtils';
import { extractUserId } from '../utils/validationUtils';

/**
 * Контроллер для работы с реферальной системой
 */
export class ReferralController {
  /**
   * Обрабатывает запрос на регистрацию параметра start
   * Этот параметр получается из Telegram WebApp.startParam и используется для
   * отслеживания реферальных приглашений
   */
  static async registerStartParam(req: Request, res: Response): Promise<void> {
    try {
      const startParam = req.body.startParam || req.headers['x-start-param'];
      const telegramUserId = req.headers['x-telegram-user-id'];
      
      // Подробное логирование для отладки
      console.log(`[ReferralController] [StartParam] Processing request:`, {
        startParam,
        telegramUserId,
        hasBody: !!req.body,
        headers: Object.keys(req.headers)
      });
      
      if (!startParam) {
        console.warn('[ReferralController] [StartParam] No startParam provided');
        return sendError(res, 'Отсутствует параметр start', 400);
      }
      
      // Проверяем формат параметра (должен начинаться с "ref_" + ref_code)
      const refPattern = /^ref_([a-zA-Z0-9]+)$/;
      const match = String(startParam).match(refPattern);
      
      if (!match) {
        console.warn(`[ReferralController] [StartParam] Invalid startParam format: ${startParam}`);
        return sendError(res, 'Неверный формат параметра start', 400);
      }
      
      const refCode = match[1];
      console.log(`[ReferralController] [StartParam] Successfully parsed refCode: ${refCode}`);
      
      // Ищем пользователя с таким ref_code
      const inviterUser = await UserService.getUserByRefCode(refCode);
      
      if (!inviterUser) {
        console.warn(`[ReferralController] [StartParam] No user found with ref_code: ${refCode}`);
        return sendError(res, 'Пригласитель не найден', 404);
      }
      
      const inviterId = inviterUser.id;
      console.log(`[ReferralController] [StartParam] Found inviter by ref_code: ${refCode}, userId: ${inviterId}`);
      console.log(`[ReferralController] [StartParam] Inviter found: ${inviterUser.username} (ID: ${inviterUser.id})`);
      
      // В будущем здесь будет логика для регистрации реферала,
      // когда пользователь авторизуется по Telegram
      
      // Возвращаем успешный результат
      sendSuccess(res, {
        message: 'Параметр start успешно зарегистрирован',
        inviterId: inviterUser.id,
        inviterUsername: inviterUser.username
      });
    } catch (error) {
      console.error('[ReferralController] [StartParam] Error processing startParam:', error);
      sendServerError(res, 'Ошибка обработки параметра start');
    }
  }
  /**
   * Получает данные по партнерке для пользователя
   * Обновлено: гарантирует возврат валидных данных даже при отсутствии рефералов
   * и обеспечивает строгую валидацию входных параметров
   */
  static async getUserReferrals(req: Request, res: Response): Promise<void> {
    try {
      // Валидация userId с использованием безопасной обертки
      const userIdRaw = extractUserId(req, 'query');
      
      // Проверяем, что userId - это положительное целое число
      if (!userIdRaw || isNaN(userIdRaw) || userIdRaw <= 0) {
        console.log('[ReferralController] Некорректный userId в запросе:', userIdRaw);
        return sendError(res, 'Некорректный идентификатор пользователя', 400);
      }
      
      const userId = Number(userIdRaw);
      console.log(`[ReferralController] Запрос данных для пользователя: ${userId}`);

      try {
        // Проверка существования пользователя
        const user = await UserService.getUserById(userId);
        if (!user) {
          console.log(`[ReferralController] Пользователь с ID ${userId} не найден`);
          return sendError(res, 'Пользователь не найден', 404);
        }

        // Получаем список приглашенных пользователей
        let referrals;
        try {
          referrals = await ReferralService.getUserReferrals(userId);
          console.log(`[ReferralController] Получено ${referrals?.length || 0} рефералов для пользователя ${userId}`);
        } catch (referralsError) {
          console.error('[ReferralController] Ошибка при получении списка рефералов:', referralsError);
          referrals = []; // Fallback к пустому массиву при ошибке
        }
        
        // Получаем статистику по уровням рефералов
        let referralCounts = {};
        try {
          referralCounts = await ReferralService.getReferralCounts(userId);
        } catch (countsError) {
          console.error('[ReferralController] Ошибка при получении статистики рефералов:', countsError);
        }
        
        // Получаем данные по доходам с каждого уровня рефералов
        let levelIncome = {};
        try {
          levelIncome = await ReferralController.getLevelIncomeData(userId);
        } catch (incomeError) {
          console.error('[ReferralController] Ошибка при получении данных о доходах:', incomeError);
        }
        
        // Формируем ответ, гарантируя, что все поля определены
        const response = {
          user_id: userId,
          username: user.username || "",
          ref_code: user.ref_code || "",
          total_referrals: referrals ? referrals.length : 0,
          referral_counts: referralCounts || {},
          level_income: levelIncome || {},
          referrals: referrals || [] // Гарантируем, что всегда есть массив
        };
        
        // Добавляем дополнительную проверку целостности данных перед отправкой
        // Проверяем, что все числовые поля действительно числа
        if (typeof response.total_referrals !== 'number') {
          response.total_referrals = 0;
        }
        
        // Проверяем, что все массивы действительно массивы
        if (!Array.isArray(response.referrals)) {
          response.referrals = [];
        }
        
        // Проверяем, что все объекты действительно объекты
        if (typeof response.referral_counts !== 'object' || response.referral_counts === null) {
          response.referral_counts = {};
        }
        
        if (typeof response.level_income !== 'object' || response.level_income === null) {
          response.level_income = {};
        }

        // Отправляем успешный ответ
        sendSuccess(res, response);
      } catch (innerError) {
        console.error('[ReferralController] Внутренняя ошибка при обработке запроса:', innerError);
        // При ошибке сообщаем о ней клиенту, а не сохраняем "тихое поведение"
        sendServerError(res, 'Ошибка при обработке запроса реферальных данных');
      }
    } catch (error) {
      console.error('[ReferralController] Критическая ошибка:', error);
      // Возвращаем ошибку сервера, а не скрываем ее за успешным ответом
      sendServerError(res, 'Критическая ошибка при обработке запроса реферальных данных');
    }
  }
  
  /**
   * Получает данные о доходах с каждого уровня рефералов
   * @param userId ID пользователя
   * @returns Объект с доходами по уровням (пустой объект, если данных нет)
   */
  private static async getLevelIncomeData(userId: number): Promise<Record<number, { uni: number, ton: number }>> {
    try {
      // Проверка валидности userId
      if (!userId || typeof userId !== 'number' || userId <= 0) {
        console.log('[ReferralController] Invalid userId in getLevelIncomeData:', userId);
        return {}; // Возвращаем пустой объект при некорректном userId
      }
      
      // Получаем транзакции с типом referral_bonus
      const db = (await import('../db')).db;
      const transactions = (await import('@shared/schema')).transactions;
      const { eq, and, sql } = await import('drizzle-orm');
      
      try {
        // Запрос для получения суммы доходов от рефералов по уровням
        // Проверяем наличие поля data перед использованием оператора ->
        const hasDataColumnResult = await db
          .execute(sql`SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'data'
          ) AS exists`);
        
        const hasDataColumn = hasDataColumnResult && 
                          hasDataColumnResult.length > 0 && 
                          hasDataColumnResult[0] && 
                          (hasDataColumnResult[0] as Record<string, unknown>).exists === true;
        
        if (hasDataColumn) {
          const referralTransactions = await db
            .select({
              level: sql<number>`CAST(data->>'level' AS INTEGER)`,
              uni_amount: sql<string>`SUM(CASE WHEN currency = 'UNI' THEN amount ELSE 0 END)`,
              ton_amount: sql<string>`SUM(CASE WHEN currency = 'TON' THEN amount ELSE 0 END)`
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.user_id, userId),
                eq(transactions.type, 'referral_bonus')
              )
            )
            .groupBy(sql`data->>'level'`);
          
          // Преобразуем результат в объект { level: { uni: amount, ton: amount } }
          const result: Record<number, { uni: number, ton: number }> = {};
          
          // Проверка, что результат не null и не undefined
          if (!referralTransactions) {
            console.log('[ReferralController] Пустой результат запроса транзакций');
            return {};
          }
          
          for (const row of referralTransactions) {
            if (row.level !== null) {
              // Безопасное преобразование строк в числа
              const uniAmount = parseFloat(row.uni_amount || '0');
              const tonAmount = parseFloat(row.ton_amount || '0');
              
              result[row.level] = {
                // Проверка на NaN для гарантии числовых значений
                uni: isNaN(uniAmount) ? 0 : uniAmount,
                ton: isNaN(tonAmount) ? 0 : tonAmount
              };
            }
          }
          
          return result;
        } else {
          console.log('[ReferralController] Поле data в таблице transactions отсутствует, возвращаем пустой результат');
          return {};
        }
      } catch (error: any) {
        // Расширенная обработка известных ошибок
        if (error.message) {
          // Если ошибка связана с отсутствием поля data, возвращаем пустой объект
          if (error.message.includes("column \"data\" does not exist")) {
            console.log('[ReferralController] Поле "data" не найдено в таблице transactions, возвращаем пустой результат');
            return {};
          }
          
          // Обрабатываем ошибку оператора
          if (error.message.includes("operator does not exist") || error.message.includes("->>")) {
            console.log('[ReferralController] Ошибка оператора при запросе данных о доходе:', error.message);
            return {};
          }
        }
        
        // Логируем детали ошибки для отладки
        console.error('[ReferralController] Ошибка при выполнении SQL-запроса:', {
          message: error.message,
          code: error.code,
          stack: error.stack?.slice(0, 200) // Первые 200 символов стека для краткости
        });
        
        // Всегда возвращаем пустой объект при любой ошибке
        return {};
      }
    } catch (error) {
      console.error('[ReferralController] Критическая ошибка при расчете дохода по уровням:', error);
      return {}; // Безопасный ответ при любой ошибке
    }
  }

  /**
   * Проверяет наличие пригласителя у пользователя
   */
  static async getUserInviter(req: Request, res: Response): Promise<void> {
    try {
      const userId = extractUserId(req, 'params');
      
      if (!userId) {
        sendError(res, 'Invalid user ID', 400);
        return;
      }

      const inviter = await ReferralService.getUserInviter(userId);
      
      if (!inviter) {
        sendError(res, 'User has no inviter', 404);
        return;
      }

      let inviterUser = null;
      if (inviter.inviter_id !== null && typeof inviter.inviter_id === 'number') {
        inviterUser = await UserService.getUserById(inviter.inviter_id);
      }
      
      const response = {
        user_id: userId,
        inviter_id: inviter.inviter_id,
        inviter_username: inviterUser?.username,
        level: inviter.level,
        created_at: inviter.created_at
      };

      sendSuccess(res, response);
    } catch (error) {
      console.error('Error fetching user inviter:', error);
      sendServerError(res, 'Failed to fetch user inviter');
    }
  }
}