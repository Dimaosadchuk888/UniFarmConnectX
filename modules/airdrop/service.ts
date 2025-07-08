import { supabase } from '../../core/supabase';
import { SupabaseUserRepository } from '../user/service';
import { logger } from '../../core/logger.js';
import { AIRDROP_TABLE, DEFAULT_AIRDROP_STATUS, AIRDROP_STATUS } from './model';
import type { AirdropServiceResponse } from './types';

export class AirdropService {
  private userRepository: SupabaseUserRepository;

  constructor() {
    this.userRepository = new SupabaseUserRepository();
  }

  async registerForAirdrop(telegramId: number): Promise<AirdropServiceResponse> {
    try {
      // Check if user already registered
      const { data: existingParticipant } = await supabase
        .from(AIRDROP_TABLE)
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (existingParticipant) {
        return {
          success: false,
          message: 'Пользователь уже зарегистрирован в airdrop',
          code: 409
        };
      }

      // Find user by telegram_id
      const user = await this.userRepository.getUserByTelegramId(telegramId);
      
      if (!user) {
        return {
          success: false,
          message: 'Пользователь не найден',
          code: 404
        };
      }

      // Register user for airdrop
      await supabase
        .from(AIRDROP_TABLE)
        .insert([{
          telegram_id: telegramId,
          user_id: user.id,
          status: DEFAULT_AIRDROP_STATUS
        }]);

      logger.info('[AirdropService] Пользователь зарегистрирован в airdrop', {
        telegram_id: telegramId,
        user_id: user.id,
        registered_at: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Успешно зарегистрирован в airdrop программе'
      };

    } catch (error) {
      logger.error('[AirdropService] Ошибка регистрации в airdrop', {
        error: error instanceof Error ? error.message : String(error),
        telegram_id: telegramId
      });
      
      return {
        success: false,
        message: 'Ошибка при регистрации в airdrop',
        code: 500
      };
    }
  }

  async getActiveAirdrops(): Promise<any> {
    try {
      logger.info('[AirdropService] Получение активных airdrop кампаний');

      // Возвращаем demo данные для активных airdrop кампаний
      return {
        active_airdrops: [
          {
            id: 1,
            name: 'UNI Token Launch Airdrop',
            description: 'Получите UNI токены за активность в системе',
            reward_amount: 50,
            reward_currency: 'UNI',
            end_date: '2025-08-08',
            status: 'active'
          },
          {
            id: 2,
            name: 'TON Boost Airdrop',
            description: 'Бонусные TON токены для активных пользователей',
            reward_amount: 1,
            reward_currency: 'TON',
            end_date: '2025-07-31',
            status: 'active'
          }
        ],
        total: 2
      };
    } catch (error) {
      logger.error('[AirdropService] Ошибка получения активных airdrop', { error });
      return { active_airdrops: [], total: 0 };
    }
  }

  async claimAirdrop(telegramId: number, airdropId: number): Promise<AirdropServiceResponse> {
    try {
      logger.info('[AirdropService] Получение airdrop', { telegramId, airdropId });

      // Проверяем есть ли уже запись о получении
      const { data: existingClaim } = await supabase
        .from('airdrop_claims')
        .select('*')
        .eq('telegram_id', telegramId)
        .eq('airdrop_id', airdropId)
        .single();

      if (existingClaim) {
        return {
          success: false,
          message: 'Airdrop уже получен',
          code: 409
        };
      }

      // Создаем запись о получении airdrop
      await supabase
        .from('airdrop_claims')
        .insert([{
          telegram_id: telegramId,
          airdrop_id: airdropId,
          claimed_at: new Date().toISOString()
        }]);

      return {
        success: true,
        message: 'Airdrop успешно получен',
        code: 200
      };
    } catch (error) {
      logger.error('[AirdropService] Ошибка получения airdrop', { telegramId, airdropId, error });
      return {
        success: false,
        message: 'Ошибка при получении airdrop',
        code: 500
      };
    }
  }

  async getAirdropHistory(telegramId: number): Promise<any> {
    try {
      logger.info('[AirdropService] Получение истории airdrop', { telegramId });

      const { data: history } = await supabase
        .from('airdrop_claims')
        .select('*')
        .eq('telegram_id', telegramId)
        .order('claimed_at', { ascending: false });

      return {
        history: history || [],
        total: history?.length || 0
      };
    } catch (error) {
      logger.error('[AirdropService] Ошибка получения истории airdrop', { telegramId, error });
      return { history: [], total: 0 };
    }
  }

  async checkEligibility(telegramId: number): Promise<any> {
    try {
      logger.info('[AirdropService] Проверка права на airdrop', { telegramId });

      const user = await this.userRepository.getUserByTelegramId(telegramId);
      
      if (!user) {
        return {
          eligible: false,
          reason: 'Пользователь не найден'
        };
      }

      // Проверка критериев для airdrop
      const hasMinBalance = (user.balance_uni || 0) >= 10;
      const hasReferrals = user.ref_code && user.ref_code.length > 0;

      return {
        eligible: hasMinBalance && hasReferrals,
        criteria: {
          min_balance: hasMinBalance,
          has_referrals: hasReferrals
        },
        reason: hasMinBalance && hasReferrals ? 'Все критерии выполнены' : 'Не все критерии выполнены'
      };
    } catch (error) {
      logger.error('[AirdropService] Ошибка проверки права на airdrop', { telegramId, error });
      return {
        eligible: false,
        reason: 'Ошибка проверки критериев'
      };
    }
  }
}