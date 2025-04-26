import { Request, Response } from "express";
import { storage } from "../storage";
import 'express-session';

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
  static async restoreSession(req: Request, res: Response): Promise<void> {
    try {
      // Получаем guest_id из тела запроса
      const { guest_id } = req.body;
      // Получаем telegram_id из тела запроса (если есть)
      const { telegram_id } = req.body;
      
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
      
      // Сохраняем данные пользователя в Express-сессии для последующих запросов
      if (req.session) {
        req.session.userId = user.id;
        req.session.user = {
          id: user.id,
          username: user.username,
          ref_code: user.ref_code,
          guest_id: user.guest_id
        };
        console.log(`[SessionController] ✅ Данные пользователя сохранены в Express-сессии: userId=${user.id}, ref_code=${user.ref_code || 'не указан'}`);
      } else {
        console.warn(`[SessionController] ⚠️ Express-сессия недоступна, нельзя сохранить данные пользователя`);
      }
      
      // Возвращаем данные пользователя (без конфиденциальной информации)
      res.status(200).json({
        success: true,
        message: 'Сессия успешно восстановлена',
        data: {
          user_id: user.id,
          username: user.username,
          telegram_id: user.telegram_id, 
          balance_uni: user.balance_uni,
          balance_ton: user.balance_ton,
          ref_code: user.ref_code,
          guest_id: user.guest_id,
          created_at: user.created_at,
          parent_ref_code: user.parent_ref_code
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