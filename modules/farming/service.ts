import { db } from '../../server/db';
import { users, farmingDeposits } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export class FarmingService {
  async startFarming(userId: string): Promise<boolean> {
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

  async claimRewards(userId: string): Promise<{ amount: string; claimed: boolean }> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user || !user.uni_farming_balance) {
        return { amount: "0", claimed: false };
      }

      const rewardAmount = user.uni_farming_balance;
      
      await db
        .update(users)
        .set({ 
          balance_uni: String(parseFloat(user.balance_uni || "0") + parseFloat(rewardAmount)),
          uni_farming_balance: "0",
          uni_farming_last_update: new Date()
        })
        .where(eq(users.id, parseInt(userId)));

      return { amount: rewardAmount, claimed: true };
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