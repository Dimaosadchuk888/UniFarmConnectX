import { Request, Response } from "express";
import { storage } from "../storage";
import { UserService } from "../services/userService";
import 'express-session';

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
   * Восстанавливает сессию пользователя по guest_id без создания нового аккаунта
   * @param req Запрос с guest_id в параметрах
   * @param res Ответ с данными пользователя или ошибкой
   */
  static async restoreSession(req: RequestWithSession, res: Response): Promise<void> {
    try {
      // Получаем guest_id из тела запроса
      const { guest_id } = req.body;
      // Получаем telegram_id из тела запроса (если есть)
      const { telegram_id } = req.body;
      
      // Логирование всех заголовков запроса для диагностики
      console.log('[SessionController] Входящий запрос восстановления сессии. guest_id:', guest_id || 'отсутствует');
      console.log('[SessionController] Headers:', 
        Object.keys(req.headers)
          .filter(key => !key.includes('sec-') && !key.includes('accept'))  // Фильтруем технические заголовки
          .reduce((obj, key) => ({...obj, [key]: req.headers[key]}), {})
      );
      console.log('[SessionController] Session:', req.session ? 'доступна' : 'недоступна');
      if (req.session) {
        console.log('[SessionController] Session user:', req.session.user ? 'установлен' : 'не установлен');
        console.log('[SessionController] Session userId:', req.session.userId);
      }
      
      // Проверяем наличие guest_id
      if (!guest_id) {
        console.error('[SessionController] Отсутствует guest_id в запросе');
        res.status(400).json({
          success: false,
          message: 'Отсутствует guest_id в запросе'
        });
        return;
      }
      
      console.log(`[SessionController] Этап 5: Попытка безопасного восстановления сессии для guest_id: ${guest_id}`);
      if (telegram_id) {
        console.log(`[SessionController] Дополнительно передан telegram_id: ${telegram_id}`);
      }
      
      // Ищем пользователя по guest_id
      const user = await storage.getUserByGuestId(guest_id);
      
      // Проверяем, найден ли пользователь
      if (!user) {
        console.log(`[SessionController] Пользователь с guest_id ${guest_id} не найден`);
        res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
        return;
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
          const refCode = await UserService.generateUniqueRefCode();
          console.log(`[SessionController] Сгенерирован новый реферальный код: ${refCode}`);
          
          // Обновляем пользователя с новым кодом
          const result = await UserService.updateUserRefCode(user.id, refCode);
          
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
        message: 'Внутренняя ошибка сервера при восстановлении сессии'
      });
    }
  }
}