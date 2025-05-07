/**
 * Сервис управления сессиями пользователей
 * 
 * Предоставляет методы для восстановления сессий пользователей
 * и другие связанные с сессиями операции
 */

import { IStorage } from "../storage-interface";
import { generateRandomString } from "../utils/string-utils";
import { User } from "@shared/schema";
import { StorageErrors, StorageErrorType } from "../storage-interface";

/**
 * Интерфейс сервиса управления сессиями
 */
export interface SessionService {
  /**
   * Восстанавливает сессию пользователя по guest_id
   * @param guestId Идентификатор гостя
   * @param telegramId Опциональный Telegram ID
   * @returns Данные пользователя
   */
  restoreSessionByGuestId(guestId: string, telegramId?: number): Promise<User>;
}

/**
 * Создаёт экземпляр сервиса управления сессиями
 * @param storage Хранилище данных
 * @returns Экземпляр сервиса
 */
export function createSessionService(storage: IStorage): SessionService {
  return {
    /**
     * Восстанавливает сессию пользователя по guest_id
     * @param guestId Идентификатор гостя
     * @param telegramId Опциональный Telegram ID
     * @returns Данные пользователя или null, если пользователь не найден
     * @throws {StorageError} если произошла ошибка при работе с хранилищем
     */
    async restoreSessionByGuestId(guestId: string, telegramId?: number): Promise<User> {
      console.log(`[SessionService] Попытка восстановления сессии для guest_id: ${guestId}`);
      
      if (!guestId) {
        throw StorageErrors.validation('Guest ID is required');
      }
      
      // Ищем пользователя по guest_id
      const user = await storage.getUserByGuestId(guestId);
      
      if (!user) {
        throw StorageErrors.notFound('User', { guestId });
      }
      
      // Если передан telegram_id и он отличается от сохраненного, логируем этот факт
      if (telegramId && user.telegram_id && telegramId !== user.telegram_id) {
        console.warn(`[SessionService] ⚠️ Обнаружено различие в telegram_id: сохранённый=${user.telegram_id}, переданный=${telegramId}`);
      }
      
      // Проверяем наличие реферального кода у пользователя
      if (!user.ref_code) {
        console.log(`[SessionService] ⚠️ У пользователя с ID ${user.id} отсутствует реферальный код, генерируем новый`);
        
        try {
          // Генерируем уникальный реферальный код через хранилище
          const refCode = await storage.generateUniqueRefCode();
          console.log(`[SessionService] Сгенерирован новый реферальный код: ${refCode}`);
          
          // Обновляем пользователя с новым кодом
          const updatedUser = await storage.updateUserRefCode(user.id, refCode);
          
          if (updatedUser) {
            console.log(`[SessionService] ✅ Успешно обновлен реферальный код для пользователя ${user.id}: ${refCode}`);
            return updatedUser;
          }
          
          console.error(`[SessionService] ❌ Не удалось обновить реферальный код, возвращаем оригинального пользователя`);
        } catch (err) {
          console.error(`[SessionService] Ошибка при генерации реферального кода:`, err);
          // В случае ошибки просто возвращаем пользователя без изменений
        }
      } else {
        console.log(`[SessionService] У пользователя уже есть реферальный код: ${user.ref_code}`);
      }
      
      return user;
    }
  };
}