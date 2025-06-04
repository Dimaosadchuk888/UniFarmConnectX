/**
 * Интегрированный сервис фарминга
 * Связывает фронтенд модуль с бекенд API
 */
import { apiClient } from '../../core/api';
import type { User } from '../../core/types';

export interface FarmingStats {
  isActive: boolean;
  depositAmount: string;
  currentBalance: string;
  ratePerSecond: string;
  totalRatePerSecond: string;
  dailyIncome: string;
  startDate: string | null;
  lastUpdate: string | null;
  nextClaimTime?: string;
}

export interface FarmingResponse {
  success: boolean;
  data?: FarmingStats;
  message?: string;
}

export interface DepositRequest {
  amount: string;
  token_type: 'UNI' | 'TON';
}

export class FarmingService {
  /**
   * Получить статистику UNI фарминга
   */
  static async getUniFarmingStats(userId: number): Promise<FarmingResponse> {
    try {
      const response = await apiClient.get<FarmingResponse>(`/api/v2/farming/uni/stats/${userId}`);
      return response;
    } catch (error) {
      console.error('[FarmingService] UNI farming stats error:', error);
      return {
        success: false,
        message: 'Ошибка получения статистики UNI фарминга'
      };
    }
  }

  /**
   * Получить статистику TON фарминга
   */
  static async getTonFarmingStats(userId: number): Promise<FarmingResponse> {
    try {
      const response = await apiClient.get<FarmingResponse>(`/api/v2/farming/ton/stats/${userId}`);
      return response;
    } catch (error) {
      console.error('[FarmingService] TON farming stats error:', error);
      return {
        success: false,
        message: 'Ошибка получения статистики TON фарминга'
      };
    }
  }

  /**
   * Создать депозит для фарминга
   */
  static async createDeposit(userId: number, depositData: DepositRequest): Promise<FarmingResponse> {
    try {
      const response = await apiClient.post<FarmingResponse>(`/api/v2/farming/deposit`, {
        user_id: userId,
        ...depositData
      });
      return response;
    } catch (error) {
      console.error('[FarmingService] Create deposit error:', error);
      return {
        success: false,
        message: 'Ошибка создания депозита'
      };
    }
  }

  /**
   * Собрать награды фарминга
   */
  static async claimRewards(userId: number, tokenType: 'UNI' | 'TON'): Promise<FarmingResponse> {
    try {
      const response = await apiClient.post<FarmingResponse>(`/api/v2/farming/claim`, {
        user_id: userId,
        token_type: tokenType
      });
      return response;
    } catch (error) {
      console.error('[FarmingService] Claim rewards error:', error);
      return {
        success: false,
        message: 'Ошибка получения наград'
      };
    }
  }

  /**
   * Остановить фарминг
   */
  static async stopFarming(userId: number, tokenType: 'UNI' | 'TON'): Promise<FarmingResponse> {
    try {
      const response = await apiClient.post<FarmingResponse>(`/api/v2/farming/stop`, {
        user_id: userId,
        token_type: tokenType
      });
      return response;
    } catch (error) {
      console.error('[FarmingService] Stop farming error:', error);
      return {
        success: false,
        message: 'Ошибка остановки фарминга'
      };
    }
  }

  /**
   * Увеличить депозит фарминга
   */
  static async increaseDeposit(userId: number, additionalAmount: string, tokenType: 'UNI' | 'TON'): Promise<FarmingResponse> {
    try {
      const response = await apiClient.post<FarmingResponse>(`/api/v2/farming/increase`, {
        user_id: userId,
        amount: additionalAmount,
        token_type: tokenType
      });
      return response;
    } catch (error) {
      console.error('[FarmingService] Increase deposit error:', error);
      return {
        success: false,
        message: 'Ошибка увеличения депозита'
      };
    }
  }

  /**
   * Получить историю фарминга
   */
  static async getFarmingHistory(userId: number, tokenType?: 'UNI' | 'TON'): Promise<{
    success: boolean;
    data?: Array<{
      id: number;
      amount: string;
      token_type: string;
      action: string;
      timestamp: string;
      rewards_earned?: string;
    }>;
    message?: string;
  }> {
    try {
      const params = tokenType ? `?token_type=${tokenType}` : '';
      const response = await apiClient.get(`/api/v2/farming/history/${userId}${params}`);
      return response as {
        success: boolean;
        data?: Array<{
          id: number;
          amount: string;
          token_type: string;
          action: string;
          timestamp: string;
          rewards_earned?: string;
        }>;
        message?: string;
      };
    } catch (error) {
      console.error('[FarmingService] Farming history error:', error);
      return {
        success: false,
        message: 'Ошибка получения истории фарминга'
      };
    }
  }

  /**
   * Расчет потенциального дохода
   */
  static async calculatePotentialIncome(amount: string, tokenType: 'UNI' | 'TON', days: number): Promise<{
    success: boolean;
    data?: {
      dailyIncome: string;
      totalIncome: string;
      apy: string;
    };
    message?: string;
  }> {
    try {
      const response = await apiClient.post('/api/v2/farming/calculate', {
        amount,
        token_type: tokenType,
        days
      });
      return response as {
        success: boolean;
        data?: {
          dailyIncome: string;
          totalIncome: string;
          apy: string;
        };
        message?: string;
      };
    } catch (error) {
      console.error('[FarmingService] Calculate income error:', error);
      return {
        success: false,
        message: 'Ошибка расчета дохода'
      };
    }
  }
}