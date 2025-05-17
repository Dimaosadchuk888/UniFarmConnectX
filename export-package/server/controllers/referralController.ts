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
      
      // Используем метод из сервиса для обработки startParam
      const { inviterId, refCode } = await referralService.processStartParam(startParam);
      
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
        // Получаем все данные из сервиса одним вызовом
        const referralData = await referralService.getUserReferralData(userId);
        
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