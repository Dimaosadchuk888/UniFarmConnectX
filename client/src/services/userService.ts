import { apiRequest } from "@/lib/queryClient";

export interface User {
  id: number;
  telegram_id: number;
  username: string;
  balance_uni: string;
  balance_ton: string;
}

// Ключ для хранения userId в localStorage
const USER_ID_STORAGE_KEY = 'unifarm_user_id';

// Определяем, находимся ли мы в режиме разработки
const IS_DEV = process.env.NODE_ENV === 'development';

class UserService {
  /**
   * Получает информацию о текущем пользователе
   * @returns Данные текущего пользователя или выбрасывает ошибку
   */
  async getCurrentUser(): Promise<User> {
    try {
      // Проверяем наличие кешированного userId в localStorage
      const cachedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
      
      // Если есть кешированный userId и это не режим разработки, используем его
      if (cachedUserId && !IS_DEV) {
        console.log('[UserService] Using cached userId:', cachedUserId);
        
        // Все равно делаем запрос для получения актуальных данных
        try {
          const data = await apiRequest('/api/me');
          if (data.success && data.data) {
            // Обновляем кеш, если ID изменился
            if (data.data.id.toString() !== cachedUserId) {
              localStorage.setItem(USER_ID_STORAGE_KEY, data.data.id.toString());
            }
            return data.data;
          }
        } catch (apiError) {
          console.warn('[UserService] Failed to refresh user data, using cached ID', apiError);
          // Если запрос не удался, но у нас есть кешированный ID, создаем минимальный объект
          return {
            id: parseInt(cachedUserId),
            telegram_id: 0, // Неизвестно
            username: "user",
            balance_uni: "0",
            balance_ton: "0"
          };
        }
      }
      
      // Делаем запрос к API
      const data = await apiRequest('/api/me');
      
      if (!data.success || !data.data) {
        throw new Error('Invalid response from server');
      }
      
      // Кешируем полученный userId
      localStorage.setItem(USER_ID_STORAGE_KEY, data.data.id.toString());
      
      return data.data;
    } catch (error) {
      console.error('[UserService] Error fetching current user:', error);
      
      // В режиме разработки можно использовать тестовые данные
      if (IS_DEV) {
        console.warn('[UserService] Using development test user data');
        return {
          id: 1984, // Тестовый ID только для разработки
          telegram_id: 12345,
          username: "dev_test_user",
          balance_uni: "1000",
          balance_ton: "0"
        };
      }
      
      // В production режиме пробрасываем ошибку
      throw error;
    }
  }
  
  /**
   * Очищает кешированный userId
   */
  clearUserCache(): void {
    localStorage.removeItem(USER_ID_STORAGE_KEY);
  }
}

export default new UserService();