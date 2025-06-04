/**
 * Интегрированный сервис миссий
 * Связывает фронтенд модуль с бекенд API
 */
import { apiClient } from '../../core/api';

export interface Mission {
  id: number;
  title: string;
  description: string;
  reward_uni: string;
  reward_ton: string;
  type: 'daily' | 'weekly' | 'one_time' | 'social' | 'farming';
  requirements: {
    action: string;
    target?: number;
    url?: string;
  };
  is_active: boolean;
  created_at: string;
}

export interface UserMission {
  id: number;
  user_id: number;
  mission_id: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'claimed';
  progress: number;
  completed_at?: string;
  claimed_at?: string;
}

export interface MissionsResponse {
  success: boolean;
  data?: Mission[] | UserMission[];
  message?: string;
}

export class MissionsService {
  /**
   * Получить все доступные миссии
   */
  static async getAllMissions(): Promise<MissionsResponse> {
    try {
      const response = await apiClient.get<MissionsResponse>('/api/v2/missions');
      return response;
    } catch (error) {
      console.error('[MissionsService] Get all missions error:', error);
      return {
        success: false,
        message: 'Ошибка получения миссий'
      };
    }
  }

  /**
   * Получить миссии пользователя
   */
  static async getUserMissions(userId: number): Promise<MissionsResponse> {
    try {
      const response = await apiClient.get<MissionsResponse>(`/api/v2/missions/user/${userId}`);
      return response;
    } catch (error) {
      console.error('[MissionsService] Get user missions error:', error);
      return {
        success: false,
        message: 'Ошибка получения миссий пользователя'
      };
    }
  }

  /**
   * Начать выполнение миссии
   */
  static async startMission(userId: number, missionId: number): Promise<MissionsResponse> {
    try {
      const response = await apiClient.post<MissionsResponse>('/api/v2/missions/start', {
        user_id: userId,
        mission_id: missionId
      });
      return response;
    } catch (error) {
      console.error('[MissionsService] Start mission error:', error);
      return {
        success: false,
        message: 'Ошибка начала миссии'
      };
    }
  }

  /**
   * Обновить прогресс миссии
   */
  static async updateProgress(userId: number, missionId: number, progress: number): Promise<MissionsResponse> {
    try {
      const response = await apiClient.post<MissionsResponse>('/api/v2/missions/progress', {
        user_id: userId,
        mission_id: missionId,
        progress
      });
      return response;
    } catch (error) {
      console.error('[MissionsService] Update progress error:', error);
      return {
        success: false,
        message: 'Ошибка обновления прогресса'
      };
    }
  }

  /**
   * Завершить миссию
   */
  static async completeMission(userId: number, missionId: number): Promise<MissionsResponse> {
    try {
      const response = await apiClient.post<MissionsResponse>('/api/v2/missions/complete', {
        user_id: userId,
        mission_id: missionId
      });
      return response;
    } catch (error) {
      console.error('[MissionsService] Complete mission error:', error);
      return {
        success: false,
        message: 'Ошибка завершения миссии'
      };
    }
  }

  /**
   * Получить награду за миссию
   */
  static async claimReward(userId: number, missionId: number): Promise<MissionsResponse> {
    try {
      const response = await apiClient.post<MissionsResponse>('/api/v2/missions/claim', {
        user_id: userId,
        mission_id: missionId
      });
      return response;
    } catch (error) {
      console.error('[MissionsService] Claim reward error:', error);
      return {
        success: false,
        message: 'Ошибка получения награды'
      };
    }
  }

  /**
   * Проверить выполнение социальной миссии
   */
  static async verifySocialMission(userId: number, missionId: number, proof?: string): Promise<MissionsResponse> {
    try {
      const response = await apiClient.post<MissionsResponse>('/api/v2/missions/verify', {
        user_id: userId,
        mission_id: missionId,
        proof
      });
      return response;
    } catch (error) {
      console.error('[MissionsService] Verify social mission error:', error);
      return {
        success: false,
        message: 'Ошибка проверки социальной миссии'
      };
    }
  }

  /**
   * Получить ежедневные миссии
   */
  static async getDailyMissions(userId: number): Promise<MissionsResponse> {
    try {
      const response = await apiClient.get<MissionsResponse>(`/api/v2/missions/daily/${userId}`);
      return response;
    } catch (error) {
      console.error('[MissionsService] Get daily missions error:', error);
      return {
        success: false,
        message: 'Ошибка получения ежедневных миссий'
      };
    }
  }

  /**
   * Сбросить ежедневные миссии
   */
  static async resetDailyMissions(userId: number): Promise<MissionsResponse> {
    try {
      const response = await apiClient.post<MissionsResponse>('/api/v2/missions/reset-daily', {
        user_id: userId
      });
      return response;
    } catch (error) {
      console.error('[MissionsService] Reset daily missions error:', error);
      return {
        success: false,
        message: 'Ошибка сброса ежедневных миссий'
      };
    }
  }
}