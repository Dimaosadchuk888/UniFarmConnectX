/**
 * Базовый API клиент
 */
import { API_CONFIG } from '../config';
import type { User, ApiResponse } from '../types';

class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}/api${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[ApiClient] Request failed:`, error);
      throw error;
    }
  }

  // Пользователи
  async getCurrentUser(): Promise<User> {
    return this.request<User>('/me');
  }

  async createUser(userData: Partial<User>): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  }

  // Миссии
  async getMissions(): Promise<any[]> {
    return this.request<any[]>('/missions');
  }

  async getUserMissions(): Promise<any[]> {
    return this.request<any[]>('/user-missions');
  }

  // Транзакции
  async getTransactions(): Promise<any[]> {
    return this.request<any[]>('/transactions');
  }

  // Рефералы
  async getReferrals(): Promise<any[]> {
    return this.request<any[]>('/referrals');
  }
}

export const apiClient = new ApiClient();
export default apiClient;