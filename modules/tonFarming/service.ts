import { logger } from '../../core/logger.js';
import { UserRepository } from '../users/repository.js';

const userRepository = new UserRepository();

interface TonFarmingData {
  ton_farming_balance: string;
  ton_farming_rate: string;
  ton_farming_start_timestamp: Date | null;
  ton_farming_last_update: Date | null;
  is_active: boolean;
  can_claim: boolean;
}

export class TonFarmingService {
  async getTonFarmingDataByTelegramId(telegramId: string): Promise<TonFarmingData> {
    try {
      const user = await UserRepository.findByTelegramId(telegramId);
      if (!user) {
        return {
          ton_farming_balance: '0',
          ton_farming_rate: '0',
          ton_farming_start_timestamp: null,
          ton_farming_last_update: null,
          is_active: false,
          can_claim: false
        };
      }

      const balance = parseFloat(user.balance_ton || '0');
      const isActive = balance > 0;
      
      return {
        ton_farming_balance: balance.toFixed(8),
        ton_farming_rate: '0.001', // Базовая ставка TON фарминга
        ton_farming_start_timestamp: isActive ? new Date() : null,
        ton_farming_last_update: new Date(),
        is_active: isActive,
        can_claim: balance > 0
      };
    } catch (error) {
      logger.error('[TonFarmingService] Ошибка получения данных TON фарминга:', error);
      return {
        ton_farming_balance: '0',
        ton_farming_rate: '0',
        ton_farming_start_timestamp: null,
        ton_farming_last_update: null,
        is_active: false,
        can_claim: false
      };
    }
  }

  async startTonFarming(telegramId: string, amount?: string): Promise<boolean> {
    try {
      const user = await UserRepository.findByTelegramId(telegramId);
      if (!user) {
        return false;
      }

      logger.info(`[TON FARMING] User ${telegramId} started TON farming`, {
        userId: user.id,
        telegramId,
        amount: amount || 'auto',
        operation: 'ton_farming_start',
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
      const user = await UserRepository.findByTelegramId(telegramId);
      if (!user) {
        return { amount: '0', claimed: false };
      }

      const currentBalance = parseFloat(user.balance_ton || '0');
      const rewardAmount = Math.min(currentBalance * 0.01, 0.001); // 1% от баланса или максимум 0.001 TON

      if (rewardAmount <= 0) {
        return { amount: '0', claimed: false };
      }

      logger.info(`[TON FARMING] User ${telegramId} claimed ${rewardAmount.toFixed(8)} TON from farming`, {
        userId: user.id,
        telegramId,
        amount: rewardAmount.toFixed(8),
        previousBalance: currentBalance.toFixed(8),
        operation: 'ton_farming_claim',
        timestamp: new Date().toISOString()
      });

      return {
        amount: rewardAmount.toFixed(8),
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
      const user = await UserRepository.findByTelegramId(telegramId);
      if (!user) {
        return {
          isActive: false,
          currentBalance: '0',
          rate: '0',
          lastUpdate: null,
          canClaim: false,
          estimatedReward: '0'
        };
      }

      const balance = parseFloat(user.balance_ton || '0');
      const isActive = balance > 0;
      const estimatedReward = isActive ? (balance * 0.01).toFixed(8) : '0';

      return {
        isActive,
        currentBalance: balance.toFixed(8),
        rate: '0.001',
        lastUpdate: new Date().toISOString(),
        canClaim: balance > 0,
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
}