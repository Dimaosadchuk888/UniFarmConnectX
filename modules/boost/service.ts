import { db } from '../../core/db';
import { boostPackages, userBoosts, users } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { TonBoostCalculation } from './logic/tonBoostCalculation';

interface BoostPackageData {
  id: number;
  name: string;
  description: string;
  multiplier: number;
  duration_hours: number;
  price_ton: number;
  is_active: boolean;
}

interface UserBoostData {
  id: number;
  boost_package_id: number;
  started_at: Date | null;
  expires_at: Date;
  is_active: boolean;
}

interface PurchaseResult {
  success: boolean;
  boost?: UserBoostData;
}

interface ClaimResult {
  amount: string;
  claimed: boolean;
}

export class BoostService {
  async getAvailableBoosts(): Promise<BoostPackageData[]> {
    try {
      const packages = await db
        .select()
        .from(boostPackages)
        .where(eq(boostPackages.is_active, true));

      return packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description || '',
        multiplier: parseFloat(pkg.multiplier),
        duration_hours: pkg.duration_hours,
        price_ton: parseFloat(pkg.price_ton),
        is_active: pkg.is_active || false
      }));
    } catch (error) {
      console.error('[BoostService] Ошибка получения доступных бустов:', error);
      return [];
    }
  }

  async purchaseBoost(userId: string, packageId: number, amount: string): Promise<PurchaseResult> {
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

      // Создаем буст
      const endDate = new Date();
      endDate.setHours(endDate.getHours() + packageInfo.duration_hours);

      const [newBoost] = await db
        .insert(userBoosts)
        .values({
          user_id: parseInt(userId),
          boost_package_id: packageId,
          started_at: new Date(),
          expires_at: endDate,
          is_active: true
        })
        .returning();

      return {
        success: true,
        boost: {
          id: newBoost.id,
          boost_package_id: packageId,
          started_at: newBoost.started_at,
          expires_at: newBoost.expires_at,
          is_active: newBoost.is_active || false
        }
      };
    } catch (error) {
      console.error('[BoostService] Ошибка покупки буста:', error);
      return { success: false };
    }
  }

  async getUserActiveBoosts(userId: string): Promise<UserBoostData[]> {
    try {
      const boosts = await db
        .select()
        .from(userBoosts)
        .where(and(
          eq(userBoosts.user_id, parseInt(userId)),
          eq(userBoosts.is_active, true)
        ))
        .orderBy(desc(userBoosts.created_at));

      return boosts.map(boost => ({
        id: boost.id,
        boost_package_id: boost.boost_package_id,
        started_at: boost.started_at,
        expires_at: boost.expires_at,
        is_active: boost.is_active || false
      }));
    } catch (error) {
      console.error('[BoostService] Ошибка получения активных бустов:', error);
      return [];
    }
  }

  async claimBoostRewards(userId: string, boostId: string): Promise<ClaimResult> {
    try {
      // Проверяем существование буста
      const [boost] = await db
        .select()
        .from(userBoosts)
        .where(and(
          eq(userBoosts.id, parseInt(boostId)),
          eq(userBoosts.user_id, parseInt(userId)),
          eq(userBoosts.is_active, true)
        ))
        .limit(1);

      if (!boost) {
        return { amount: '0', claimed: false };
      }

      // Проверяем не истек ли буст
      if (boost.expires_at < new Date()) {
        // Деактивируем истекший буст
        await db
          .update(userBoosts)
          .set({ is_active: false })
          .where(eq(userBoosts.id, parseInt(boostId)));

        return { amount: '0', claimed: false };
      }

      // Рассчитываем награду (заглушка)
      const rewardAmount = '0.001';

      return {
        amount: rewardAmount,
        claimed: true
      };
    } catch (error) {
      console.error('[BoostService] Ошибка получения наград буста:', error);
      return { amount: '0', claimed: false };
    }
  }

  async getBoostHistory(userId: string): Promise<UserBoostData[]> {
    try {
      const history = await db
        .select()
        .from(userBoosts)
        .where(eq(userBoosts.user_id, parseInt(userId)))
        .orderBy(desc(userBoosts.created_at));

      return history.map(boost => ({
        id: boost.id,
        boost_package_id: boost.boost_package_id,
        started_at: boost.started_at,
        expires_at: boost.expires_at,
        is_active: boost.is_active || false
      }));
    } catch (error) {
      console.error('[BoostService] Ошибка получения истории бустов:', error);
      return [];
    }
  }
}