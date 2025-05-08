/**
 * ВНИМАНИЕ: Используйте импорт из services/index.ts вместо прямого импорта
 * 
 * Этот файл является прокси-оберткой для обратной совместимости.
 * Для новых разработок используйте инстанс adminService из services/index.ts
 */

import { adminServiceInstance } from './adminServiceInstance';
export * from './adminServiceInstance';

/**
 * @deprecated Используйте инстанс adminService из services/index.ts
 */
export class AdminService {
  /**
   * Проверяет административные права доступа
   */
  static verifyAdminAccess(adminKey: string): void {
    return adminServiceInstance.verifyAdminAccess(adminKey);
  }

  /**
   * Получает список всех пользователей с их Telegram ID
   */
  static async listUsersWithTelegramId(params?: any): Promise<any> {
    return adminServiceInstance.listUsersWithTelegramId(params);
  }
}