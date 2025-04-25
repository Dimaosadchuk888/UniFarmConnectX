import { Request, Response } from "express";
import { storage } from "../storage";

/**
 * Контроллер для управления сессиями пользователей и восстановления кабинета
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
      
      // Проверяем наличие guest_id
      if (!guest_id) {
        console.error('[SessionController] Отсутствует guest_id в запросе');
        res.status(400).json({
          success: false,
          message: 'Отсутствует guest_id в запросе'
        });
        return;
      }
      
      console.log(`[SessionController] Попытка восстановления сессии для guest_id: ${guest_id}`);
      
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
      
      // Успешно нашли пользователя
      console.log(`[SessionController] Сессия успешно восстановлена для пользователя с ID: ${user.id}`);
      
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
          created_at: user.created_at
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