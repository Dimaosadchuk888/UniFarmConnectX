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
      // Расширенный список разнообразных миссий
      return [
        // Социальные сети миссии
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
        },
        // Реферальные миссии
        {
          id: 5,
          title: 'Пригласи 1 друга',
          description: 'Пригласи друга по реферальной ссылке',
          reward_uni: '1000.000000',
          reward_ton: '0',
          type: MISSION_TYPES.REFERRAL,
          status: MISSION_STATUS.ACTIVE,
          url: null
        },
        {
          id: 6,
          title: 'Пригласи 5 друзей',
          description: 'Построй команду из 5 активных рефералов',
          reward_uni: '2500.000000',
          reward_ton: '0',
          type: MISSION_TYPES.REFERRAL,
          status: MISSION_STATUS.ACTIVE,
          url: null
        },
        {
          id: 7,
          title: 'Пригласи 10 друзей',
          description: 'Стань лидером с командой из 10 человек',
          reward_uni: '5000.000000',
          reward_ton: '0.1',
          type: MISSION_TYPES.REFERRAL,
          status: MISSION_STATUS.ACTIVE,
          url: null
        },
        // Ежедневные миссии
        {
          id: 8,
          title: 'Ежедневный чек-ин',
          description: 'Заходи в приложение каждый день',
          reward_uni: '100.000000',
          reward_ton: '0',
          type: MISSION_TYPES.DAILY,
          status: MISSION_STATUS.ACTIVE,
          url: null
        },
        {
          id: 9,
          title: 'Стрик 7 дней',
          description: 'Заходи в приложение 7 дней подряд',
          reward_uni: '1000.000000',
          reward_ton: '0',
          type: MISSION_TYPES.WEEKLY,
          status: MISSION_STATUS.ACTIVE,
          url: null
        },
        {
          id: 10,
          title: 'Стрик 30 дней',
          description: 'Заходи в приложение месяц подряд',
          reward_uni: '5000.000000',
          reward_ton: '0.5',
          type: MISSION_TYPES.ONE_TIME,
          status: MISSION_STATUS.ACTIVE,
          url: null
        },
        // Фарминг миссии
        {
          id: 11,
          title: 'Первый UNI депозит',
          description: 'Сделай свой первый депозит для UNI фарминга',
          reward_uni: '200.000000',
          reward_ton: '0',
          type: MISSION_TYPES.ONE_TIME,
          status: MISSION_STATUS.ACTIVE,
          url: null
        },
        {
          id: 12,
          title: 'Купи TON Boost пакет',
          description: 'Активируй любой TON Boost пакет',
          reward_uni: '1500.000000',
          reward_ton: '0',
          type: MISSION_TYPES.ONE_TIME,
          status: MISSION_STATUS.ACTIVE,
          url: null
        }
      ];
    } catch (error) {
      logger.error('[MissionsService] Ошибка получения активных миссий:', error);
      return [];
    }
  }

  async completeMission(telegramId: string, missionId: number): Promise<{ success: boolean; message: string; reward?: number }> {
    try {
      const user = await this.userRepository.getUserByTelegramId(Number(telegramId));
      if (!user) {
        return { success: false, message: 'Пользователь не найден' };
      }

      // Проверяем, не выполнена ли уже эта миссия
      const { data: existingMission } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'MISSION_REWARD')
        .eq('description', `Mission ${missionId} reward`)
        .single();

      if (existingMission) {
        return { success: false, message: 'Миссия уже выполнена' };
      }

      // Определяем награду за миссию
      const missionRewards: { [key: number]: number } = {
        1: 500,   // Telegram чат
        2: 500,   // Telegram канал  
        3: 500,   // YouTube
        4: 500,   // TikTok
        5: 1000,  // Пригласи 1 друга
        6: 2500,  // Пригласи 5 друзей
        7: 5000,  // Пригласи 10 друзей
        8: 100,   // Ежедневный чек-ин
        9: 1000,  // Стрик 7 дней
        10: 5000, // Стрик 30 дней
        11: 200,  // Первый UNI депозит
        12: 1500  // Купи TON Boost пакет
      };

      const rewardAmount = missionRewards[missionId] || 0;
      
      if (rewardAmount === 0) {
        return { success: false, message: 'Неизвестная миссия' };
      }

      // Начисляем награду на баланс пользователя
      const currentUniBalance = parseFloat(user.balance_uni || '0');
      const newUniBalance = currentUniBalance + rewardAmount;

      await supabase
        .from('users')
        .update({ 
          balance_uni: newUniBalance.toString(),
          uni_balance: newUniBalance.toString()
        })
        .eq('id', user.id);

      // Добавляем транзакцию о награде
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'MISSION_REWARD',
          amount: rewardAmount.toString(),
          description: `Mission ${missionId} reward`,
          status: 'completed',
          created_at: new Date().toISOString()
        });

      logger.info(`[MissionsService] Mission ${missionId} completed for user ${telegramId}, reward: ${rewardAmount} UNI`);
      return { 
        success: true, 
        message: `Миссия выполнена! Получено ${rewardAmount} UNI`,
        reward: rewardAmount
      };
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

  async getUserCompletedMissions(telegramId: string): Promise<any[]> {
    try {
      const user = await this.userRepository.getUserByTelegramId(Number(telegramId));
      if (!user) {
        return [];
      }

      // Получаем выполненные миссии из транзакций
      const { data: completedMissions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'MISSION_REWARD')
        .order('created_at', { ascending: false });

      if (!completedMissions) {
        return [];
      }

      // Преобразуем транзакции в формат миссий
      return completedMissions.map(transaction => {
        const missionId = parseInt(transaction.description.match(/Mission (\d+)/)?.[1] || '0');
        return {
          id: transaction.id,
          user_id: user.id,
          mission_id: missionId,
          completed_at: transaction.created_at,
          reward_amount: transaction.amount_uni || '0'
        };
      });
    } catch (error) {
      logger.error('[MissionsService] Ошибка получения выполненных миссий:', error);
      return [];
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