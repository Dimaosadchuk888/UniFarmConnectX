import { db } from '../../core/db';
import { users, farmingDeposits, transactions } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { RewardCalculationLogic } from './logic/rewardCalculation';
import { ReferralRewardDistribution } from '../referral/logic/rewardDistribution';

export class FarmingService {
  async getFarmingDataByTelegramId(telegramId: string): Promise<{
    rate: string;
    accumulated: string;
    last_claim: string | null;
    can_claim: boolean;
    next_claim_available: string | null;
  }> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegram_id, parseInt(telegramId)))
        .limit(1);

      if (!user) {
        return {
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
      const baseRate = 0.001;
      const hoursElapsed = lastClaim 
        ? (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60)
        : (now.getTime() - farmingStart.getTime()) / (1000 * 60 * 60);
      
      const accumulated = Math.max(0, hoursElapsed * baseRate);
      
      return {
        rate: baseRate.toFixed(6),
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

  async startFarming(userId: string, amount?: string): Promise<boolean> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user) return false;

      await db
        .update(users)
        .set({ 
          uni_farming_start_timestamp: new Date(),
          uni_farming_last_update: new Date()
        })
        .where(eq(users.id, parseInt(userId)));

      return true;
    } catch (error) {
      console.error('[FarmingService] Ошибка запуска фарминга:', error);
      return false;
    }
  }

  async stopFarming(userId: string): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ 
          uni_farming_start_timestamp: null,
          uni_farming_last_update: new Date()
        })
        .where(eq(users.id, parseInt(userId)));

      return true;
    } catch (error) {
      console.error('[FarmingService] Ошибка остановки фарминга:', error);
      return false;
    }
  }

  async claimRewards(telegramId: string): Promise<{ amount: string; claimed: boolean }> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegram_id, parseInt(telegramId)))
        .limit(1);

      if (!user || !user.uni_farming_start_timestamp) {
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
        .where(eq(users.telegram_id, parseInt(telegramId)));

      // Записываем транзакцию о начислении
      await db
        .insert(transactions)
        .values({
          user_id: user.id,
          type: 'farming_reward',
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

  async getFarmingStatus(userId: string): Promise<any> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user) {
        return { isActive: false, startTime: null, pendingRewards: "0" };
      }

      return {
        isActive: !!user.uni_farming_start_timestamp,
        startTime: user.uni_farming_start_timestamp,
        pendingRewards: user.uni_farming_balance || "0",
        depositAmount: user.uni_deposit_amount || "0",
        farmingRate: user.uni_farming_rate || "0"
      };
    } catch (error) {
      console.error('[FarmingService] Ошибка получения статуса:', error);
      return { isActive: false, startTime: null, pendingRewards: "0" };
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