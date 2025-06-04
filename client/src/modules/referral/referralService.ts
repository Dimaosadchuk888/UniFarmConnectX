/**
 * Интегрированный сервис реферальной системы
 * Связывает фронтенд модуль с бекенд API
 */
import { apiClient } from '../../core/api';

export interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  total_earned_uni: string;
  total_earned_ton: string;
  current_level: number;
  max_level: number;
  referral_code: string;
}

export interface ReferralUser {
  id: number;
  username?: string;
  level: number;
  earned_from_user: string;
  registration_date: string;
  is_active: boolean;
}

export interface ReferralResponse {
  success: boolean;
  data?: any;
  message?: string;
}

export class ReferralService {
  /**
   * Получить реферальную статистику пользователя
   */
  static async getReferralStats(userId: number): Promise<ReferralResponse> {
    try {
      const response = await apiClient.get<ReferralResponse>(`/api/v2/referral/stats/${userId}`);
      return response;
    } catch (error) {
      console.error('[ReferralService] Get referral stats error:', error);
      return {
        success: false,
        message: 'Ошибка получения реферальной статистики'
      };
    }
  }

  /**
   * Получить список рефералов по уровням
   */
  static async getReferralsByLevel(userId: number, level: number = 1): Promise<{
    success: boolean;
    data?: ReferralUser[];
    message?: string;
  }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data?: ReferralUser[];
        message?: string;
      }>(`/api/v2/referral/users/${userId}?level=${level}`);
      return response;
    } catch (error) {
      console.error('[ReferralService] Get referrals by level error:', error);
      return {
        success: false,
        message: 'Ошибка получения списка рефералов'
      };
    }
  }

  /**
   * Создать реферальный код
   */
  static async createReferralCode(userId: number, customCode?: string): Promise<ReferralResponse> {
    try {
      const response = await apiClient.post<ReferralResponse>('/api/v2/referral/create-code', {
        user_id: userId,
        custom_code: customCode
      });
      return response;
    } catch (error) {
      console.error('[ReferralService] Create referral code error:', error);
      return {
        success: false,
        message: 'Ошибка создания реферального кода'
      };
    }
  }

  /**
   * Использовать реферальный код
   */
  static async useReferralCode(userId: number, referralCode: string): Promise<ReferralResponse> {
    try {
      const response = await apiClient.post<ReferralResponse>('/api/v2/referral/use-code', {
        user_id: userId,
        referral_code: referralCode
      });
      return response;
    } catch (error) {
      console.error('[ReferralService] Use referral code error:', error);
      return {
        success: false,
        message: 'Ошибка использования реферального кода'
      };
    }
  }

  /**
   * Получить историю реферальных выплат
   */
  static async getReferralPayments(userId: number, limit: number = 50): Promise<{
    success: boolean;
    data?: Array<{
      id: number;
      from_user_id: number;
      from_username?: string;
      amount_uni: string;
      amount_ton: string;
      level: number;
      earned_at: string;
      source: string;
    }>;
    message?: string;
  }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data?: Array<{
          id: number;
          from_user_id: number;
          from_username?: string;
          amount_uni: string;
          amount_ton: string;
          level: number;
          earned_at: string;
          source: string;
        }>;
        message?: string;
      }>(`/api/v2/referral/payments/${userId}?limit=${limit}`);
      return response;
    } catch (error) {
      console.error('[ReferralService] Get referral payments error:', error);
      return {
        success: false,
        message: 'Ошибка получения истории выплат'
      };
    }
  }

  /**
   * Валидировать реферальный код
   */
  static async validateReferralCode(code: string): Promise<{
    success: boolean;
    isValid?: boolean;
    ownerUsername?: string;
    message?: string;
  }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        isValid?: boolean;
        ownerUsername?: string;
        message?: string;
      }>('/api/v2/referral/validate-code', {
        referral_code: code
      });
      return response;
    } catch (error) {
      console.error('[ReferralService] Validate referral code error:', error);
      return {
        success: false,
        message: 'Ошибка валидации реферального кода'
      };
    }
  }

  /**
   * Получить реферальную структуру (дерево)
   */
  static async getReferralTree(userId: number, maxLevels: number = 20): Promise<{
    success: boolean;
    data?: {
      userId: number;
      username?: string;
      level: number;
      children: any[];
      stats: {
        directReferrals: number;
        totalReferrals: number;
        earnedFromLevel: string;
      };
    };
    message?: string;
  }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data?: {
          userId: number;
          username?: string;
          level: number;
          children: any[];
          stats: {
            directReferrals: number;
            totalReferrals: number;
            earnedFromLevel: string;
          };
        };
        message?: string;
      }>(`/api/v2/referral/tree/${userId}?max_levels=${maxLevels}`);
      return response;
    } catch (error) {
      console.error('[ReferralService] Get referral tree error:', error);
      return {
        success: false,
        message: 'Ошибка получения реферальной структуры'
      };
    }
  }

  /**
   * Получить настройки реферальной программы
   */
  static async getReferralSettings(): Promise<{
    success: boolean;
    data?: {
      maxLevels: number;
      percentages: { [level: string]: number };
      minWithdrawAmount: string;
      bonusForFirstReferral: string;
    };
    message?: string;
  }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data?: {
          maxLevels: number;
          percentages: { [level: string]: number };
          minWithdrawAmount: string;
          bonusForFirstReferral: string;
        };
        message?: string;
      }>('/api/v2/referral/settings');
      return response;
    } catch (error) {
      console.error('[ReferralService] Get referral settings error:', error);
      return {
        success: false,
        message: 'Ошибка получения настроек реферальной программы'
      };
    }
  }

  /**
   * Получить топ рефереров
   */
  static async getTopReferrers(limit: number = 10): Promise<{
    success: boolean;
    data?: Array<{
      user_id: number;
      username?: string;
      total_referrals: number;
      total_earned: string;
      rank: number;
    }>;
    message?: string;
  }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data?: Array<{
          user_id: number;
          username?: string;
          total_referrals: number;
          total_earned: string;
          rank: number;
        }>;
        message?: string;
      }>(`/api/v2/referral/top?limit=${limit}`);
      return response;
    } catch (error) {
      console.error('[ReferralService] Get top referrers error:', error);
      return {
        success: false,
        message: 'Ошибка получения топа рефереров'
      };
    }
  }
}