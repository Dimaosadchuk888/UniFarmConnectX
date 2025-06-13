import { db } from '../../server/db.js';
import { airdropParticipants, users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { UserRepository } from '../../core/repositories/UserRepository';
import { logger } from '../../core/logger.js';

export class AirdropService {
  async registerForAirdrop(telegramId: number): Promise<{
    success: boolean;
    message: string;
    code?: number;
  }> {
    try {
      // Check if user already registered
      const existingParticipant = await db
        .select()
        .from(airdropParticipants)
        .where(eq(airdropParticipants.telegram_id, telegramId))
        .limit(1);

      if (existingParticipant.length > 0) {
        return {
          success: false,
          message: 'Пользователь уже зарегистрирован в airdrop',
          code: 409
        };
      }

      // Find user by telegram_id
      const user = await UserRepository.findByTelegramId(telegramId.toString());
      
      if (!user) {
        return {
          success: false,
          message: 'Пользователь не найден',
          code: 404
        };
      }

      // Register user for airdrop
      await db.insert(airdropParticipants).values({
        telegram_id: telegramId,
        user_id: user.id,
        status: 'active'
      });

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