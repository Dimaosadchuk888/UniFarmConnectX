/**
 * Repository для модуля Missions
 * Управление заданиями и их выполнением
 */

import { BaseRepository } from '../BaseRepository';
import { supabase } from '../../core/supabase';
import { 
  Mission, 
  UserMission, 
  InsertMission, 
  InsertUserMission 
} from '../../shared/schema';
import { logger } from '../../utils/logger';

export class MissionsRepository extends BaseRepository<Mission> {
  constructor() {
    super('missions');
  }

  /**
   * Получить все активные миссии
   */
  async getActiveMissions(): Promise<Mission[]> {
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('is_active', true)
        .order('reward_amount', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching active missions:', error);
      throw error;
    }
  }

  /**
   * Получить миссии пользователя
   */
  async getUserMissions(userId: number): Promise<UserMission[]> {
    try {
      const { data, error } = await supabase
        .from('user_missions')
        .select(`
          *,
          mission:missions(*)
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching user missions:', error);
      throw error;
    }
  }

  /**
   * Получить выполненные миссии пользователя
   */
  async getCompletedMissions(userId: number): Promise<UserMission[]> {
    try {
      const { data, error } = await supabase
        .from('user_missions')
        .select(`
          *,
          mission:missions(*)
        `)
        .eq('user_id', userId)
        .eq('is_completed', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching completed missions:', error);
      throw error;
    }
  }

  /**
   * Проверить выполнение миссии
   */
  async checkMissionCompletion(userId: number, missionId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_missions')
        .select('is_completed')
        .eq('user_id', userId)
        .eq('mission_id', missionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return false; // Не найдено
        throw error;
      }

      return data?.is_completed || false;
    } catch (error) {
      logger.error('Error checking mission completion:', error);
      throw error;
    }
  }

  /**
   * Отметить миссию как выполненную
   */
  async completeMission(
    userId: number, 
    missionId: number
  ): Promise<UserMission | null> {
    try {
      // Проверяем, не выполнена ли уже миссия
      const isCompleted = await this.checkMissionCompletion(userId, missionId);
      if (isCompleted) {
        throw new Error('Mission already completed');
      }

      // Получаем данные миссии
      const mission = await this.getById(missionId);
      if (!mission) {
        throw new Error('Mission not found');
      }

      // Создаем или обновляем запись о выполнении
      const { data, error } = await supabase
        .from('user_missions')
        .upsert({
          user_id: userId,
          mission_id: missionId,
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // TODO: Начислить награду через TransactionService
      // await transactionService.createMissionReward(userId, mission.reward_amount, mission.reward_type);

      return data;
    } catch (error) {
      logger.error('Error completing mission:', error);
      throw error;
    }
  }

  /**
   * Получить прогресс по миссиям
   */
  async getMissionsProgress(userId: number): Promise<{
    total: number;
    completed: number;
    percentage: number;
  }> {
    try {
      const [totalResult, completedResult] = await Promise.all([
        supabase
          .from('missions')
          .select('id', { count: 'exact' })
          .eq('is_active', true),
        supabase
          .from('user_missions')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('is_completed', true)
      ]);

      const total = totalResult.count || 0;
      const completed = completedResult.count || 0;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { total, completed, percentage };
    } catch (error) {
      logger.error('Error fetching missions progress:', error);
      throw error;
    }
  }

  /**
   * Сбросить выполнение миссии (для повторяемых миссий)
   */
  async resetMission(userId: number, missionId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_missions')
        .delete()
        .eq('user_id', userId)
        .eq('mission_id', missionId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error resetting mission:', error);
      throw error;
    }
  }

  /**
   * Создать новую миссию (админ функция)
   */
  async createMission(missionData: InsertMission): Promise<Mission> {
    try {
      const { data, error } = await supabase
        .from('missions')
        .insert(missionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating mission:', error);
      throw error;
    }
  }

  /**
   * Обновить миссию (админ функция)
   */
  async updateMission(
    missionId: number, 
    updates: Partial<InsertMission>
  ): Promise<Mission | null> {
    try {
      const { data, error } = await supabase
        .from('missions')
        .update(updates)
        .eq('id', missionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating mission:', error);
      throw error;
    }
  }
}

export const missionsRepository = new MissionsRepository();