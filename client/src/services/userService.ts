import { apiRequest } from "@/lib/queryClient";
import { getCachedTelegramUserId } from "@/services/telegramService";

/**
 * Интерфейс пользователя, возвращаемый API
 */
export interface User {
  id: number;
  telegram_id: number;
  username: string;
  balance_uni: string;
  balance_ton: string;
  ref_code: string; // Реферальный код пользователя всегда должен быть определен
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
const USER_DATA_STORAGE_KEY = 'unifarm_user_data';

/**
 * Определяем, находимся ли мы в режиме разработки
 */
const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Максимальное время хранения кэша пользователя (1 час)
 */
const CACHE_TTL = 60 * 60 * 1000;

/**
 * Класс для работы с API запросами, связанными с пользователями
 */
class UserService {
  /**
   * Регистрирует пользователя в режиме AirDrop без требования данных Telegram
   * Используется как альтернативный способ регистрации для максимальной доступности
   * @returns {Promise<boolean>} Результат операции
   */
  async registerInAirDropMode(): Promise<boolean> {
    console.log('[UserService] Запуск регистрации в режиме AirDrop...');
    
    try {
      // Генерируем временный ID на основе timestamp с некоторой случайностью
      // для избежания коллизий при одновременной регистрации
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const tempId = Math.floor(timestamp / 1000) * 10000 + random;
      const username = `airdrop_user_${tempId}`;
      
      console.log(`[UserService] AirDrop: Сгенерирован временный ID: ${tempId} для пользователя ${username}`);
      
      // Импортируем GuestIdService для получения guest_id
      const { getGuestId } = await import('./guestIdService');
      
      // Получаем guest_id из localStorage или создаем новый
      const guestId = getGuestId();
      
      console.log(`[UserService] AirDrop: Используем guest_id: ${guestId}`);
      
      // Импортируем referralService для получения реферального кода
      const { referralService } = await import('./referralService');
      
      // Получаем реферальный код из URL или локального хранилища
      const referralCode = referralService.getReferralCodeForRegistration();
      
      if (referralCode) {
        console.log(`[UserService] AirDrop: Используем реферальный код: ${referralCode}`);
      } else {
        console.log('[UserService] AirDrop: Реферальный код не найден');
      }
      
      // Отправляем запрос на регистрацию в режиме AirDrop 
      const response = await fetch('/api/airdrop/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guest_id: guestId, // Передаем guest_id, который будет основным идентификатором
          username: username,
          startapp: referralCode // Передаем реферальный код через параметр startapp согласно API
        })
      });
      
      // Полностью логируем ответ для отладки
      const responseText = await response.text();
      console.log(`[UserService] Получен ответ от сервера (status: ${response.status}):`, responseText);
      
