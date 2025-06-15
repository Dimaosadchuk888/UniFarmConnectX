import { supabase } from '../../core/supabase';
import { SupabaseUserRepository } from '../user/repository';
import { logger } from '../../core/logger.js';

export class AirdropService {
  private userRepository: SupabaseUserRepository;

  constructor() {
    this.userRepository = new SupabaseUserRepository();
  }

  async registerForAirdrop(telegramId: number): Promise<{
    success: boolean;
    message: string;
    code?: number;
  }> {
    try {
      // Check if user already registered
      const { data: existingParticipant } = await supabase
        .from('airdrop_participants')
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
        .from('airdrop_participants')
        .insert([{
          telegram_id: telegramId,
          user_id: user.id,
          status: 'active'
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
}