/**
 * Сервис для восстановления сессии пользователя по guest_id
 * 
 * Этот сервис отвечает за:
 * 1. Проверку наличия guest_id в localStorage/sessionStorage
 * 2. Выполнение авторизации по guest_id без создания нового аккаунта
 * 3. Предотвращение создания дубликатов аккаунтов
 */

import { apiRequest } from "@/lib/queryClient";
import { GuestIdService } from "./guestIdService";
import { referralService } from "./referralService";

interface SessionRestoreResult {
  success: boolean;
  message: string;
  user?: any;
  isAuthenticated?: boolean;
  useExistingSession?: boolean;
}

/**
 * Сервис для восстановления сессии пользователя
 */
class SessionRestoreService {
  /**
   * Проверяет наличие существующего guest_id и восстанавливает сессию по нему
   * Использует все доступные методы хранения (localStorage, sessionStorage)
   * @returns {Promise<SessionRestoreResult>} Результат попытки восстановления сессии
   */
  async restoreSession(): Promise<SessionRestoreResult> {
    console.log('[SessionRestore] Начинаем проверку наличия сохраненного guest_id...');
    
    // Шаг 1: Проверяем наличие guest_id в localStorage
    const guestId = GuestIdService.get({ generateIfMissing: false });
    
    if (!guestId) {
      console.log('[SessionRestore] Guest ID не найден в localStorage');
      return {
        success: false,
        message: 'Guest ID не найден в хранилище'
      };
    }
    
    console.log(`[SessionRestore] Найден guest_id: ${guestId}, пытаемся восстановить сессию`);
    
    try {
      // Шаг 2: Делаем запрос к API для восстановления сессии по guest_id
      const response = await this.fetchUserByGuestId(guestId);
      
      if (response.success && response.data) {
        console.log('[SessionRestore] Успешно восстановлена сессия по guest_id:', {
          userId: response.data.id,
          username: response.data.username,
          telegramId: response.data.telegram_id
        });
        
        return {
          success: true,
          message: 'Сессия успешно восстановлена',
          user: response.data,
          isAuthenticated: true,
          useExistingSession: true
        };
      } else {
        console.log('[SessionRestore] API вернул ошибку или пустые данные:', response);
        return {
          success: false,
          message: response.message || 'Не удалось восстановить сессию по guest_id'
        };
      }
    } catch (error) {
      console.error('[SessionRestore] Ошибка при восстановлении сессии:', error);
      return {
        success: false,
        message: `Ошибка при восстановлении сессии: ${(error as Error)?.message || 'Неизвестная ошибка'}`
      };
    }
  }
  
  /**
   * Делает запрос к API для проверки существования пользователя по guest_id
   * @param {string} guestId - Guest ID для проверки
   * @returns {Promise<any>} Ответ от API
   * @private
   */
  private async fetchUserByGuestId(guestId: string): Promise<any> {
    try {
      // Получаем реферальный код из URL, чтобы передать его при восстановлении сессии
      const refCode = referralService.getReferralCodeForRegistration();
      
      // Формируем параметры запроса с guest_id и, опционально, с реферальным кодом
      const params = new URLSearchParams({ guest_id: guestId });
      if (refCode) {
        params.append('ref_code', refCode);
      }
      
      // Делаем GET запрос с параметрами
      return await apiRequest(`/api/restore-session?${params.toString()}`);
    } catch (error) {
      console.error('[SessionRestore] Ошибка при запросе к API:', error);
      throw error;
    }
  }
  
  /**
   * Проверяет, нужно ли попытаться восстановить сессию
   * Возвращает true, если есть сохраненный guest_id и нет активной сессии
   * @returns {boolean} Нужно ли пытаться восстановить сессию
   */
  shouldAttemptRestore(): boolean {
    // Проверяем наличие guest_id
    const hasGuestId = GuestIdService.has();
    
    // Проверяем отсутствие активной сессии (кэшированных данных пользователя)
    const hasUserCache = !!localStorage.getItem('unifarm_user_data');
    
    // Логируем для диагностики
    console.log('[SessionRestore] Проверка необходимости восстановления сессии:', { 
      hasGuestId, 
      hasUserCache
    });
    
    // Восстанавливаем сессию, если есть guest_id и нет активной сессии
    return hasGuestId && !hasUserCache;
  }
}

// Экспортируем синглтон сервиса
export const sessionRestoreService = new SessionRestoreService();

export default sessionRestoreService;