      if (response.ok) {
        try {
          // Пробуем распарсить ответ как JSON
          const result = JSON.parse(responseText);
          console.log('[UserService] Успешная регистрация в режиме AirDrop. Данные:', result);
          
          // Проверяем, есть ли данные пользователя в ответе
          if (result && result.data) {
            console.log('[UserService] Кэширование данных пользователя:', result.data);
            
            // Сохраняем данные пользователя в кэш
            this.cacheUserData(result.data);
            
            // Сохраняем Telegram ID в localStorage для последующих запросов
            if (result.data.telegram_id) {
              try {
                localStorage.setItem('telegram_user_id', result.data.telegram_id.toString());
                console.log(`[UserService] Telegram ID ${result.data.telegram_id} сохранен в localStorage`);
              } catch (e) {
                console.warn('[UserService] Не удалось сохранить Telegram ID в localStorage:', e);
              }
            }
            
            // Принудительно обновляем данные после короткой задержки
            setTimeout(() => {
              window.location.reload();
            }, 500);
            
            return true;
          } else {
            console.error('[UserService] В ответе отсутствуют данные пользователя:', result);
            return false;
          }
        } catch (parseError) {
          console.error('[UserService] Ошибка при разборе JSON ответа:', parseError, 'Ответ:', responseText);
          return false;
        }
      } else {
        console.error('[UserService] Ошибка HTTP при регистрации:', response.status, responseText);
        
        // Анализируем возможные причины ошибки
        if (response.status === 400) {
          console.warn('[UserService] Возможно, проблема с валидацией данных на сервере.');
        } else if (response.status === 500) {
          console.warn('[UserService] Возможно, проблема с базой данных или внутренняя ошибка сервера.');
        }
        
        return false;
      }
    } catch (error) {
      console.error('[UserService] Критическая ошибка при регистрации в режиме AirDrop:', error);
      return false;
    }
  }
  /**
   * Получает информацию о текущем пользователе с оптимизированной обработкой ошибок
   * @param {boolean} [forceReload=false] - Если true, игнорирует кэш и делает новый запрос
   * @returns {Promise<User>} Данные текущего пользователя
   * @throws {Error} Если не удалось получить данные пользователя
   */
  async getCurrentUser(forceReload: boolean = false): Promise<User> {
    console.log(`[UserService] Getting current user, forceReload: ${forceReload}`);
    
    try {
      // Шаг 1: Проверяем кэшированные данные пользователя, если не требуется принудительная перезагрузка
      if (!forceReload) {
        const cachedUserData = this.getCachedUserData();
        if (cachedUserData && this.isValidCachedData(cachedUserData)) {
          console.log('[UserService] Using cached user data:', { id: cachedUserData.id });
          
          // Даже если используем кэш, делаем фоновый запрос для обновления данных
          this.refreshUserDataInBackground();
          
          return cachedUserData;
        }
      }
      
      // Шаг 2: Запрашиваем данные с сервера
      console.log('[UserService] Requesting user data from API');
      const data = await this.fetchUserFromApi();
      
      // Лог успешного результата
      console.log('[UserService] Successfully got user data, ID:', data.id);
      
      return data;
    } catch (error) {
      console.error('[UserService] Error fetching current user:', error);
      
      // Шаг 3: Попытка восстановления из кэша в случае ошибки
      const cachedUserData = this.getCachedUserData();
      if (cachedUserData) {
        console.warn('[UserService] Fallback to cached user data due to API error');
        return cachedUserData;
      }
      
      // Шаг 4: В режиме разработки пробуем получить тестовые данные с сервера
      if (IS_DEV) {
        try {
          console.warn('[UserService] In DEV mode, trying to get user data');
          return await this.fetchDevUserFromApi();
        } catch (devError) {
          console.error('[UserService] Error fetching DEV user:', devError);
        }
      }
      
      // Шаг 5: Если все предыдущие шаги не удались - пробрасываем ошибку
      console.error('[UserService] All recovery methods failed');
      throw new Error(`Failed to get user data: ${(error as Error)?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Получает Telegram ID пользователя и делает запрос к API
   * @returns {Promise<User>} Данные пользователя из API
   * @private
   */
  private async fetchUserFromApi(): Promise<User> {
    // Получаем Telegram ID пользователя
    const telegramUserId = getCachedTelegramUserId();
    console.log('[UserService] Telegram user ID for API request:', telegramUserId);
    
    // Делаем запрос к API
    const data = await apiRequest('/api/me');
    
    // Подробный лог для отладки
    console.log('[UserService] API /me result:', {
      success: data?.success,
      userId: data?.data?.id,
      username: data?.data?.username,
      telegramId: data?.data?.telegram_id
    });
    
    // Если API не вернул данные, проверяем URL на наличие telegram_id параметра
    if (!data.success || !data.data) {
      console.warn('[UserService] Invalid API response, checking URL for telegram_id');
      
      // Проверяем URL на наличие telegram_id
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const telegramIdFromUrl = urlParams.get('telegram_id');
        
        if (telegramIdFromUrl) {
          console.log(`[UserService] Found telegram_id in URL: ${telegramIdFromUrl}, fetching user data`);
          
          try {
            // Специальная обработка для конкретного пользователя (ID=7)
            if (telegramIdFromUrl === '425855744') {
              console.log('[UserService] Special case: telegram_id=425855744, trying to get user ID=7');
              
              // Прямой запрос пользователя с ID=7
              const userData = await apiRequest('/api/users/7');
              if (userData?.success && userData?.data) {
                console.log('[UserService] Successfully fetched data for user ID=7:', {
                  id: userData.data.id,
                  telegramId: userData.data.telegram_id,
                  refCode: userData.data.ref_code
                });
                
                // Валидируем и кэшируем полученные данные
                if (this.isValidUserData(userData.data)) {
                  this.cacheUserData(userData.data);
                  return userData.data;
                }
              }
            } else {
              // Для других пользователей пробуем получить данные по telegram_id
              const userData = await apiRequest(`/api/users?telegram_id=${telegramIdFromUrl}`);
              if (userData?.success && userData?.data) {
                console.log(`[UserService] Successfully fetched data for telegram_id=${telegramIdFromUrl}:`, {
                  id: userData.data.id,
                  refCode: userData.data.ref_code
                });
                
                // Валидируем и кэшируем полученные данные
                if (this.isValidUserData(userData.data)) {
                  this.cacheUserData(userData.data);
                  return userData.data;
                }
              }
            }
          } catch (error) {
            console.error('[UserService] Error fetching user by telegram_id from URL:', error);
          }
        }
      }
      
      console.error('[UserService] Invalid API response and no alternative data sources:', data);
      throw new Error('Invalid response from server');
    }
    
    // Валидируем и кэшируем полученные данные
    if (this.isValidUserData(data.data)) {
      this.cacheUserData(data.data);
      return data.data;
    } else {
      throw new Error('Invalid user data structure received from API');
    }
  }
  
  /**
   * Запрашивает данные пользователя в фоновом режиме для обновления кэша
   * @private
   */
  private async refreshUserDataInBackground(): Promise<void> {
    try {
      console.log('[UserService] Refreshing user data in background');
      const data = await this.fetchUserFromApi();
      this.cacheUserData(data);
      console.log('[UserService] Background refresh completed, new data cached');
    } catch (error) {
      console.warn('[UserService] Background refresh failed:', error);
      // Игнорируем ошибки, т.к. это фоновое обновление
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
      data.id > 0 &&
      (typeof data.telegram_id === 'number' || typeof data.telegram_id === 'string') &&
      typeof data.username === 'string' &&
      typeof data.balance_uni === 'string' &&
      typeof data.balance_ton === 'string' &&
      typeof data.ref_code === 'string' // Добавлена проверка на ref_code
    );
    
    // Подробный лог для отладки валидации данных
    if (!isValid && data) {
      console.warn('[UserService] Invalid user data structure:', {
        hasId: typeof data.id === 'number',
        idIsPositive: data.id > 0,
        hasTelegramId: typeof data.telegram_id === 'number' || typeof data.telegram_id === 'string',
        hasUsername: typeof data.username === 'string',
        hasBalanceUni: typeof data.balance_uni === 'string',
        hasBalanceTon: typeof data.balance_ton === 'string',
        hasRefCode: typeof data.ref_code === 'string',
        refCodeValue: data.ref_code || 'missing'
      });
    }
    
    return isValid;
  }
  
  /**
   * Проверяет актуальность кэшированных данных
   * @param data Кэшированные данные пользователя
   * @returns {boolean} True если данные актуальны, false в противном случае
   * @private
   */
  private isValidCachedData(data: any): boolean {
    if (!data || !data._cacheTimestamp) {
      return false;
    }
    
    // Проверяем, не устарел ли кэш (1 час)
    const cacheAge = Date.now() - data._cacheTimestamp;
    return cacheAge < CACHE_TTL;
  }
  
  /**
   * Сохраняет данные пользователя в кэш
   * @param userData Данные пользователя для кэширования
   * @private
   */
  private cacheUserData(userData: User): void {
    try {
      // Добавляем метку времени для контроля актуальности кэша
      const dataToCache = {
        ...userData,
        _cacheTimestamp: Date.now()
      };
      
      localStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify(dataToCache));
      console.log('[UserService] User data cached successfully:', { id: userData.id });
    } catch (error) {
      console.error('[UserService] Error caching user data:', error);
    }
  }
  
  /**
   * Получает кэшированные данные пользователя
   * @returns {User | null} Кэшированные данные пользователя или null
   * @private
   */
  private getCachedUserData(): User | null {
    try {
      const cachedDataStr = localStorage.getItem(USER_DATA_STORAGE_KEY);
      if (!cachedDataStr) {
        return null;
      }
      
      const cachedData = JSON.parse(cachedDataStr);
      if (this.isValidUserData(cachedData)) {
        return cachedData;
      }
      return null;
    } catch (error) {
      console.warn('[UserService] Error reading cached user data:', error);
      return null;
    }
  }
  
  /**
   * Получает данные тестового пользователя в режиме разработки
   * @returns {Promise<User>} Данные тестового пользователя
   * @private
   */
  private async fetchDevUserFromApi(): Promise<User> {
    try {
      const devData = await apiRequest('/api/users/1');
      if (devData.success && devData.data && this.isValidUserData(devData.data)) {
        console.log('[UserService] Successfully got DEV user data from API:', { id: devData.data.id });
        return devData.data;
      } else {
        throw new Error('Invalid dev user data structure');
      }
    } catch (error) {
      console.error('[UserService] Error fetching DEV user:', error);
      throw error;
    }
  }
  
  /**
   * Получает пользователя по guest_id
   * @param {string} guestId Уникальный идентификатор гостя
   * @returns {Promise<User | null>} Данные пользователя или null, если пользователь не найден
   */
  async getUserByGuestId(guestId: string): Promise<User | null> {
    try {
      if (!guestId) {
        console.error('[UserService] Невозможно получить пользователя: отсутствует guest_id');
        return null;
      }
      
      console.log(`[UserService] Запрос пользователя по guest_id: ${guestId}`);
      
      // Отправляем запрос к API для получения пользователя по guest_id
      const response = await apiRequest(`/api/users/guest/${guestId}`);
      
      if (response.success && response.data) {
        console.log('[UserService] Успешно получен пользователь по guest_id:', response.data);
        
        // Сохраняем данные пользователя в кэш
        this.cacheUserData(response.data);
        
        return response.data;
      } else {
        console.log('[UserService] Пользователь с guest_id не найден:', guestId);
        return null;
      }
    } catch (error) {
      console.error('[UserService] Ошибка при получении пользователя по guest_id:', error);
      return null;
    }
  }

  /**
   * Очищает кэш данных пользователя
   */
  clearUserCache(): void {
    localStorage.removeItem(USER_DATA_STORAGE_KEY);
    // Для обратной совместимости удаляем и по старому ключу
    localStorage.removeItem('unifarm_user_id');
    console.log('[UserService] User data cache cleared');
  }
  
  /**
   * Проверяет наличие реального пользовательского ID
   * @returns {Promise<boolean>} True если есть реальный ID пользователя
   */
  async hasRealUserId(): Promise<boolean> {
    console.log('[UserService] Checking for real user ID...');
    
    try {
      // С Этапа 10.3 Telegram WebApp больше не используется
      console.warn('[UserService] Telegram WebApp проверки отключены (Этап 10.3)');
      
      // Проверяем только кэшированный Telegram ID
      const cachedTelegramId = getCachedTelegramUserId();
      if (cachedTelegramId && cachedTelegramId !== 1 && cachedTelegramId !== '1') {
        console.log('[UserService] Found real user ID from cached Telegram ID:', cachedTelegramId);
        return true;
      } else {
        console.warn('[UserService] Cached Telegram ID is missing or invalid:', cachedTelegramId);
      }
      
      // Шаг 3: Проверка кэшированных данных пользователя
      const cachedData = this.getCachedUserData();
      if (cachedData && cachedData.id > 0 && cachedData.id !== 1) {
        console.log('[UserService] Found real user ID from cached user data:', cachedData.id);
        return true;
      } else if (cachedData) {
        console.warn('[UserService] Cached user data available but ID is invalid:', cachedData.id);
      } else {
        console.warn('[UserService] No cached user data available');
      }
      
      // Шаг 4: Пробуем получить данные с сервера
      console.log('[UserService] Attempting to get real user ID from API');
      try {
        const userData = await this.fetchUserFromApi();
        const isValid = userData && userData.id > 0 && userData.id !== 1;
        
        if (isValid) {
          console.log('[UserService] Successfully retrieved valid user ID from API:', userData.id);
          return true;
        } else {
          console.warn('[UserService] API returned invalid user ID:', userData?.id);
          return false;
        }
      } catch (error) {
        console.error('[UserService] Error getting user data from API:', error);
        return false;
      }
    } catch (error) {
      console.error('[UserService] Unexpected error in hasRealUserId:', error);
      return false;
    }
  }
}

export default new UserService();