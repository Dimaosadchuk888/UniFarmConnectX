import { Request, Response } from "express";
import { extendedStorage } from "../storage-adapter-extended";
import { userService } from "../services";
import 'express-session';
import { sendSuccess, sendError, sendServerError } from '../utils/responseUtils';
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
      // Проверяем, что мы в режиме разработки
      if (process.env.NODE_ENV !== 'development') {
        sendError(res, 'Доступно только в режиме разработки', 403);
        return;
      }
      
      console.log('[SessionController] Создание тестовой сессии для режима разработки');
      
      // Создаем фиктивный тестовый аккаунт
      const testUser = {
        id: 1,
        username: 'dev_user',
        telegram_id: '123456789',
        balance_uni: '1000000',
        balance_ton: '25.5',
        ref_code: 'DEV123',
        guest_id: 'dev-guest-id-123',
        created_at: new Date().toISOString(),
        parent_ref_code: null
      };
      
      // Сохраняем данные пользователя в Express-сессии для последующих запросов
      if (req.session) {
        req.session.userId = testUser.id;
        req.session.user = {
          id: testUser.id,
          username: testUser.username,
          ref_code: testUser.ref_code,
          guest_id: testUser.guest_id
        };
        console.log(`[SessionController] ✅ Тестовые данные пользователя сохранены в Express-сессии: userId=${testUser.id}`);
      } else {
        console.warn(`[SessionController] ⚠️ Express-сессия недоступна, нельзя сохранить данные пользователя`);
      }
      
      // Возвращаем данные тестового пользователя
      sendSuccess(res, testUser, 'Тестовая сессия создана');
      
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
      
      // В режиме разработки с указанным ID пользователя используем его вместо guest_id
      if (isDevelopmentMode && developmentUserId) {
        console.log(`[SessionController] Режим разработки: используем ID пользователя ${developmentUserId} вместо guest_id`);
        
        try {
          // Получаем пользователя по ID
          const devUser = await extendedStorage.getUser(developmentUserId);
          
          if (devUser) {
            console.log(`[SessionController] ✅ Тестовый пользователь найден с ID: ${devUser.id}`);
            
            // Сохраняем данные пользователя в Express-сессии для последующих запросов
            if (req.session) {
              req.session.userId = devUser.id;
              req.session.user = {
                id: devUser.id,
                username: devUser.username || '',
                ref_code: devUser.ref_code || undefined,
                guest_id: devUser.guest_id || undefined
              };
              console.log(`[SessionController] ✅ Данные тестового пользователя сохранены в сессии`);
            }
            
            // Возвращаем данные пользователя
            const userData = {
                user_id: devUser.id,
                username: devUser.username,
                telegram_id: devUser.telegram_id, 
                balance_uni: devUser.balance_uni,
                balance_ton: devUser.balance_ton,
                ref_code: devUser.ref_code,
                guest_id: devUser.guest_id,
                created_at: devUser.created_at,
                parent_ref_code: devUser.parent_ref_code
              };
              
              return sendSuccess(res, userData, 'Сессия успешно восстановлена (режим разработки)');
          } else {
            console.warn(`[SessionController] ⚠️ Тестовый пользователь с ID ${developmentUserId} не найден, продолжаем обычное восстановление`);
            // Если тестовый пользователь не найден, продолжаем обычное восстановление по guest_id
          }
        } catch (devError) {
          console.error(`[SessionController] Ошибка при получении тестового пользователя:`, devError);
          // В случае ошибки продолжаем обычное восстановление по guest_id
        }
      }
      
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
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден',
          error_code: 'USER_NOT_FOUND'
        });
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
      res.status(200).json({
        success: true,
        message: 'Сессия успешно восстановлена',
        data: {
          user_id: updatedUser.id,
          username: updatedUser.username,
          telegram_id: updatedUser.telegram_id, 
          balance_uni: updatedUser.balance_uni,
          balance_ton: updatedUser.balance_ton,
          ref_code: updatedUser.ref_code,
          guest_id: updatedUser.guest_id,
          created_at: updatedUser.created_at,
          parent_ref_code: updatedUser.parent_ref_code
        }
      });
    } catch (error) {
      console.error('[SessionController] Ошибка при восстановлении сессии:', error);
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера при восстановлении сессии',
        error_code: 'SESSION_RESTORE_FAILED'
      });
    }
  }
}