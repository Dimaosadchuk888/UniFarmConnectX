import { apiRequest } from "@/lib/queryClient";
import { getTelegramUserData } from "@/services/telegramService";
import apiConfig from "@/config/apiConfig";
import { correctApiRequest } from "@/lib/correctApiRequest";

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
   * Регистрирует пользователя через Telegram Mini App
   * @returns {Promise<{success: boolean, data?: any}>} Результат операции и данные пользователя
   */
  async registerWithTelegram(): Promise<{success: boolean, data?: any}> {try {
      // Получаем данные Telegram пользователя
      const telegramData = getTelegramUserData();
      
      if (!telegramData?.id) {return {
          success: false
        };
      }
      
      const telegramUserId = telegramData.id;
      
      // Импортируем referralService для получения реферального кода
      const referralServiceModule = await import('./referralService');
      const referralService = referralServiceModule.default;

      // Получаем реферальный код из URL или локального хранилища
      const referralCode = referralService.getReferralCodeForRegistration();

      if (referralCode) {} else {}

      // Формируем полный URL для запроса
      const url = apiConfig.getFullUrl('/api/v2/airdrop/register');// Отправляем запрос на регистрацию через Telegram// correctApiRequest обрабатывает заголовки, преобразование JSON и анализ ответов автоматически
      const result = await correctApiRequest('/api/v2/users', 'POST', {
        telegram_id: telegramUserId,
        username: `telegram_user_${telegramUserId}`,
        refCode: referralCode
      });// Проверяем, есть ли данные пользователя в ответе
      if (result && result.data) {
        // Проверяем наличие реферального кода в ответе
        if (result.data.ref_code) {} else {}// Сохраняем данные пользователя в кэш
        this.cacheUserData(result.data);

        // Возвращаем успешный результат и данные
        return { 
          success: true, 
          data: result.data 
        };
      } else {return { 
          success: false,
          data: { error: 'Некорректный ответ сервера, отсутствуют данные пользователя' }
        };
      }
    } catch (error: any) {// correctApiRequest уже предоставляет структурированную ошибку
      return { 
        success: false, 
        data: { 
          error: error.message || 'Неизвестная ошибка при регистрации',
          details: error.details || error
        }
      };
    }
  }
  /**
   * Получает информацию о текущем пользователе с оптимизированной обработкой ошибок
   * @param {boolean} [forceReload=false] - Если true, игнорирует кэш и делает новый запрос
   * @returns {Promise<User>} Данные текущего пользователя
   * @throws {Error} Если не удалось получить данные пользователя
   */
  async getCurrentUser(forceReload: boolean = false): Promise<User> {try {
      // Шаг 1: Проверяем кэшированные данные пользователя, если не требуется принудительная перезагрузка
      if (!forceReload) {
        const cachedUserData = this.getCachedUserData();
        if (cachedUserData && this.isValidCachedData(cachedUserData)) {// Даже если используем кэш, делаем фоновый запрос для обновления данных
          this.refreshUserDataInBackground();

          return cachedUserData;
        }
      }

      // Шаг 2: Запрашиваем данные с сервераconst data = await this.fetchUserFromApi();

      // Лог успешного результатаreturn data;
    } catch (error) {// Шаг 3: Попытка восстановления из кэша в случае ошибки
      const cachedUserData = this.getCachedUserData();
      if (cachedUserData) {return cachedUserData;
      }

      // Шаг 4: В режиме разработки пробуем получить тестовые данные с сервера
      if (IS_DEV) {
        try {return await this.fetchDevUserFromApi();
        } catch (devError) {}
      }

      // Шаг 5: Если все предыдущие шаги не удались - пробрасываем ошибкуthrow new Error(`Failed to get user data: ${(error as Error)?.message || 'Unknown error'}`);
    }
  }

  /**
   * Выполняет запрос к API для получения данных пользователя через Telegram
   * @returns {Promise<User>} Данные пользователя из API
   * @private
   */
  private async fetchUserFromApi(): Promise<User> {
    // Получаем данные Telegram пользователя
    const telegramData = getTelegramUserData();
    
    if (!telegramData?.id) {
      throw new Error('Telegram User ID не найден');
    }// Проверяем состояние сессии в момент запроса
    if (sessionStorage.getItem('unifarm_telegram_ready') === 'true') {} else {}

    try {
      // Делаем запрос к API, используя correctApiRequest// Делаем запрос с user_id параметром
      const data = await correctApiRequest(`/api/v2/users/profile?user_id=${telegramData.id}`, 'GET');

      // Подробный лог для отладки// Если API не вернул данные, выдаем ошибку 
      if (!data || !data.success || !data.data) {throw new Error('Invalid response from server');
      }

      // Проверяем и фиксируем поля с типами данных, если это необходимо
      const userData = {
        ...data.data,
        id: Number(data.data.id),
        telegram_id: data.data.telegram_id !== undefined ? 
          (data.data.telegram_id === null ? null : Number(data.data.telegram_id)) : null,
        balance_uni: String(data.data.balance_uni || "0"),
        balance_ton: String(data.data.balance_ton || "0"),
        ref_code: String(data.data.ref_code || ""),
        guest_id: String(data.data.guest_id || "")
      };

      // Валидируем и кэшируем полученные данные
      if (this.isValidUserData(userData)) {
        this.cacheUserData(userData);
        return userData;
      } else {throw new Error('Invalid user data structure received from API');
      }
    } catch (error) {throw error;
    }
  }

  /**
   * Запрашивает данные пользователя в фоновом режиме для обновления кэша
   * @private
   */
  private async refreshUserDataInBackground(): Promise<void> {
    try {const data = await this.fetchUserFromApi();
      this.cacheUserData(data);} catch (error) {// Игнорируем ошибки, т.к. это фоновое обновление
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
      (typeof data.telegram_id === 'number' || typeof data.telegram_id === 'string' || data.telegram_id === null) &&
      typeof data.username === 'string' &&
      typeof data.balance_uni === 'string' &&
      typeof data.balance_ton === 'string' &&
      typeof data.ref_code === 'string' // Добавлена проверка на ref_code
    );

    // Подробный лог для отладки валидации данных
    if (!isValid && data) {}

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
   */
  cacheUserData(userData: User): void {
    try {
      // Добавляем метку времени для контроля актуальности кэша
      const dataToCache = {
        ...userData,
        _cacheTimestamp: Date.now()
      };

      localStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify(dataToCache));} catch (error) {}
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
    } catch (error) {return null;
    }
  }

  /**
   * Получает данные тестового пользователя в режиме разработки
   * @returns {Promise<User>} Данные тестового пользователя
   * @private
   */
  private async fetchDevUserFromApi(): Promise<User> {
    try {const devData = await correctApiRequest('/api/v2/users/1', 'GET');
      if (devData.success && devData.data && this.isValidUserData(devData.data)) {return devData.data;
      } else {
        throw new Error('Invalid dev user data structure');
      }
    } catch (error) {throw error;
    }
  }

  /**
   * Генерирует уникальный реферальный код для пользователя
   * @returns {Promise<string>} Сгенерированный реферальный код
   * @throws {Error} Если не удалось сгенерировать код
   */
  async generateRefCode(): Promise<string> {
    try {// Получаем текущие данные пользователя
      const currentUser = await this.getCurrentUser();

      // Проверяем, есть ли уже реферальный код
      if (currentUser.ref_code) {return currentUser.ref_code;
      }

      // Подготавливаем параметры запроса
      const requestData = {
        user_id: currentUser.id
      };

      // Делаем запрос к серверу для генерации кода с использованием correctApiRequestconst response = await correctApiRequest('/api/v2/users/generate-refcode', 'POST', requestData);

      if (response.success && response.data) {// Теперь response.data содержит полные данные пользователя с новым ref_code
        // Обновляем кэш пользователя
        this.cacheUserData(response.data);

        // Оповещаем UI о изменении данных пользователя
        window.dispatchEvent(new CustomEvent('user:updated', { detail: response.data }));

        // Возвращаем только реферальный код
        return response.data.ref_code;
      } else {throw new Error('Не удалось получить реферальный код');
      }
    } catch (error) {throw error;
    }
  }

  /**
   * Создает нового пользователя
   * @param userData Данные для создания пользователя
   * @returns Promise с результатом создания
   */
  async createUser(userData: {
    guestId?: string;
    telegramId?: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    refCode?: string;
  }): Promise<{success: boolean, data?: any, error?: string}> {
    try {const result = await correctApiRequest('/api/v2/users', 'POST', {
        guest_id: userData.guestId,
        telegram_id: userData.telegramId,
        username: userData.username || `user_${Date.now()}`,
        first_name: userData.firstName,
        last_name: userData.lastName,
        ref_code: userData.refCode
      });

      if (result.success && result.data) {// Кэшируем данные нового пользователя
        this.cacheUserData(result.data);
        
        return {
          success: true,
          data: result.data
        };
      } else {return {
          success: false,
          error: result.error || 'Failed to create user'
        };
      }
    } catch (error) {return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Очищает кэш данных пользователя
   */
  clearUserCache(): void {
    localStorage.removeItem(USER_DATA_STORAGE_KEY);
    // Для обратной совместимости удаляем и по старому ключу
    localStorage.removeItem('unifarm_user_id');}

  /**
   * Проверяет наличие реального пользовательского ID
   * @returns {Promise<boolean>} True если есть реальный ID пользователя
   */
  async hasRealUserId(): Promise<boolean> {try {
      // С Этапа 10.3 Telegram WebApp больше не используется// Этап 10.4: Удалены проверки Telegram ID - больше не поддерживаются// Всегда переходим к проверке данных пользователя

      // Шаг 3: Проверка кэшированных данных пользователя
      const cachedData = this.getCachedUserData();
      if (cachedData && cachedData.id > 0 && cachedData.id !== 1) {
        return true;
      } else if (cachedData) {
        console.log('Cached data exists but ID is invalid:', cachedData.id);
      } else {
        console.log('No cached user data found');
      }

      // Шаг 4: Пробуем получить данные с сервера
      try {
        const userData = await this.fetchUserFromApi();
        const isValid = userData && userData.id > 0 && userData.id !== 1;

        if (isValid) {
          return true;
        } else {
          return false;
        }
      } catch (error) {
        return false;
      }
    } catch (error) {
      return false;
    }
  }
}

export default new UserService();

