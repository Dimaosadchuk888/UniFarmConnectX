import { db } from '../../server/db.js';
import { users, farmingDeposits, transactions } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { UserRepository } from '@/core/repositories/UserRepository';
import { RewardCalculationLogic } from './logic/rewardCalculation';
import { ReferralRewardDistribution } from '../referral/logic/rewardDistribution';

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
      console.error('[FarmingService] Ошибка получения данных фарминга:', error);
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
      console.error('[FarmingService] Ошибка запуска фарминга:', error);
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
      console.error('[FarmingService] Ошибка остановки фарминга:', error);
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
      const newBalance = String(parseFloat(user.balance_uni || "0") + parseFloat(baseReward));
      
      await db
        .update(users)
        .set({ 
          balance_uni: newBalance,
          uni_farming_start_timestamp: now, // Сбрасываем время для нового цикла
          uni_farming_last_update: now
        })
        .where(eq(users.telegram_id, telegramId));

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

      // Распределяем реферальные вознаграждения
      await ReferralRewardDistribution.distributeFarmingRewards(user.id.toString(), baseReward);

      return { amount: baseReward, claimed: true };
    } catch (error) {
      console.error('[FarmingService] Ошибка получения наград:', error);
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
      console.error('[FarmingService] Ошибка получения статуса:', error);
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

  async getFarmingHistory(userId: string): Promise<any[]> {
    try {
      const deposits = await db
        .select()
        .from(farmingDeposits)
        .where(eq(farmingDeposits.user_id, parseInt(userId)));

      return deposits;
    } catch (error) {
      console.error('[FarmingService] Ошибка получения истории:', error);
      return [];
    }
  }
}