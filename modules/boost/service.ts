import { db } from '../../server/db.js';
import { users, transactions } from '../../shared/schema.js';
import { boostPackages, userBoosts } from './model.js';
import { eq, and, desc } from 'drizzle-orm';
import { TonBoostCalculation } from './logic/tonBoostCalculation';
import { logger } from '../../core/logger.js';

interface BoostPackageData {
  id: number;
  name: string;
  description: string;
  daily_rate: number;
  duration_days: number;
  min_amount: number;
  max_amount: number;
  is_active: boolean;
}

interface UserBoostData {
  id: number;
  package_id: number;
  start_date: Date;
  end_date: Date;
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
      const timestamp = new Date().toISOString();

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
        logger.warn(`[BOOST] Claim rejected for user ${userId}: boost ${boostId} not found`, {
          userId,
          boostId,
          reason: 'boost_not_found',
          timestamp
        });
        return { amount: '0', claimed: false };
      }

      // Проверяем не истек ли буст
      if (boost.expires_at < new Date()) {
        // Деактивируем истекший буст
        await db
          .update(userBoosts)
          .set({ is_active: false })
          .where(eq(userBoosts.id, parseInt(boostId)));

        logger.warn(`[BOOST] Claim rejected for user ${userId}: boost ${boostId} expired`, {
          userId,
          boostId,
          expiresAt: boost.expires_at.toISOString(),
          reason: 'boost_expired',
          timestamp
        });
        return { amount: '0', claimed: false };
      }

      // Получаем информацию о пакете для расчета награды
      const [packageInfo] = await db
        .select()
        .from(boostPackages)
        .where(eq(boostPackages.id, boost.boost_package_id))
        .limit(1);

      if (!packageInfo) {
        logger.error(`[BOOST] Package not found for boost ${boostId}`, {
          userId,
          boostId,
          packageId: boost.boost_package_id,
          timestamp
        });
        return { amount: '0', claimed: false };
      }

      // Рассчитываем реальную награду на основе времени и множителя
      const currentTime = new Date();
      const boostStart = boost.started_at || currentTime;
      const hoursActive = (currentTime.getTime() - boostStart.getTime()) / (1000 * 60 * 60);
      const baseReward = Math.min(hoursActive * 0.001 * parseFloat(packageInfo.multiplier), 0.1);
      const rewardAmount = baseReward.toFixed(8);

      if (parseFloat(rewardAmount) <= 0) {
        logger.warn(`[BOOST] No reward available for user ${userId} boost ${boostId}`, {
          userId,
          boostId,
          hoursActive: hoursActive.toFixed(2),
          reason: 'no_reward_available',
          timestamp
        });
        return { amount: '0', claimed: false };
      }

      // Получаем текущий баланс пользователя
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user) {
        logger.error(`[BOOST] User ${userId} not found for boost reward`, {
          userId,
          boostId,
          timestamp
        });
        return { amount: '0', claimed: false };
      }

      const previousBalance = parseFloat(user.balance_ton || "0");
      const newBalance = (previousBalance + parseFloat(rewardAmount)).toFixed(8);

      // Обновляем баланс пользователя
      await db
        .update(users)
        .set({ balance_ton: newBalance })
        .where(eq(users.id, parseInt(userId)));

      // ОСНОВНОЕ ЛОГИРОВАНИЕ ДОХОДНОЙ ОПЕРАЦИИ БУСТА
      logger.info(`[BOOST] User ${userId} earned ${rewardAmount} TON from boost at ${timestamp}`, {
        userId,
        boostId,
        amount: rewardAmount,
        currency: 'TON',
        previousBalance: previousBalance.toFixed(8),
        newBalance,
        packageName: packageInfo.name,
        multiplier: parseFloat(packageInfo.multiplier),
        hoursActive: hoursActive.toFixed(2),
        operation: 'boost_reward',
        timestamp
      });

      // Записываем транзакцию
      await db
        .insert(transactions)
        .values({
          user_id: parseInt(userId),
          transaction_type: 'boost_reward',
          currency: 'TON',
          amount: rewardAmount,
          description: `Boost reward from ${packageInfo.name}`,
          status: 'confirmed'
        } as any);

      logger.debug(`[BOOST] Reward transaction recorded for user ${userId}`, {
        userId,
        boostId,
        transactionType: 'boost_reward',
        amount: rewardAmount,
        timestamp
      });

      return {
        amount: rewardAmount,
        claimed: true
      };
    } catch (error) {
      logger.error(`[BOOST] Critical error during reward claim for user ${userId}`, {
        userId,
        boostId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
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

  async getBoostPackages(): Promise<BoostPackageData[]> {
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
      console.error('[BoostService] Ошибка получения пакетов бустов:', error);
      return [];
    }
  }
}