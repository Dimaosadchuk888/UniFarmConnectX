import { db } from '../../core/db';
import { boostPackages, userBoosts, users } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { TonBoostCalculation } from './logic/tonBoostCalculation';

export class BoostService {
  async getAvailableBoosts(): Promise<any[]> {
    try {
      const packages = await db
        .select()
        .from(boostPackages)
        .where(eq(boostPackages.is_active, true));

      return packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price_uni: parseFloat(pkg.price_uni),
        rate_multiplier: parseFloat(pkg.rate_multiplier),
        duration_days: pkg.duration_days || 365,
        is_active: pkg.is_active
      }));
    } catch (error) {
      console.error('[BoostService] Ошибка получения доступных бустов:', error);
      return [];
    }
  }

  async purchaseBoost(userId: string, packageId: number, amount: string): Promise<{ success: boolean; boost?: any }> {
    try {
      // Проверяем существование пакета
      const [packageInfo] = await db
        .select()
        .from(boostPackages)
        .where(and(
          eq(boostPackages.id, packageId),
          eq(boostPackages.is_active, true)
        ))
        .limit(1);

      if (!packageInfo) {
        return { success: false };
      }

      // Проверяем баланс пользователя
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user) {
        return { success: false };
      }

      const userBalance = parseFloat(user.balance_uni || "0");
      const requiredAmount = parseFloat(amount);

      if (userBalance < requiredAmount) {
        return { success: false };
      }

      // Создаем буст
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (packageInfo.duration_days || 365));

      const [newBoost] = await db
        .insert(userBoosts)
        .values({
          user_id: parseInt(userId),
          package_id: packageId,
          amount: amount,
          daily_rate: packageInfo.rate_multiplier, // Используем rate_multiplier как daily_rate
          start_date: new Date(),
          end_date: endDate,
          is_active: true
        })
        .returning();

      // Списываем средства с баланса
      const newBalance = (userBalance - requiredAmount).toString();
      await db
        .update(users)
        .set({ balance_uni: newBalance })
        .where(eq(users.id, parseInt(userId)));

      return {
        success: true,
        boost: {
          id: newBoost.id,
          package_id: packageId,
          amount: amount,
          daily_rate: parseFloat(packageInfo.rate_multiplier),
          start_date: newBoost.start_date,
          end_date: newBoost.end_date,
          is_active: true
        }
      };
    } catch (error) {
      console.error('[BoostService] Ошибка покупки буста:', error);
      return { success: false };
    }
  }

  async getUserActiveBoosts(userId: string): Promise<any[]> {
    try {
      const activeBoosts = await db
        .select({
          id: userBoosts.id,
          package_id: userBoosts.package_id,
          amount: userBoosts.amount,
          daily_rate: userBoosts.daily_rate,
          start_date: userBoosts.start_date,
          end_date: userBoosts.end_date,
          last_claim: userBoosts.last_claim,
          total_earned: userBoosts.total_earned,
          package_name: boostPackages.name
        })
        .from(userBoosts)
        .leftJoin(boostPackages, eq(userBoosts.package_id, boostPackages.id))
        .where(and(
          eq(userBoosts.user_id, parseInt(userId)),
          eq(userBoosts.is_active, true)
        ))
        .orderBy(desc(userBoosts.created_at));

      return activeBoosts.map(boost => ({
        id: boost.id,
        package_id: boost.package_id,
        package_name: boost.package_name,
        amount: parseFloat(boost.amount),
        daily_rate: parseFloat(boost.daily_rate),
        start_date: boost.start_date,
        end_date: boost.end_date,
        last_claim: boost.last_claim,
        total_earned: parseFloat(boost.total_earned || "0"),
        is_active: new Date() < new Date(boost.end_date!)
      }));
    } catch (error) {
      console.error('[BoostService] Ошибка получения активных бустов:', error);
      return [];
    }
  }

  async claimBoostRewards(userId: string, boostId: string): Promise<{ amount: string; claimed: boolean }> {
    try {
      const [boost] = await db
        .select()
        .from(userBoosts)
        .where(and(
          eq(userBoosts.id, parseInt(boostId)),
          eq(userBoosts.user_id, parseInt(userId)),
          eq(userBoosts.is_active, true)
        ))
        .limit(1);

      if (!boost || new Date() > new Date(boost.end_date!)) {
        return { amount: "0", claimed: false };
      }

      // Расчет времени с последнего клейма
      const now = new Date();
      const lastClaim = boost.last_claim ? new Date(boost.last_claim) : new Date(boost.start_date!);
      const hoursElapsed = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);

      if (hoursElapsed < 1) {
        return { amount: "0", claimed: false };
      }

      // Расчет награды
      const dailyRate = parseFloat(boost.daily_rate);
      const amount = parseFloat(boost.amount);
      const reward = (amount * dailyRate * hoursElapsed) / 24;

      if (reward <= 0) {
        return { amount: "0", claimed: false };
      }

      // Обновляем данные буста
      const newTotalEarned = (parseFloat(boost.total_earned || "0") + reward).toString();
      await db
        .update(userBoosts)
        .set({
          last_claim: now,
          total_earned: newTotalEarned
        })
        .where(eq(userBoosts.id, parseInt(boostId)));

      // Начисляем награду пользователю
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (user) {
        const newBalance = (parseFloat(user.balance_uni || "0") + reward).toString();
        await db
          .update(users)
          .set({ balance_uni: newBalance })
          .where(eq(users.id, parseInt(userId)));
      }

      return { amount: reward.toFixed(8), claimed: true };
    } catch (error) {
      console.error('[BoostService] Ошибка получения награды буста:', error);
      return { amount: "0", claimed: false };
    }
  }

  async getBoostHistory(userId: string): Promise<any[]> {
    try {
      const history = await db
        .select({
          id: userBoosts.id,
          package_id: userBoosts.package_id,
          amount: userBoosts.amount,
          daily_rate: userBoosts.daily_rate,
          start_date: userBoosts.start_date,
          end_date: userBoosts.end_date,
          total_earned: userBoosts.total_earned,
          is_active: userBoosts.is_active,
          package_name: boostPackages.name
        })
        .from(userBoosts)
        .leftJoin(boostPackages, eq(userBoosts.package_id, boostPackages.id))
        .where(eq(userBoosts.user_id, parseInt(userId)))
        .orderBy(desc(userBoosts.created_at));

      return history.map(boost => ({
        id: boost.id,
        package_id: boost.package_id,
        package_name: boost.package_name,
        amount: parseFloat(boost.amount),
        daily_rate: parseFloat(boost.daily_rate),
        start_date: boost.start_date,
        end_date: boost.end_date,
        total_earned: parseFloat(boost.total_earned || "0"),
        is_active: boost.is_active,
        status: new Date() > new Date(boost.end_date!) ? 'expired' : 'active'
      }));
    } catch (error) {
      console.error('[BoostService] Ошибка получения истории бустов:', error);
      return [];
    }
  }
}