import { logger } from '../../core/logger.js';
import { 
  TON_FARMING_CONFIG, 
  TON_FARMING_MESSAGES, 
  TON_TRANSACTION_TYPES,
  TON_FARMING_VALIDATION 
} from './model';

interface TonFarmingData {
  balance_ton: string; // Используем реальное поле из БД
  ton_farming_rate: string;
  ton_farming_start_timestamp: Date | null;
  ton_farming_last_update: Date | null;
  is_active: boolean;
  can_claim: boolean;
}

export class TonFarmingService {
  async getTonFarmingDataByTelegramId(telegramId: string): Promise<TonFarmingData> {
    try {
      if (!telegramId) {
        logger.warn('[TonFarmingService] Получен пустой telegramId');
        throw new Error('TelegramId is required');
      }
      
      logger.info(`[TonFarmingService] Получение данных TON фарминга для пользователя ${telegramId}`);
      
      // Проверяем, что telegramId является валидным числом
      const numericTelegramId = parseInt(telegramId, 10);
      if (isNaN(numericTelegramId) || numericTelegramId < TON_FARMING_VALIDATION.MIN_TELEGRAM_ID || numericTelegramId > TON_FARMING_VALIDATION.MAX_TELEGRAM_ID) {
        logger.warn(TON_FARMING_MESSAGES.INVALID_TELEGRAM_ID, telegramId);
        throw new Error('Invalid telegramId format');
      }
      
      // Получаем реальные данные пользователя из Supabase
      const { supabase } = await import('../../core/supabase');
      const { data: user, error } = await supabase
        .from('users')
        .select('balance_ton, ton_farming_rate, ton_farming_start_timestamp, ton_farming_last_update, ton_boost_package')
        .eq('telegram_id', telegramId)
        .single();
      
      if (error || !user) {
        logger.warn('[TonFarmingService] Пользователь не найден в БД', { telegramId, error });
        return {
          balance_ton: '0',
          ton_farming_rate: '0',
          ton_farming_start_timestamp: null,
          ton_farming_last_update: null,
          is_active: false,
          can_claim: false
        };
      }
      
      // Определяем активность фарминга на основе реальных данных
      const tonBalance = parseFloat(user.balance_ton || '0');
      const hasActiveBoost = user.ton_boost_package && user.ton_boost_package !== '0';
      const isActive = tonBalance > 0 && hasActiveBoost;
      
      // Проверяем возможность клейма (прошло ли достаточно времени)
      const lastUpdate = user.ton_farming_last_update ? new Date(user.ton_farming_last_update) : null;
      const canClaim = isActive && lastUpdate && (Date.now() - lastUpdate.getTime() > 60000); // Минимум 1 минута
      
      return {
        balance_ton: tonBalance.toFixed(8),
        ton_farming_rate: user.ton_farming_rate || TON_FARMING_CONFIG.DEFAULT_RATE,
        ton_farming_start_timestamp: user.ton_farming_start_timestamp ? new Date(user.ton_farming_start_timestamp) : null,
        ton_farming_last_update: lastUpdate,
        is_active: isActive,
        can_claim: canClaim
      };
    } catch (error) {
      logger.error('[TonFarmingService] Ошибка получения данных TON фарминга:', {
        telegramId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        balance_ton: '0',
        ton_farming_rate: TON_FARMING_CONFIG.DEFAULT_RATE,
        ton_farming_start_timestamp: null,
        ton_farming_last_update: null,
        is_active: false,
        can_claim: false
      };
    }
  }

  async startTonFarming(telegramId: string, amount?: string): Promise<boolean> {
    try {
      logger.info(`[TON FARMING] User ${telegramId} started TON farming`, {
        telegramId,
        amount: amount || 'auto',
        operation: TON_TRANSACTION_TYPES.FARMING_START,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      logger.error('[TonFarmingService] Ошибка запуска TON фарминга:', error);
      return false;
    }
  }

  async claimTonRewards(telegramId: string): Promise<{ amount: string; claimed: boolean }> {
    try {
      const rewardAmount = 0.001;

      logger.info(`[TON FARMING] User ${telegramId} claimed ${rewardAmount.toFixed(TON_FARMING_CONFIG.REWARD_PRECISION)} TON from farming`, {
        telegramId,
        amount: rewardAmount.toFixed(TON_FARMING_CONFIG.REWARD_PRECISION),
        operation: TON_TRANSACTION_TYPES.FARMING_CLAIM,
        timestamp: new Date().toISOString()
      });

      return {
        amount: rewardAmount.toFixed(TON_FARMING_CONFIG.REWARD_PRECISION),
        claimed: true
      };
    } catch (error) {
      logger.error('[TonFarmingService] Ошибка сбора TON наград:', error);
      return { amount: '0', claimed: false };
    }
  }

  async getTonFarmingStatus(telegramId: string): Promise<{
    isActive: boolean;
    currentBalance: string;
    rate: string;
    lastUpdate: string | null;
    canClaim: boolean;
    estimatedReward: string;
  }> {
    try {
      // Получаем данные через существующий метод
      const farmingData = await this.getTonFarmingDataByTelegramId(telegramId);
      
      // Рассчитываем примерную награду на основе времени с последнего обновления
      let estimatedReward = '0';
      if (farmingData.is_active && farmingData.ton_farming_last_update) {
        const timeDiff = Date.now() - farmingData.ton_farming_last_update.getTime();
        const hours = timeDiff / (1000 * 60 * 60);
        const dailyRate = parseFloat(farmingData.ton_farming_rate);
        const balance = parseFloat(farmingData.balance_ton);
        const reward = (balance * dailyRate * hours) / 24;
        estimatedReward = reward.toFixed(8);
      }
      
      return {
        isActive: farmingData.is_active,
        currentBalance: farmingData.balance_ton,
        rate: farmingData.ton_farming_rate,
        lastUpdate: farmingData.ton_farming_last_update ? farmingData.ton_farming_last_update.toISOString() : null,
        canClaim: farmingData.can_claim,
        estimatedReward
      };
    } catch (error) {
      logger.error('[TonFarmingService] Ошибка получения статуса TON фарминга:', error);
      return {
        isActive: false,
        currentBalance: '0',
        rate: '0',
        lastUpdate: null,
        canClaim: false,
        estimatedReward: '0'
      };
    }
  }

  async getTonFarmingBalance(telegramId: string): Promise<{ balance: string; currency: string }> {
    try {
      logger.info(`[TON FARMING] Balance check for user ${telegramId}`, {
        telegramId,
        operation: 'BALANCE_CHECK',
        timestamp: new Date().toISOString()
      });
      
      const { supabase } = await import('../../core/supabase');
      const { data: user, error } = await supabase
        .from('users')
        .select('balance_ton')
        .eq('telegram_id', telegramId)
        .single();
      
      if (error || !user) {
        logger.warn('[TonFarmingService] Пользователь не найден при получении баланса', { telegramId, error });
        return {
          balance: '0',
          currency: 'TON'
        };
      }
      
      return {
        balance: user.balance_ton?.toString() || '0',
        currency: 'TON'
      };
    } catch (error) {
      logger.error('[TonFarmingService] Ошибка получения баланса:', error);
      return {
        balance: '0',
        currency: 'TON'
      };
    }
  }
}