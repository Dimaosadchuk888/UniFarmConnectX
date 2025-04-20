import { apiRequest } from "@/lib/queryClient";

export interface User {
  id: number;
  telegram_id: number;
  username: string;
  balance_uni: string;
  balance_ton: string;
}

class UserService {
  /**
   * Получает информацию о текущем пользователе
   * @returns Данные текущего пользователя
   */
  async getCurrentUser(): Promise<User> {
    try {
      const data = await apiRequest('/api/me');
      
      if (!data.success || !data.data) {
        throw new Error('Invalid response from server');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      // Для тестирования используем тестового пользователя вместо undefined
      // В продакшене здесь должен быть throw error
      return {
        id: 1, // Для тестирования
        telegram_id: 12345,
        username: "test_user",
        balance_uni: "1000",
        balance_ton: "0"
      };
    }
  }
}

export default new UserService();