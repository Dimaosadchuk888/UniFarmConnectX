/**
 * Интерфейс пользователя, возвращаемый API
 */
export interface User {
  id: number;
  telegram_id: number | null;
  username: string;
  balance_uni: string;
  balance_ton: string;
  ref_code: string; // Реферальный код пользователя всегда должен быть определен
  guest_id: string; // Идентификатор гостя
  created_at?: string;
  parent_ref_code?: string | null;
}

/**
 * Интерфейс ошибки, который может вернуть API
 */
export interface ApiError {
  hasError: boolean;
  message: string;
  code?: string;
  details?: any;
}

/**
 * Ключ для хранения данных пользователя в localStorage
 */
const USER_CACHE_KEY = 'unifarm_user_cache';

/**
 * Определяем, находимся ли мы в режиме разработки
 */
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('replit');

/**
 * Максимальное время хранения кэша пользователя (1 час)
 */
const CACHE_EXPIRATION = 60 * 60 * 1000; // 1 час в миллисекундах

/**
 * Класс для работы с API запросами, связанными с пользователями
 */
class UserService {
  /**
   * Получает информацию о текущем пользователе с оптимизированной обработкой ошибок
   * @param {boolean} [forceReload=false] - Если true, игнорирует кэш и делает новый запрос
   * @returns {Promise<User>} Данные текущего пользователя
   * @throws {Error} Если не удалось получить данные пользователя
   */
  async getCurrentUser(forceReload: boolean = false): Promise<User> {
    console.log('[UserService] Starting getCurrentUser, forceReload:', forceReload);
    
    // Если не требуется принудительная перезагрузка, проверяем кэш
    if (!forceReload) {
      const cachedData = this.getCachedUserData();
      if (cachedData && this.isValidCachedData(cachedData)) {
        console.log('[UserService] Using cached user data');
        // Запускаем обновление в фоне для свежести данных
        this.refreshUserDataInBackground();
        return cachedData;
      }
    }

    try {
      console.log('[UserService] Requesting user data from API');
      const userData = await this.fetchUserFromApi();
      return userData;
    } catch (error) {
      console.error('[UserService] Error fetching current user:', error);
      
      // Если запрос не удался, пробуем использовать кэшированные данные
      const cachedData = this.getCachedUserData();
      if (cachedData) {
        console.warn('[UserService] Using cached data as fallback');
        return cachedData;
      }
      
      console.error('[UserService] All recovery methods failed');
      throw new Error('Failed to get user data: ' + (error as Error).message);
    }
  }

  /**
   * Выполняет запрос к API для получения данных пользователя
   * @returns {Promise<User>} Данные пользователя из API
   * @private
   */
  private async fetchUserFromApi(): Promise<User> {
    try {
      // Получаем guest_id из localStorage
      const guestId = localStorage.getItem('unifarm_guest_id') || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (!localStorage.getItem('unifarm_guest_id')) {
        localStorage.setItem('unifarm_guest_id', guestId);
      }
      
      console.log('[UserService] Запрос к API с guest_id:', guestId);

      // Выполняем запрос с guest_id
      const response = await fetch('/api/v2/users/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-ID': guestId,
          'Authorization': `Bearer ${localStorage.getItem('unifarm_jwt_token') || ''}`
        }
      });

      const data = await response.json();

      console.log('[UserService] API response raw data:', data);

      // Если API не вернул данные, выдаем ошибку 
      if (!data || !data.success || !data.data) {
        console.error('[UserService] Invalid API response from server:', data);
        throw new Error('Invalid response from server');
      }

      // ИСПРАВЛЕНИЕ: API возвращает {data: {user: {...}}} - используем только данные из user объекта
      if (!data.data.user) {
        console.error('[UserService] No user object in API response:', data);
        throw new Error('No user data in API response');
      }

      const userInfo = data.data.user;
      console.log('[UserService] Extracting user data from user object:', userInfo);
      
      // Определяем реальные значения
      const realId = userInfo.id ? Number(userInfo.id) : (userInfo.telegram_id ? Number(userInfo.telegram_id) : 43);
      const realRefCode = userInfo.ref_code || "";
      
      console.log('[UserService] Processing ref_code:', {
        original: userInfo.ref_code,
        processed: realRefCode,
        length: realRefCode.length
      });
      
      const userData: User = {
        id: realId,
        telegram_id: userInfo.telegram_id !== undefined ? 
          (userInfo.telegram_id === null ? null : Number(userInfo.telegram_id)) : null,
        username: String(userInfo.username || ""),
        balance_uni: String(userInfo.balance_uni || userInfo.uni_balance || "0"),
        balance_ton: String(userInfo.balance_ton || userInfo.ton_balance || "0"),
        ref_code: realRefCode,
        guest_id: String(userInfo.guest_id || guestId),
        created_at: String(userInfo.created_at || "")
      };

      console.log('[UserService] Created userData structure:', userData);
      console.log('[UserService] Final ref_code check:', userData.ref_code, 'length:', userData.ref_code.length);

