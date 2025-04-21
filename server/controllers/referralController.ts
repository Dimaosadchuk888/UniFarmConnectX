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
   */
  static async getUserReferrals(req: Request, res: Response): Promise<void> {
    try {
      const userId = extractUserId(req, 'query');
      
      if (!userId) {
        return sendError(res, 'Invalid user ID', 400);
      }

      // Проверка существования пользователя
      const user = await UserService.getUserById(userId);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      // Получаем список приглашенных пользователей
      const referrals = await ReferralService.getUserReferrals(userId);
      
      // Получаем статистику по уровням рефералов
      const referralCounts = await ReferralService.getReferralCounts(userId);
      
      // Получаем данные по доходам с каждого уровня рефералов
      const levelIncome = await ReferralController.getLevelIncomeData(userId);
      
      // Формируем ответ
      const response = {
        user_id: userId,
        username: user.username,
        total_referrals: referrals.length,
        referral_counts: referralCounts,
        level_income: levelIncome,
        referrals: referrals
      };

      sendSuccess(res, response);
    } catch (error) {
      console.error('Error fetching user referrals:', error);
      sendServerError(res, 'Failed to fetch user referrals');
    }
  }
  
  /**
   * Получает данные о доходах с каждого уровня рефералов
   * @param userId ID пользователя
   * @returns Объект с доходами по уровням
   */
  private static async getLevelIncomeData(userId: number): Promise<Record<number, { uni: number, ton: number }>> {
    try {
      // Получаем транзакции с типом referral_bonus
      const db = (await import('../db')).db;
      const transactions = (await import('@shared/schema')).transactions;
      const { eq, and, sql } = await import('drizzle-orm');
      
      try {
        // Запрос для получения суммы доходов от рефералов по уровням
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
        
        for (const row of referralTransactions) {
          if (row.level !== null) {
            result[row.level] = {
              uni: parseFloat(row.uni_amount || '0'),
              ton: parseFloat(row.ton_amount || '0')
            };
          }
        }
        
        return result;
      } catch (error: any) {
        // Если ошибка связана с отсутствием поля data, возвращаем пустой объект
        if (error.message && error.message.includes("column \"data\" does not exist")) {
          console.log('Поле "data" не найдено в таблице transactions, возвращаем пустой результат');
          return {};
        }
        
        // Если ошибка другая, пробрасываем исключение выше
        throw error;
      }
    } catch (error) {
      console.error('Error calculating level income:', error);
      return {};
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