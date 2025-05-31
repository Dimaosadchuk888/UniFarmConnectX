/**
 * Сервис для обработки реферальных ссылок и кодов
 * 
 * Этот сервис отвечает за:
 * 1. Извлечение реферального кода из URL
 * 2. Проверку валидности реферального кода
 * 3. Сохранение реферального кода в локальное хранилище
 * 4. Применение реферального кода при создании новых пользователей
 * 5. Получение статистики рефералов
 */

// Ключ для хранения реферального кода в локальном хранилище
const REFERRAL_CODE_KEY = 'unifarm_referral_code';

// Максимальное время хранения реферального кода в локальном хранилище (24 часа)
const REFERRAL_CODE_TTL = 24 * 60 * 60 * 1000;

// Интерфейс для хранения реферального кода с временной меткой
interface StoredReferralCode {
  code: string;
  timestamp: number;
}

export class ReferralService {
  /**
   * Извлекает реферальный код из URL (параметр ref_code или устаревший startapp)
   */
  getRefCodeFromUrl(): string | null {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('ref_code') || urlParams.get('startapp') || null;
    } catch (error) {
      console.error('[ReferralService] Ошибка извлечения ref_code из URL:', error);
      return null;
    }
  }

  /**
   * Сохраняет реферальный код в локальное хранилище с временной меткой
   */
  saveRefCodeToStorage(refCode: string): void {
    try {
      const data: StoredReferralCode = {
        code: refCode,
        timestamp: Date.now()
      };
      localStorage.setItem(REFERRAL_CODE_KEY, JSON.stringify(data));
      console.log(`[ReferralService] Реферальный код сохранен: ${refCode}`);
    } catch (error) {
      console.error('[ReferralService] Ошибка сохранения ref_code:', error);
    }
  }

  /**
   * Получает реферальный код из локального хранилища
   */
  getRefCodeFromStorage(): string | null {
    try {
      const storedData = localStorage.getItem(REFERRAL_CODE_KEY);
      if (!storedData) return null;

      const data: StoredReferralCode = JSON.parse(storedData);
      
      // Проверяем, не истек ли TTL
      if (Date.now() - data.timestamp > REFERRAL_CODE_TTL) {
        this.clearRefCodeFromStorage();
        return null;
      }

      return data.code;
    } catch (error) {
      console.error('[ReferralService] Ошибка получения ref_code из хранилища:', error);
      return null;
    }
  }

  /**
   * Очищает реферальный код из локального хранилища
   */
  clearRefCodeFromStorage(): void {
    try {
      localStorage.removeItem(REFERRAL_CODE_KEY);
      console.log('[ReferralService] Реферальный код очищен из хранилища');
    } catch (error) {
      console.error('[ReferralService] Ошибка очистки ref_code:', error);
    }
  }

  /**
   * Генерирует уникальный реферальный код для пользователя
   */
  async generateReferralCode(userId: string): Promise<string> {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const refCode = `${userId.slice(-4)}${random}${timestamp.toString().slice(-4)}`;
      
      console.log(`[ReferralService] Генерация реферального кода для пользователя ${userId}: ${refCode}`);
      return refCode;
    } catch (error) {
      console.error('[ReferralService] Ошибка генерации реферального кода:', error);
      throw error;
    }
  }

  /**
   * Обрабатывает реферальную связь между пользователями
   */
  async processReferral(refCode: string, newUserId: string): Promise<boolean> {
    try {
      console.log(`[ReferralService] Обработка реферала: код ${refCode} для пользователя ${newUserId}`);
      
      // Здесь будет логика записи в базу данных
      // Связывание нового пользователя с пригласившим
      
      return true;
    } catch (error) {
      console.error('[ReferralService] Ошибка обработки реферала:', error);
      return false;
    }
  }

  /**
   * Получает статистику рефералов для пользователя
   */
  async getReferralStats(userId: string): Promise<any> {
    try {
      console.log(`[ReferralService] Получение статистики рефералов для пользователя ${userId}`);
      
      // Здесь будет логика получения данных из базы
      return { 
        referrals: 0, 
        earnings: "0",
        total_invited: 0,
        active_referrals: 0
      };
    } catch (error) {
      console.error('[ReferralService] Ошибка получения статистики рефералов:', error);
      throw error;
    }
  }

  /**
   * Валидирует реферальный код
   */
  async validateReferralCode(refCode: string): Promise<boolean> {
    try {
      if (!refCode || refCode.length < 6) {
        return false;
      }

      console.log(`[ReferralService] Валидация реферального кода: ${refCode}`);
      
      // Здесь будет проверка существования кода в базе данных
      return true;
    } catch (error) {
      console.error('[ReferralService] Ошибка валидации реферального кода:', error);
      return false;
    }
  }

  /**
   * Получает активный реферальный код (из URL или хранилища)
   */
  getActiveRefCode(): string | null {
    // Сначала проверяем URL
    const urlRefCode = this.getRefCodeFromUrl();
    if (urlRefCode) {
      this.saveRefCodeToStorage(urlRefCode);
      return urlRefCode;
    }

    // Если в URL нет, проверяем хранилище
    return this.getRefCodeFromStorage();
  }
}