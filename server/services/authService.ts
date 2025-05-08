/**
 * ВНИМАНИЕ: Используйте импорт из services/index.ts вместо прямого импорта
 * 
 * Этот файл является прокси-оберткой для обратной совместимости.
 * Для новых разработок используйте инстанс authService из services/index.ts
 */

import { authServiceInstance } from './authServiceInstance';
export * from './authServiceInstance';

/**
 * @deprecated Используйте инстанс authService из services/index.ts
 */
export class AuthService {
  private static BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

  /**
   * Проверяет Telegram initData и аутентифицирует пользователя
   */
  static async authenticateTelegram(authData: any, isDevelopment: boolean = false) {
    return authServiceInstance.authenticateTelegram(authData, isDevelopment);
  }

  /**
   * Регистрирует гостевого пользователя по guest_id
   */
  static async registerGuestUser(data: any) {
    return authServiceInstance.registerGuestUser(data);
  }

  /**
   * Регистрирует обычного пользователя
   */
  static async registerUser(data: any) {
    return authServiceInstance.registerUser(data);
  }

  /**
   * Создает или обновляет сессию пользователя
   */
  private static async createOrUpdateSession(userId: number): Promise<string> {
    // Приватный метод, который не вызывается извне, поэтому просто выбрасываем ошибку
    throw new Error('Этот метод не должен вызываться напрямую');
  }
}