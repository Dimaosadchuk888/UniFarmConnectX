import { db } from '../../server/db.js';
import { users, farmingDeposits, transactions } from '../../shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import { UserRepository } from '../../core/repositories/UserRepository';
import { RewardCalculationLogic } from './logic/rewardCalculation';
import { ReferralRewardDistribution } from '../referral/logic/rewardDistribution';
import { logger } from '../../core/logger.js';

export class FarmingService {
  async getFarmingDataByTelegramId(telegramId: string): Promise<{
    isActive: boolean;
    depositAmount: string;
    ratePerSecond: string;
    totalRatePerSecond: string;
    dailyIncomeUni: string;
    depositCount: number;
    totalDepositAmount: string;
    startDate: string | null;
    uni_farming_start_timestamp: string | null;
    rate: string;
    accumulated: string;
    last_claim: string | null;
    can_claim: boolean;
    next_claim_available: string | null;
  }> {
    try {
      const user = await UserRepository.findByTelegramId(telegramId);

      if (!user) {
        return {
          isActive: false,
          depositAmount: '0',
          ratePerSecond: '0',
          totalRatePerSecond: '0',
          dailyIncomeUni: '0',
          depositCount: 0,
          totalDepositAmount: '0',
          startDate: null,
          uni_farming_start_timestamp: null,
          rate: '0.000000',
          accumulated: '0.000000',
          last_claim: null,
          can_claim: false,
          next_claim_available: null
        };
      }

      const now = new Date();
      const lastClaim = user.uni_farming_last_update ? new Date(user.uni_farming_last_update) : null;
      const farmingStart = user.uni_farming_start_timestamp ? new Date(user.uni_farming_start_timestamp) : now;
      
      // Расчет накопленного фарминга (базовая ставка 0.001 UNI в час)
      const baseHourlyRate = 0.001;
      const ratePerSecond = baseHourlyRate / 3600; // Конвертация в секунды
      const dailyRate = baseHourlyRate * 24; // Дневная ставка
      
      const hoursElapsed = lastClaim 
        ? (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60)
        : (now.getTime() - farmingStart.getTime()) / (1000 * 60 * 60);
      
      const accumulated = Math.max(0, hoursElapsed * baseHourlyRate);
      const isActive = !!user.uni_farming_start_timestamp;
      const depositAmount = user.uni_deposit_amount || '0';
      
      return {
        isActive,
        depositAmount,
        ratePerSecond: ratePerSecond.toFixed(8),
        totalRatePerSecond: ratePerSecond.toFixed(8),
        dailyIncomeUni: dailyRate.toFixed(6),
        depositCount: isActive ? 1 : 0,
        totalDepositAmount: depositAmount,
        startDate: farmingStart.toISOString(),
        uni_farming_start_timestamp: user.uni_farming_start_timestamp ? user.uni_farming_start_timestamp.toISOString() : null,
        rate: baseHourlyRate.toFixed(6),
        accumulated: accumulated.toFixed(6),
        last_claim: lastClaim?.toISOString() || null,
        can_claim: accumulated >= 0.001, // Минимум для клейма
        next_claim_available: lastClaim 
          ? new Date(lastClaim.getTime() + (24 * 60 * 60 * 1000)).toISOString() // 24 часа
          : null
      };
    } catch (error) {
      logger.error('[FarmingService] Ошибка получения данных фарминга', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async startFarming(telegramId: string, amount?: string): Promise<boolean> {
    try {
      const user = await UserRepository.findByTelegramId(telegramId);
      if (!user) return false;

      return await UserRepository.updateFarmingTimestamps(user.id.toString(), {
        uni_farming_start_timestamp: new Date(),
        uni_farming_last_update: new Date()
      });
    } catch (error) {
      logger.error('[FarmingService] Ошибка запуска фарминга', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async stopFarming(telegramId: string): Promise<boolean> {
    try {
      const user = await UserRepository.findByTelegramId(telegramId);
      if (!user) return false;

      return await UserRepository.updateFarmingTimestamps(user.id.toString(), {
        uni_farming_start_timestamp: null,
        uni_farming_last_update: new Date()
      });
    } catch (error) {
      logger.error('[FarmingService] Ошибка остановки фарминга', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async claimRewards(telegramId: string): Promise<{ amount: string; claimed: boolean }> {
    try {
      const user = await UserRepository.requireByTelegramId(telegramId);
      
      if (!user.uni_farming_start_timestamp) {
        return { amount: "0", claimed: false };
      }

      // Расчет времени фарминга в часах
      const now = new Date();
      const farmingStart = new Date(user.uni_farming_start_timestamp);
      const farmingHours = (now.getTime() - farmingStart.getTime()) / (1000 * 60 * 60);

      if (farmingHours < 1) {
        return { amount: "0", claimed: false };
      }

      // Расчет базового вознаграждения (0.5% в сутки)
      const depositAmount = user.uni_deposit_amount || "0";
      
      const baseReward = RewardCalculationLogic.calculateFarmingReward(
        depositAmount,
        farmingHours
      );

      if (parseFloat(baseReward) <= 0) {
        return { amount: "0", claimed: false };
      }

      // Обновляем баланс пользователя
      const previousBalance = parseFloat(user.balance_uni || "0");
      const newBalance = String(previousBalance + parseFloat(baseReward));
      const timestamp = new Date().toISOString();
      
      await db
        .update(users)
        .set({ 
          balance_uni: newBalance,
          uni_farming_start_timestamp: now, // Сбрасываем время для нового цикла
          uni_farming_last_update: now
        })
        .where(sql`${users.telegram_id} = ${Number(telegramId)}`);

      // ЛОГИРОВАНИЕ РУЧНОГО КЛЕЙМА (LEGACY)
      logger.info(`[FARMING] User ${user.id} claimed ${baseReward} UNI at ${timestamp}`, {
        userId: user.id.toString(),
        telegramId,
        amount: baseReward,
        currency: 'UNI',
        previousBalance: previousBalance.toFixed(8),
        newBalance,
        farmingHours: farmingHours.toFixed(2),
        operation: 'manual_claim',
        timestamp
      });

      // Записываем транзакцию о начислении
      await db
        .insert(transactions)
        .values({
          user_id: user.id,
          transaction_type: 'farming_reward',
          currency: 'UNI',
          amount: baseReward,
          description: `Farming reward for ${farmingHours.toFixed(2)} hours`,
          status: 'confirmed'
        });

      logger.debug(`[FARMING] Manual claim transaction recorded for user ${user.id}`, {
        userId: user.id.toString(),
        transactionType: 'farming_reward',
        amount: baseReward,
        timestamp
      });

      // Распределяем реферальные вознаграждения
      await ReferralRewardDistribution.distributeFarmingRewards(user.id.toString(), baseReward);

      return { amount: baseReward, claimed: true };
    } catch (error) {
      logger.error('[FarmingService] Ошибка получения наград', { error: error instanceof Error ? error.message : String(error) });
      return { amount: "0", claimed: false };
    }
  }

  async getFarmingStatus(userId: string): Promise<{
    isActive: boolean;
    currentAmount: string;
    rate: string;
    lastUpdate: string | null;
    canHarvest: boolean;
    estimatedReward: string;
  }> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user) {
        return { 
          isActive: false, 
          currentAmount: "0", 
          rate: "0", 
          lastUpdate: null, 
          canHarvest: false, 
          estimatedReward: "0" 
        };
      }

      return {
        isActive: !!user.uni_farming_start_timestamp,
        currentAmount: user.uni_farming_balance || "0",
        rate: user.uni_farming_rate || "0",
        lastUpdate: user.uni_farming_last_update?.toISOString() || null,
        canHarvest: !!user.uni_farming_balance && parseFloat(user.uni_farming_balance) > 0,
        estimatedReward: user.uni_farming_balance || "0"
      };
    } catch (error) {
      logger.error('[FarmingService] Ошибка получения статуса', { error: error instanceof Error ? error.message : String(error) });
      return { 
        isActive: false, 
        currentAmount: "0", 
        rate: "0", 
        lastUpdate: null, 
        canHarvest: false, 
        estimatedReward: "0" 
      };
    }
  }

  async getFarmingHistory(telegramId: string): Promise<Array<{
    amount: string;
    source: string;
    timestamp: string;
  }>> {
    try {
      const user = await UserRepository.findByTelegramId(telegramId);
      if (!user) {
        return [];
      }

      const farmingTransactions = await db
        .select({
          amount: transactions.amount,
          type: transactions.type,
          timestamp: transactions.timestamp
        })
        .from(transactions)
        .where(eq(transactions.user_id, user.id))
        .orderBy(sql`${transactions.timestamp} DESC`)
        .limit(50);

      const history = farmingTransactions
        .filter(tx => tx.type && tx.type.includes('farming'))
        .map(tx => ({
          amount: tx.amount || '0',
          source: tx.type || 'farming_reward',
          timestamp: tx.timestamp?.toISOString() || new Date().toISOString()
        }));

      logger.info('[FarmingService] История фарминга получена', {
        telegram_id: telegramId,
        user_id: user.id,
        transactions_count: history.length
      });

      return history;
    } catch (error) {
      logger.error('[FarmingService] Ошибка получения истории фарминга', { 
        error: error instanceof Error ? error.message : String(error),
        telegram_id: telegramId
      });
      return [];
    }
  }

  async depositUniForFarming(telegramId: string, amount: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await UserRepository.findByTelegramId(telegramId);
      if (!user) {
        return { success: false, message: 'Пользователь не найден' };
      }

      const depositAmount = parseFloat(amount);
      if (depositAmount <= 0) {
        return { success: false, message: 'Некорректная сумма депозита' };
      }

      const currentBalance = parseFloat(user.balance_uni || '0');
      if (currentBalance < depositAmount) {
        return { success: false, message: 'Недостаточно средств' };
      }

      // Вычитаем из баланса и добавляем в фарминг
      const newBalance = (currentBalance - depositAmount).toFixed(8);
      const currentFarmingBalance = parseFloat(user.uni_farming_balance || '0');
      const newFarmingBalance = (currentFarmingBalance + depositAmount).toFixed(8);

      await db
        .update(users)
        .set({
          balance_uni: newBalance,
          uni_farming_balance: newFarmingBalance,
          uni_farming_start_timestamp: new Date(),
          uni_farming_last_update: new Date()
        })
        .where(eq(users.id, user.id));

      logger.info(`[UNI FARMING] User ${telegramId} deposited ${amount} UNI for farming`, {
        userId: user.id,
        telegramId,
        amount,
        previousBalance: currentBalance.toFixed(8),
        newBalance,
        newFarmingBalance,
        operation: 'uni_farming_deposit',
        timestamp: new Date().toISOString()
      });

      return { success: true, message: 'Депозит успешно добавлен в фарминг' };
    } catch (error) {
      logger.error('[FarmingService] Ошибка депозита UNI:', error);
      return { success: false, message: 'Ошибка при обработке депозита' };
    }
  }

  async harvestUniFarming(telegramId: string): Promise<{ success: boolean; amount: string; message: string }> {
    try {
      const user = await UserRepository.findByTelegramId(telegramId);
      if (!user) {
        return { success: false, amount: '0', message: 'Пользователь не найден' };
      }

      const farmingBalance = parseFloat(user.uni_farming_balance || '0');
      if (farmingBalance <= 0) {
        return { success: false, amount: '0', message: 'Нет средств для сбора' };
      }

      // Переводим средства из фарминга обратно в баланс
      const currentBalance = parseFloat(user.balance_uni || '0');
      const newBalance = (currentBalance + farmingBalance).toFixed(8);

      await db
        .update(users)
        .set({
          balance_uni: newBalance,
          uni_farming_balance: '0',
          uni_farming_start_timestamp: null,
          uni_farming_last_update: new Date()
        })
        .where(eq(users.id, user.id));

      logger.info(`[UNI FARMING] User ${telegramId} harvested ${farmingBalance} UNI from farming`, {
        userId: user.id,
        telegramId,
        amount: farmingBalance.toFixed(8),
        previousBalance: currentBalance.toFixed(8),
        newBalance,
        operation: 'uni_farming_harvest',
        timestamp: new Date().toISOString()
      });

      return { 
        success: true, 
        amount: farmingBalance.toFixed(8), 
        message: 'Средства успешно собраны с фарминга' 
      };
    } catch (error) {
      logger.error('[FarmingService] Ошибка сбора UNI:', error);
      return { success: false, amount: '0', message: 'Ошибка при сборе средств' };
    }
  }
}