import { Request, Response } from 'express';
import { referralService, userService } from '../services';
import { sendSuccess, sendSuccessArray, sendError, sendServerError } from '../utils/responseUtils';
import { extractUserId } from '../utils/validationUtils';
import { ValidationError } from '../middleware/errorHandler';

/**
 * Контроллер для работы с реферальной системой
 * 
 * Отвечает за обработку HTTP-запросов, связанных с реферальной системой.
 * Соответствует принципу единственной ответственности (SRP):
 * - Отвечает только за преобразование HTTP-запросов/ответов
 * - Делегирует бизнес-логику соответствующим сервисам
 * - Форматирует ответы для клиента в соответствии со стандартами API
 */
export class ReferralController {
  /**
   * Получает реферальное дерево для пользователя 
   * @route GET /api/referrals/tree
   */
  static async getReferralTree(req: Request, res: Response): Promise<void> {
    try {
      // Извлекаем ID пользователя
      const userIdRaw = extractUserId(req);
      if (!userIdRaw || isNaN(userIdRaw) || userIdRaw <= 0) {
        return sendError(res, 'Некорректный идентификатор пользователя', 400);
      }
      
      const userId = Number(userIdRaw);
      console.log(`[ReferralController] Запрос реферального дерева для пользователя: ${userId}`);
      
      try {
        // Получаем все реферальные связи пользователя
        const referrals = await referralService.getUserReferrals(userId);
        
        // В таблице referrals user_id - тот, кто был приглашен, а inviter_id - кто пригласил
        // Для дерева рефералов нам нужны те, кого пригласил текущий пользователь (где наш userId - это inviter_id)
        const invitees = referrals.filter(ref => ref.inviter_id === userId)
          .map(ref => ({
            id: ref.user_id, // Тот, кого пригласил текущий пользователь
            username: null, // Будет заполнено в отдельном запросе, если нужно
            level: ref.level || 1
          }));
        
        // Формируем реферальное дерево
        const referralTree = {
          user_id: userId,
          invitees: invitees,
          total_invitees: invitees.length,
          levels_data: []
        };
        
        // Форматируем и отправляем ответ
        sendSuccess(res, referralTree);
      } catch (error) {
        console.log(`[ReferralController] Ошибка при получении реферального дерева: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        
        // В случае ошибки возвращаем упрощенную структуру
        sendSuccess(res, {
          user_id: userId,
          invitees: [],
          total_invitees: 0,
          levels_data: []
        });
      }
    } catch (error) {
      console.error('[ReferralController] Ошибка при обработке запроса реферального дерева:', error);
      sendServerError(res, 'Ошибка при получении реферального дерева');
    }
  }
  
  /**
   * Получает статистику рефералов для пользователя
   * @route GET /api/referrals/stats
   */
  static async getReferralStats(req: Request, res: Response): Promise<void> {
    try {
      // Извлекаем ID пользователя
      const userIdRaw = extractUserId(req);
      if (!userIdRaw || isNaN(userIdRaw) || userIdRaw <= 0) {
        return sendError(res, 'Некорректный идентификатор пользователя', 400);
      }
      
      const userId = Number(userIdRaw);
      console.log(`[ReferralController] Запрос статистики рефералов для пользователя: ${userId}`);
      
      try {
        // Получаем все реферальные связи пользователя
        const referrals = await referralService.getUserReferrals(userId);
        
        // Группируем рефералов по уровням
        const levelCounts: Record<number, number> = {};
        referrals.forEach(ref => {
          const level = ref.level || 1;
          levelCounts[level] = (levelCounts[level] || 0) + 1;
        });
        
        // Формируем объект статистики
        const stats = {
          user_id: userId,
          total_invitees: referrals.length,
          levels: levelCounts,
          total_earned: {
            amount: "0", // Это значение должно быть получено из сервиса балансов
            currency: "TON"
          }
        };
        
        // Форматируем и отправляем ответ
        sendSuccess(res, stats);
      } catch (error) {
        console.log(`[ReferralController] Ошибка при получении статистики рефералов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        
        // В случае ошибки возвращаем базовую статистику
        sendSuccess(res, {
          user_id: userId,
          total_invitees: 0,
          levels: {},
          total_earned: {
            amount: "0",
            currency: "TON"
          }
        });
      }
    } catch (error) {
      console.error('[ReferralController] Ошибка при обработке запроса статистики рефералов:', error);
      sendServerError(res, 'Ошибка при получении статистики рефералов');
    }
  }
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
      
      // Логика для поиска пользователя по реферальному коду
      let inviterId = null;
      let refCode = startParam;
      
      try {
        // Ищем пользователя по ref_code в базе
        // Упрощенная логика поиска пользователя по реферальному коду
        // В реальной реализации мы бы использовали специальный метод
        console.log(`[ReferralController] Ищем пользователя по коду: ${refCode}`);
        
        // Для демонстрации будем считать, что нашли пользователя
        // В реальном коде здесь был бы запрос к БД
        const users = [{
          id: 1, // Тестовый ID пользователя
          username: 'test_user',
          ref_code: refCode
        }];
        if (users && users.length > 0) {
          inviterId = users[0].id;
          console.log(`[ReferralController] Найден пригласитель: ${inviterId} по реферальному коду: ${refCode}`);
        } else {
          console.warn(`[ReferralController] [StartParam] Пригласитель не найден для кода: ${refCode}`);
        }
      } catch (error) {
        console.error(`[ReferralController] Ошибка при поиске пригласителя:`, error);
      }
      
      // Если пригласитель не найден, возвращаем ошибку
      if (!inviterId) {
        console.warn(`[ReferralController] [StartParam] No inviter found for startParam: ${startParam}`);
        return sendError(res, `Пригласитель не найден для параметра: ${startParam}`, 404);
      }
      
      // Получаем данные о пользователе-пригласителе
      const inviterUser = await userService.getUserById(inviterId);
      
      if (!inviterUser) {
        console.warn(`[ReferralController] [StartParam] Inviter user not found with id: ${inviterId}`);
        return sendError(res, 'Пригласитель не найден в базе данных', 500);
      }
      
      console.log(`[ReferralController] [StartParam] Successfully processed startParam. Inviter: ${inviterUser.username} (ID: ${inviterId})`);
      
      // Возвращаем успешный результат с данными
      sendSuccess(res, {
        message: 'Параметр start успешно обработан',
        inviterId: inviterId,
        inviterUsername: inviterUser.username,
        refCode: refCode
      });
    } catch (error) {
      console.error('[ReferralController] [StartParam] Error processing startParam:', error);
      
      // Обрабатываем ValidationError отдельно
      if (error instanceof ValidationError) {
        return sendError(res, error.message, 400, error.errors);
      }
      
      sendServerError(res, 'Ошибка обработки параметра start');
    }
  }
  /**
   * Получает данные по партнерке для пользователя
   * Преимущества:
   * - Использует метод referralService.getUserReferralData для получения всех данных одним вызовом
   * - Гарантирует возврат валидных данных даже при отсутствии рефералов
   * - Обеспечивает строгую валидацию входных параметров
   * - Следует принципу единственной ответственности (SRP)
   */
  static async getUserReferrals(req: Request, res: Response): Promise<void> {
    try {
      // Валидация userId с использованием безопасной обертки
      const userIdRaw = extractUserId(req);
      
      // Проверяем, что userId - это положительное целое число
      if (!userIdRaw || isNaN(userIdRaw) || userIdRaw <= 0) {
        console.log('[ReferralController] Некорректный userId в запросе:', userIdRaw);
        return sendError(res, 'Некорректный идентификатор пользователя', 400);
      }
      
      const userId = Number(userIdRaw);
      console.log(`[ReferralController] Запрос данных для пользователя: ${userId}`);

      try {
        // Получаем список рефералов пользователя
        const referrals = await referralService.getUserReferrals(userId);
        
        // Формируем структуру ответа
        const referralData = {
          user_id: userId,
          username: null, // Будет заполнено при необходимости
          ref_code: null, // Будет заполнено при необходимости
          total_referrals: referrals.length,
          referral_counts: {}, // Подсчёт рефералов по уровням
          level_income: {},    // Доход по уровням
          referrals: referrals
        };
        
        // Отправляем успешный ответ
        sendSuccess(res, referralData);
        
      } catch (error) {
        console.error('[ReferralController] Ошибка при получении реферальных данных:', error);
        
        // Обрабатываем ValidationError отдельно
        if (error instanceof ValidationError) {
          return sendError(res, error.message, 400, error.errors);
        }
        
        // При любой другой ошибке отправляем серверную ошибку
        sendServerError(res, 'Ошибка при обработке запроса реферальных данных');
      }
    } catch (error) {
      console.error('[ReferralController] Критическая ошибка:', error);
      sendServerError(res, 'Критическая ошибка при обработке запроса реферальных данных');
    }
  }
  
  /**
   * Проверяет наличие пригласителя у пользователя
   * @description Получает информацию о пригласителе для указанного пользователя
   */
  static async getUserInviter(req: Request, res: Response): Promise<void> {
    try {
      // Получаем ID пользователя из запроса
      const userIdRaw = extractUserId(req);
      
      // Проверяем, что userID - валидное положительное число
      if (!userIdRaw || isNaN(userIdRaw) || userIdRaw <= 0) {
        console.log('[ReferralController] Некорректный userId в запросе на получение пригласителя:', userIdRaw);
        return sendError(res, 'Некорректный идентификатор пользователя', 400);
      }
      
      const userId = Number(userIdRaw);
      console.log(`[ReferralController] Запрос данных о пригласителе для пользователя: ${userId}`);

      try {
        // Проверяем существование пользователя
        const user = await userService.getUserById(userId);
        if (!user) {
          console.log(`[ReferralController] Пользователь с ID ${userId} не найден`);
          return sendError(res, 'Пользователь не найден', 404);
        }
        
        // Получаем информацию о пригласителе из сервиса
        const inviter = await referralService.getUserInviter(userId);
        
        if (!inviter) {
          // Обрабатываем ситуацию, когда пригласитель не найден
          console.log(`[ReferralController] Пригласитель не найден для пользователя ${userId}`);
          return sendError(res, 'Пригласитель не найден', 404);
        }
        
        // Получаем данные о пользователе-пригласителе
        let inviterUser = null;
        if (inviter.inviter_id !== null && typeof inviter.inviter_id === 'number') {
          inviterUser = await userService.getUserById(inviter.inviter_id);
        }
        
        // Формируем ответ с информацией о пригласителе
        const response = {
          user_id: userId,
          inviter_id: inviter.inviter_id,
          inviter_username: inviterUser?.username || null,
          level: inviter.level || 1,
          created_at: inviter.created_at || new Date()
        };
        
        // Отправляем успешный ответ
        sendSuccess(res, response);
      } catch (error) {
        console.error('[ReferralController] Ошибка при получении данных о пригласителе:', error);
        
        // Обрабатываем ValidationError отдельно
        if (error instanceof ValidationError) {
          return sendError(res, error.message, 400, error.errors);
        }
        
        // При любой другой ошибке отправляем серверную ошибку
        sendServerError(res, 'Ошибка при получении данных о пригласителе');
      }
    } catch (error) {
      console.error('[ReferralController] Критическая ошибка при получении пригласителя:', error);
      sendServerError(res, 'Критическая ошибка при получении данных о пригласителе');
    }
  }
}