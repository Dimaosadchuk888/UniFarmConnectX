import { supabase } from '../../core/supabase';
import { SupabaseUserRepository } from '../user/repository';
import { logger } from '../../core/logger';

export class MissionsService {
  private userRepository: SupabaseUserRepository;

  constructor() {
    this.userRepository = new SupabaseUserRepository();
  }

  async getActiveMissionsByTelegramId(telegramId: string): Promise<any[]> {
    try {
      // Возвращаем стандартный набор миссий
      return [
        {
          id: 1,
          title: 'Первый депозит',
          description: 'Сделайте первый депозит UNI в фарминг',
          reward_uni: '10',
          reward_ton: '0',
          type: 'FIRST_DEPOSIT',
          status: 'ACTIVE'
        },
        {
          id: 2,
          title: 'Пригласите друга',
          description: 'Пригласите друга через реферальную ссылку',
          reward_uni: '25',
          reward_ton: '0',
          type: 'REFERRAL',
          status: 'ACTIVE'
        },
        {
          id: 3,
          title: 'Ежедневный вход',
          description: 'Заходите в приложение 7 дней подряд',
          reward_uni: '50',
          reward_ton: '0',
          type: 'DAILY_LOGIN',
          status: 'ACTIVE'
        }
      ];
    } catch (error) {
      logger.error('[MissionsService] Ошибка получения активных миссий:', error);
      return [];
    }
  }

  async completeMission(telegramId: string, missionId: number): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.userRepository.getUserByTelegramId(Number(telegramId));
      if (!user) {
        return { success: false, message: 'Пользователь не найден' };
      }

      // Логика завершения миссии - добавляем запись в transactions
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'MISSION_COMPLETE',
          amount: '0',
          description: `Mission ${missionId} completed`,
          status: 'completed',
          created_at: new Date().toISOString()
        });

      logger.info(`[MissionsService] Mission ${missionId} completed for user ${telegramId}`);
      return { success: true, message: 'Миссия выполнена' };
    } catch (error) {
      logger.error('[MissionsService] Ошибка завершения миссии:', error);
      return { success: false, message: 'Ошибка выполнения миссии' };
    }
  }

  async claimMissionReward(telegramId: string, missionId: number): Promise<{ success: boolean; message: string; reward?: any }> {
    try {
      const user = await this.userRepository.getUserByTelegramId(Number(telegramId));
      if (!user) {
        return { success: false, message: 'Пользователь не найден' };
      }

      // Базовые награды за миссии
      const missionRewards: { [key: number]: { uni: string; ton: string } } = {
        1: { uni: '10', ton: '0' },
        2: { uni: '25', ton: '0' },
        3: { uni: '50', ton: '0' }
      };

      const reward = missionRewards[missionId];
      if (!reward) {
        return { success: false, message: 'Неизвестная миссия' };
      }

      // Обновляем баланс пользователя
      const currentUniBalance = parseFloat(user.balance_uni || '0');
      const newUniBalance = (currentUniBalance + parseFloat(reward.uni)).toString();

      await supabase
        .from('users')
        .update({ balance_uni: newUniBalance })
        .eq('id', user.id);

      // Создаем запись транзакции
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'MISSION_REWARD',
          amount: reward.uni,
          description: `Mission ${missionId} reward claimed`,
          status: 'completed',
          created_at: new Date().toISOString()
        });

      return { 
        success: true, 
        message: 'Награда получена', 
        reward: { uni: reward.uni, ton: reward.ton } 
      };
    } catch (error) {
      logger.error('[MissionsService] Ошибка получения награды за миссию:', error);
      return { success: false, message: 'Ошибка получения награды' };
    }
  }

  async getMissionStatsByTelegramId(telegramId: string): Promise<any> {
    try {
      const user = await this.userRepository.getUserByTelegramId(Number(telegramId));
      if (!user) {
        return {
          completed_missions: 0,
          total_rewards_uni: '0',
          total_rewards_ton: '0'
        };
      }

      // Подсчитываем статистику миссий
      const { data: missions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'MISSION_REWARD');

      const completedMissions = missions?.length || 0;
      const totalRewardsUni = missions?.reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0) || 0;

      return {
        completed_missions: completedMissions,
        total_rewards_uni: totalRewardsUni.toString(),
        total_rewards_ton: '0'
      };
    } catch (error) {
      logger.error('[MissionsService] Ошибка получения статистики миссий:', error);
      return {
        completed_missions: 0,
        total_rewards_uni: '0',
        total_rewards_ton: '0'
      };
    }
  }

  async getUserMissionsByTelegramId(telegramId: string): Promise<any[]> {
    try {
      const user = await this.userRepository.getUserByTelegramId(Number(telegramId));
      if (!user) {
        return [];
      }

      // Возвращаем историю выполненных миссий
      const { data: missions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['MISSION_COMPLETE', 'MISSION_REWARD'])
        .order('created_at', { ascending: false });

      return missions || [];
    } catch (error) {
      logger.error('[MissionsService] Ошибка получения миссий пользователя:', error);
      return [];
    }
  }
}

export default MissionsService;