      // Валидируем и кэшируем полученные данные
      if (this.isValidUserData(userData)) {
        this.cacheUserData(userData);
        return userData;
      } else {
        console.error('[UserService] Data validation failed:', userData);
        throw new Error('Invalid user data structure received from API');
      }
    } catch (error) {
      console.error('[UserService] Error in fetchUserFromApi:', error);
      throw error;
    }
  }

  /**
   * Проверяет валидность структуры данных пользователя
   * @param data Данные пользователя для проверки
   * @returns {boolean} True если данные валидны, false в противном случае
   * @private
   */
  private isValidUserData(data: any): data is User {
    const isValid = (
      data &&
      typeof data.id === 'number' &&
      data.id >= 0 && // Изменено: разрешаем id = 0, главное чтобы есть telegram_id
      (typeof data.telegram_id === 'number' || data.telegram_id === null) &&
      typeof data.username === 'string' &&
      typeof data.balance_uni === 'string' &&
      typeof data.balance_ton === 'string' &&
      typeof data.ref_code === 'string' &&
      data.ref_code.length >= 0 // ref_code может быть пустой строкой для новых пользователей
    );

    // Подробный лог для отладки валидации данных
    if (!isValid && data) {
      console.warn('[UserService] Invalid user data structure:', {
        hasId: typeof data.id === 'number',
        idIsPositive: data.id >= 0, // Обновлено: проверяем >= 0
        hasTelegramId: typeof data.telegram_id === 'number' || data.telegram_id === null,
        telegramIdValue: data.telegram_id,
        hasUsername: typeof data.username === 'string',
        hasBalanceUni: typeof data.balance_uni === 'string',
        hasBalanceTon: typeof data.balance_ton === 'string',
        hasRefCode: typeof data.ref_code === 'string',
        refCodeValue: data.ref_code || 'missing',
        refCodeLength: data.ref_code ? data.ref_code.length : 0,
        rawData: data
      });
    }

    return isValid;
  }

  /**
   * Запрашивает данные пользователя в фоновом режиме для обновления кэша
   * @private
   */
  private async refreshUserDataInBackground(): Promise<void> {
    try {
      const freshData = await this.fetchUserFromApi();
      this.cacheUserData(freshData);
      console.log('[UserService] Background refresh completed');
    } catch (error) {
      console.warn('[UserService] Background refresh failed:', error);
    }
  }

  /**
   * Проверяет актуальность кэшированных данных
   * @param data Кэшированные данные пользователя
   * @returns {boolean} True если данные актуальны, false в противном случае
   * @private
   */
  private isValidCachedData(data: any): boolean {
    if (!data || !data.timestamp) return false;
    
    const now = Date.now();
    const dataAge = now - data.timestamp;
    
    return dataAge < CACHE_EXPIRATION && this.isValidUserData(data.userData);
  }

  /**
   * Сохраняет данные пользователя в кэш
   * @param userData Данные пользователя для кэширования
   */
  cacheUserData(userData: User): void {
    try {
      const cacheData = {
        userData,
        timestamp: Date.now()
      };
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cacheData));
      console.log('[UserService] User data cached successfully');
    } catch (error) {
      console.warn('[UserService] Failed to cache user data:', error);
    }
  }

  /**
   * Получает кэшированные данные пользователя
   * @returns {User | null} Кэшированные данные пользователя или null
   * @private
   */
  private getCachedUserData(): User | null {
    try {
      const cachedRaw = localStorage.getItem(USER_CACHE_KEY);
      if (!cachedRaw) return null;

      const cached = JSON.parse(cachedRaw);
      return cached.userData || null;
    } catch (error) {
      console.warn('[UserService] Failed to parse cached data:', error);
      return null;
    }
  }

  /**
   * Очищает кэш данных пользователя
   */
  clearUserCache(): void {
    try {
      localStorage.removeItem(USER_CACHE_KEY);
      console.log('[UserService] User cache cleared');
    } catch (error) {
      console.warn('[UserService] Failed to clear user cache:', error);
    }
  }

  /**
   * Проверяет наличие реального пользовательского ID
   * @returns {Promise<boolean>} True если есть реальный ID пользователя
   */
  async hasRealUserId(): Promise<boolean> {
    try {
      const userData = await this.getCurrentUser();
      return userData.id > 0 && userData.telegram_id !== null;
    } catch {
      return false;
    }
  }
}

export const userService = new UserService();

/**
 * Получает пользователя по guest_id с поддержкой fallback режима
 */
export async function getUserByGuestId(guestId: string): Promise<any> {
  try {
    const response = await fetch(`/api/v2/users/guest/${guestId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.success && data.data) {
      return data.data;
    } else {
      throw new Error(data.message || 'Failed to get user data');
    }
  } catch (error) {
    console.error('[UserService] Error getting user by guest ID:', error);
    throw error;
  }
}

export default userService;