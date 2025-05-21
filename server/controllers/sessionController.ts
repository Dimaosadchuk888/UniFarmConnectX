import { Request, Response } from "express";
import { extendedStorage } from "../storage-adapter-extended";
import { userService } from "../services";
import 'express-session';
import { adaptedSendSuccess as sendSuccess, adaptedSendError as sendError, adaptedSendServerError as sendServerError } from '../utils/apiResponseAdapter';
import { dbUserToApiUser } from '../utils/userAdapter';
import { wrapServiceFunction } from '../db-service-wrapper';

// Для корректной работы с сессией расширяем интерфейс Request
// Это временное решение, обходящее проблему с типизацией express-session
type RequestWithSession = Request & {
  session?: {
    userId?: number;
    user?: {
      id: number;
      username: string;
      ref_code?: string;
      guest_id?: string;
    };
  };
};

/**
 * Контроллер для управления сессиями пользователей и восстановления кабинета
 * 
 * Этап 5: Безопасное восстановление пользователя
 * Обеспечивает стабильную работу системы, при которой один и тот же пользователь (по guest_id)
 * всегда получает доступ к своему кабинету, даже при повторных заходах.
 */
export class SessionController {
  /**
   * Создает тестовую сессию для режима разработки
   * @param req Запрос
   * @param res Ответ с данными тестового пользователя
   */
  static async devLogin(req: RequestWithSession, res: Response): Promise<any> {
    try {
      // В продакшн-версії цей метод недоступний взагалі
      sendError(res, 'Ця функція недоступна в продакшн-середовищі', 403);
      return;
      
    } catch (error) {
      console.error('[SessionController] Ошибка при создании тестовой сессии:', error);
      sendServerError(res, 'Внутренняя ошибка сервера при создании тестовой сессии');
    }
  }
  /**
   * Восстанавливает сессию пользователя по guest_id без создания нового аккаунта
   * @param req Запрос с guest_id в параметрах
   * @param res Ответ с данными пользователя или ошибкой
   */
  static async restoreSession(req: RequestWithSession, res: Response): Promise<any> {
    try {
      // Получаем guest_id из тела запроса
      const { guest_id } = req.body;
      // Получаем telegram_id из тела запроса (если есть)
      const { telegram_id } = req.body;
      // Проверка режима разработки
      const isDevelopmentMode = process.env.NODE_ENV === 'development' || req.headers['x-development-mode'] === 'true';
      const developmentUserId = req.headers['x-development-user-id'] 
        ? Number(req.headers['x-development-user-id']) 
        : undefined;
      
      // Логирование всех заголовков запроса для диагностики
      console.log('[SessionController] Входящий запрос восстановления сессии. guest_id:', guest_id || 'отсутствует');
      console.log('[SessionController] Headers:', 
        Object.keys(req.headers)
          .filter(key => !key.includes('sec-') && !key.includes('accept'))  // Фильтруем технические заголовки
          .reduce((obj, key) => ({...obj, [key]: req.headers[key]}), {})
      );
      console.log('[SessionController] Session:', req.session ? 'доступна' : 'недоступна');
      console.log('[SessionController] Режим разработки:', isDevelopmentMode ? 'включен' : 'выключен');
      if (developmentUserId) console.log('[SessionController] ID тестового пользователя:', developmentUserId);
      
      if (req.session) {
        console.log('[SessionController] Session user:', req.session.user ? 'установлен' : 'не установлен');
        console.log('[SessionController] Session userId:', req.session.userId);
      }
      
      // В продакшн-версії не використовуємо тестових користувачів
      
      // Проверяем наличие guest_id (только если не в режиме разработки или не удалось получить тестового пользователя)
      if (!guest_id) {
        console.error('[SessionController] Отсутствует guest_id в запросе');
        return sendError(res, 'Отсутствует guest_id в запросе', 400, { error_code: 'MISSING_GUEST_ID' });
      }
      
      console.log(`[SessionController] Этап 5: Попытка безопасного восстановления сессии для guest_id: ${guest_id}`);
      if (telegram_id) {
        console.log(`[SessionController] Дополнительно передан telegram_id: ${telegram_id}`);
      }
      
      // Ищем пользователя по guest_id
      const user = await extendedStorage.getUserByGuestId(guest_id);
      
      // Проверяем, найден ли пользователь
      if (!user) {
        console.log(`[SessionController] Пользователь с guest_id ${guest_id} не найден`);
        return sendError(res, 'Пользователь не найден', 404, { error_code: 'USER_NOT_FOUND' });
      }
      
      // Если передан telegram_id и он отличается от сохраненного, логируем этот факт
      // но не блокируем восстановление, так как приоритет у guest_id (согласно Этапу 5)
      if (telegram_id && user.telegram_id && telegram_id !== user.telegram_id) {
        console.warn(`[SessionController] ⚠️ Обнаружено различие в telegram_id: сохранённый=${user.telegram_id}, переданный=${telegram_id}`);
        console.log(`[SessionController] В соответствии с требованиями Этапа 5, продолжаем восстановление по guest_id`);
      }
      
      // Успешно нашли и восстановили пользователя
      console.log(`[SessionController] ✅ Сессия успешно восстановлена для пользователя с ID: ${user.id}`);
      
      // Проверяем наличие реферального кода у пользователя
      let updatedUser = user;
      if (!user.ref_code) {
        console.log(`[SessionController] ⚠️ У пользователя с ID ${user.id} отсутствует реферальный код, генерируем новый`);
        
        try {
          // Генерируем уникальный реферальный код
          const refCode = await userService.generateRefCode();
          console.log(`[SessionController] Сгенерирован новый реферальный код: ${refCode}`);
          
          // Обновляем пользователя с новым кодом
          const result = await userService.updateUserRefCode(user.id, refCode);
          
          if (result) {
            updatedUser = result;
            console.log(`[SessionController] ✅ Успешно обновлен реферальный код для пользователя ${user.id}: ${refCode}`);
          } else {
            console.error(`[SessionController] ❌ Не удалось обновить реферальный код для пользователя ${user.id}`);
          }
        } catch (err) {
          console.error(`[SessionController] Ошибка при генерации реферального кода:`, err);
        }
      } else {
        console.log(`[SessionController] У пользователя уже есть реферальный код: ${user.ref_code}`);
      }
      
      // Сохраняем данные пользователя в Express-сессии для последующих запросов
      if (req.session) {
        req.session.userId = updatedUser.id;
        req.session.user = {
          id: updatedUser.id,
          username: updatedUser.username || '',
          ref_code: updatedUser.ref_code || undefined,
          guest_id: updatedUser.guest_id || undefined
        };
        console.log(`[SessionController] ✅ Данные пользователя сохранены в Express-сессии: userId=${updatedUser.id}, ref_code=${updatedUser.ref_code || 'не указан'}`);
      } else {
        console.warn(`[SessionController] ⚠️ Express-сессия недоступна, нельзя сохранить данные пользователя`);
      }
      
      // Возвращаем данные пользователя (без конфиденциальной информации)
      // Используем updatedUser, чтобы вернуть актуальный ref_code
      sendSuccess(res, {
        user_id: updatedUser.id,
        username: updatedUser.username,
        telegram_id: updatedUser.telegram_id, 
        balance_uni: updatedUser.balance_uni,
        balance_ton: updatedUser.balance_ton,
        ref_code: updatedUser.ref_code,
        guest_id: updatedUser.guest_id,
        created_at: updatedUser.created_at,
        parent_ref_code: updatedUser.parent_ref_code
      }, 'Сессия успешно восстановлена', 200);
    } catch (error) {
      console.error('[SessionController] Ошибка при восстановлении сессии:', error);
      sendServerError(res, 'Внутренняя ошибка сервера при восстановлении сессии', { error_code: 'SESSION_RESTORE_FAILED' });
    }
  }
}