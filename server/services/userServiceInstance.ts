/**
 * Экземпляр сервиса для работы с пользователями
 * 
 * Этот файл создает и экспортирует экземпляр userService для использования
 * в приложении. Это позволяет избежать циклических зависимостей и обеспечивает
 * единую точку доступа к сервису пользователей.
 */

import { createUserService, IUserService } from './userService';
import { extendedStorage } from '../storage-adapter-extended';
import { sql } from '@vercel/postgres';
import { db } from '../db';

/**
 * Создает экземпляр сервиса пользователей
 * @returns Экземпляр IUserService
 */
export function createUserServiceInstance(): IUserService {
  return createUserService(extendedStorage);
}

/**
 * Экспортируем экземпляр сервиса для использования в приложении
 */
export const userServiceInstance = createUserServiceInstance();

/**
   * Поиск пользователя по guest_id
   */
  async function findUserByGuestId(guestId: string): Promise<any> {
    try {
      console.log('[UserService] Поиск пользователя по guest_id:', guestId);

      const query = sql`
        SELECT user_id, username, guest_id, ref_code, balance, farming_rate, created_at
        FROM users 
        WHERE guest_id = ${guestId}
        LIMIT 1
      `;

      const result = await db.execute(query);
      const users = result.rows;

      if (users.length === 0) {
        console.log('[UserService] Пользователь с guest_id не найден:', guestId);
        return null;
      }

      const user = users[0];
      console.log('[UserService] Пользователь найден:', user.user_id);

      return user;
    } catch (error) {
      console.error('[UserService] Ошибка при поиске пользователя по guest_id:', error);
      throw error;
    }
  }

  /**
   * Обновляет данные пользователя
   */
  async function updateUser(userId: number, updates: any): Promise<any> {
    console.log("dummy");
}