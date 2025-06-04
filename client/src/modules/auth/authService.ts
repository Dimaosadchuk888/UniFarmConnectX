/**
 * Интегрированный сервис аутентификации
 * Связывает фронтенд модуль с бекенд API
 */
import { apiClient } from '../../core/api';
import type { User, InsertUser } from '../../core/types';

export interface AuthResponse {
  success: boolean;
  data?: User;
  message?: string;
  token?: string;
}

export interface LoginRequest {
  telegram_id?: number;
  guest_id?: string;
  username?: string;
}

export class AuthService {
  /**
   * Аутентификация пользователя через Telegram
   */
  static async loginWithTelegram(telegramData: {
    id: number;
    username?: string;
    first_name: string;
    last_name?: string;
  }): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/api/v2/auth/telegram', {
        telegram_id: telegramData.id,
        username: telegramData.username,
        first_name: telegramData.first_name,
        last_name: telegramData.last_name
      });
      
      return response;
    } catch (error) {
      console.error('[AuthService] Telegram login error:', error);
      return {
        success: false,
        message: 'Ошибка входа через Telegram'
      };
    }
  }

  /**
   * Гостевая аутентификация
   */
  static async loginAsGuest(guestId: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/api/v2/auth/guest', {
        guest_id: guestId
      });
      
      return response;
    } catch (error) {
      console.error('[AuthService] Guest login error:', error);
      return {
        success: false,
        message: 'Ошибка гостевого входа'
      };
    }
  }

  /**
   * Проверка токена аутентификации
   */
  static async verifyToken(token: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/api/v2/auth/verify', {
        token
      });
      
      return response;
    } catch (error) {
      console.error('[AuthService] Token verification error:', error);
      return {
        success: false,
        message: 'Недействительный токен'
      };
    }
  }

  /**
   * Выход из системы
   */
  static async logout(): Promise<{ success: boolean; message?: string }> {
    try {
      await apiClient.post('/api/v2/auth/logout');
      
      // Очищаем локальное хранилище
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Logout error:', error);
      return {
        success: false,
        message: 'Ошибка при выходе'
      };
    }
  }

  /**
   * Обновление профиля пользователя
   */
  static async updateProfile(updates: Partial<User>): Promise<AuthResponse> {
    try {
      const response = await apiClient.patch<AuthResponse>('/api/v2/auth/profile', updates);
      
      return response;
    } catch (error) {
      console.error('[AuthService] Profile update error:', error);
      return {
        success: false,
        message: 'Ошибка обновления профиля'
      };
    }
  }

  /**
   * Получение текущего пользователя
   */
  static async getCurrentUser(): Promise<AuthResponse> {
    try {
      const response = await apiClient.get<AuthResponse>('/api/v2/auth/me');
      
      return response;
    } catch (error) {
      console.error('[AuthService] Get current user error:', error);
      return {
        success: false,
        message: 'Ошибка получения данных пользователя'
      };
    }
  }
}