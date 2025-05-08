/**
 * ВНИМАНИЕ: Используйте импорт из services/index.ts вместо прямого импорта
 * 
 * Этот файл является прокси-оберткой для обратной совместимости.
 * Для новых разработок используйте инстанс securityService из services/index.ts
 */

import { securityServiceInstance } from './securityServiceInstance';
export * from './securityServiceInstance';

/**
 * @deprecated Используйте инстанс securityService из services/index.ts
 */
export class SecurityService {
  private static BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

  /**
   * Проверяет Telegram данные на валидность
   */
  static async validateTelegramData(data: any, isDevelopment: boolean = false): Promise<boolean> {
    return securityServiceInstance.validateTelegramData(data, isDevelopment);
  }

  /**
   * Безопасно парсит Telegram initData
   */
  static parseTelegramInitData(initData: string): Record<string, any> {
    return securityServiceInstance.parseTelegramInitData(initData);
  }

  /**
   * Извлекает Telegram данные из заголовков
   */
  static extractTelegramDataFromHeaders(headers: any): string | null {
    return securityServiceInstance.extractTelegramDataFromHeaders(headers);
  }

  /**
   * Проверяет на XSS и инъекции
   */
  static sanitizeInput(input: string): string {
    return securityServiceInstance.sanitizeInput(input);
  }

  /**
   * Проверяет права доступа пользователя
   */
  static async checkUserPermission(userId: number, requiredPermission: string): Promise<boolean> {
    return securityServiceInstance.checkUserPermission(userId, requiredPermission);
  }
}