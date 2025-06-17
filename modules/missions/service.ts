import { supabase } from '../../core/supabase';
import { SupabaseUserRepository } from '../user/service';
import { logger } from '../../core/logger';
import { MISSIONS_TABLES, MISSION_TYPES, MISSION_STATUS, REWARD_TYPES } from './model';

export class MissionsService {
  private userRepository: SupabaseUserRepository;

  constructor() {
    this.userRepository = new SupabaseUserRepository();
  }

  async getActiveMissionsByTelegramId(telegramId: string): Promise<any[]> {
    try {
      // Новые социальные миссии
      return [
        {
          id: 1,
          title: 'Вступи в Telegram-чат',
          description: 'Присоединяйся к нашему официальному чату UniFarm',
          reward_uni: '500.000000',
          reward_ton: '0',
          type: MISSION_TYPES.TELEGRAM_GROUP,
          status: MISSION_STATUS.ACTIVE,
          url: 'https://t.me/UniverseGamesChat'
        },
        {
          id: 2,
          title: 'Подпишись на Telegram-канал',
          description: 'Следи за новостями и обновлениями UniFarm',
          reward_uni: '500.000000',
          reward_ton: '0',
          type: MISSION_TYPES.TELEGRAM_CHANNEL,
          status: MISSION_STATUS.ACTIVE,
          url: 'https://t.me/UniverseGamesChannel'
        },
        {
          id: 3,
          title: 'Подпишись на YouTube',
          description: 'Смотри обучающие видео и разбирайся в крипте',
          reward_uni: '500.000000',
          reward_ton: '0',
          type: MISSION_TYPES.YOUTUBE,
          status: MISSION_STATUS.ACTIVE,
          url: 'https://youtube.com/@universegamesyoutube'
        },
        {
          id: 4,
          title: 'Подпишись на TikTok',
          description: 'Смотри короткие ролики и зарабатывай',
          reward_uni: '500.000000',
          reward_ton: '0',
          type: MISSION_TYPES.TIKTOK,
          status: MISSION_STATUS.ACTIVE,
          url: 'https://tiktok.com/@universegames.io'
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

      // Награды за социальные миссии
      const missionRewards: { [key: number]: { uni: string; ton: string } } = {
        1: { uni: '500.000000', ton: '0' },
        2: { uni: '500.000000', ton: '0' },
        3: { uni: '500.000000', ton: '0' },
        4: { uni: '500.000000', ton: '0' }
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