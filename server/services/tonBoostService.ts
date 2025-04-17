import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { 
  tonBoostDeposits, 
  type TonBoostDeposit, 
  type InsertTonBoostDeposit,
  transactions,
  users
} from "@shared/schema";
import BigNumber from "bignumber.js";

/**
 * Модель буст-пакета для TON
 */
interface TonBoostPackage {
  id: number;
  name: string;
  priceTon: string;    // Стоимость в TON
  bonusUni: string;    // Бонус UNI, который получит пользователь
  rateTon: string;     // Доходность в TON (% в день)
  rateUni: string;     // Дополнительная доходность в UNI (% в день), может быть 0
}

/**
 * Результат покупки буста
 */
interface PurchaseTonBoostResult {
  success: boolean;
  message: string;
  boostPackage?: TonBoostPackage;
  transactionId?: number;
  depositId?: number;
}

/**
 * Результат обновления фарминга
 */
export interface TonFarmingUpdateResult {
  totalTonDepositAmount: string;
  totalTonRatePerSecond: string;
  totalUniRatePerSecond: string;
  earnedTonThisUpdate: string;
  earnedUniThisUpdate: string;
  depositCount: number;
}

/**
 * Информация о TON фарминге
 */
export interface TonFarmingInfo {
  isActive: boolean;
  totalTonDepositAmount: string;
  depositCount: number;
  totalTonRatePerSecond: string;
  totalUniRatePerSecond: string;
  dailyIncomeTon: string;
  dailyIncomeUni: string;
  deposits: TonBoostDeposit[];
}

/**
 * Сервис для работы с TON Boost-пакетами
 */
export class TonBoostService {
  // Константы для расчетов
  private static readonly SECONDS_IN_DAY = 86400;
  private static readonly TON_MIN_CHANGE_THRESHOLD = 0.000001; // Минимальный порог изменения для обновления баланса в БД
  
  // Каталог буст-пакетов
  private static readonly boostPackages: TonBoostPackage[] = [
    {
      id: 1,
      name: "Small Boost",
      priceTon: "1.0",
      bonusUni: "100.0",
      rateTon: "0.1",    // 0.1% в день для TON
      rateUni: "0.0"     // Нет дополнительного бонуса в UNI
    },
    {
      id: 2,
      name: "Medium Boost",
      priceTon: "5.0",
      bonusUni: "600.0",
      rateTon: "0.2",    // 0.2% в день для TON
      rateUni: "0.05"    // 0.05% в день для UNI
    },
    {
      id: 3,
      name: "Large Boost",
      priceTon: "10.0",
      bonusUni: "1300.0",
      rateTon: "0.3",    // 0.3% в день для TON
      rateUni: "0.1"     // 0.1% в день для UNI
    },
    {
      id: 4,
      name: "Mega Boost",
      priceTon: "25.0",
      bonusUni: "4000.0",
      rateTon: "0.5",    // 0.5% в день для TON
      rateUni: "0.2"     // 0.2% в день для UNI
    }
  ];

  /**
   * Получает список всех доступных буст-пакетов
   * @returns Список буст-пакетов
   */
  static getBoostPackages(): TonBoostPackage[] {
    return this.boostPackages;
  }

  /**
   * Получает буст-пакет по ID
   * @param boostId ID буст-пакета
   * @returns Буст-пакет или undefined, если не найден
   */
  static getBoostPackageById(boostId: number): TonBoostPackage | undefined {
    return this.boostPackages.find(pkg => pkg.id === boostId);
  }

  /**
   * Получает все активные TON Boost-депозиты пользователя
   * @param userId ID пользователя
   * @returns Список активных TON Boost-депозитов
   */
  static async getUserActiveBoosts(userId: number): Promise<TonBoostDeposit[]> {
    const userDeposits = await db
      .select()
      .from(tonBoostDeposits)
      .where(
        and(
          eq(tonBoostDeposits.user_id, userId),
          eq(tonBoostDeposits.is_active, true)
        )
      );

    return userDeposits;
  }

  /**
   * Создает запись о TON Boost-депозите
   * @param depositData Данные депозита
   * @returns Созданный депозит
   */
  static async createTonBoostDeposit(depositData: InsertTonBoostDeposit): Promise<TonBoostDeposit> {
    const [deposit] = await db
      .insert(tonBoostDeposits)
      .values(depositData)
      .returning();
    
    return deposit;
  }

  /**
   * Рассчитывает скорость начисления TON и UNI в секунду
   * @param amount Сумма депозита TON
   * @param rateTonPerDay Доходность TON в день (%)
   * @param rateUniPerDay Доходность UNI в день (%)
   * @returns Объект с двумя ставками - для TON и UNI
   */
  static calculateRatesPerSecond(amount: string, rateTonPerDay: string, rateUniPerDay: string): { 
    tonRatePerSecond: string, 
    uniRatePerSecond: string 
  } {
    // Расчет для TON: amount * (rateTonPerDay / 100) / SECONDS_IN_DAY
    const tonRatePerSecond = new BigNumber(amount)
      .multipliedBy(new BigNumber(rateTonPerDay).dividedBy(100))
      .dividedBy(this.SECONDS_IN_DAY)
      .toString();

    // Расчет для UNI (может быть 0): amount * (rateUniPerDay / 100) / SECONDS_IN_DAY
    const uniRatePerSecond = new BigNumber(amount)
      .multipliedBy(new BigNumber(rateUniPerDay).dividedBy(100))
      .dividedBy(this.SECONDS_IN_DAY)
      .toString();

    return { tonRatePerSecond, uniRatePerSecond };
  }

  /**
   * Покупает TON буст-пакет для пользователя
   * @param userId ID пользователя
   * @param boostId ID буст-пакета
   * @returns Результат покупки
   */
  static async purchaseTonBoost(userId: number, boostId: number): Promise<PurchaseTonBoostResult> {
    try {
      // Получаем информацию о буст-пакете
      const boostPackage = this.getBoostPackageById(boostId);
      if (!boostPackage) {
        return {
          success: false,
          message: "Выбранный буст-пакет не найден"
        };
      }

      // Получаем информацию о пользователе
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return {
          success: false,
          message: "Пользователь не найден"
        };
      }

      // Проверяем достаточно ли средств
      const userTonBalance = new BigNumber(user.balance_ton || "0");
      const boostPrice = new BigNumber(boostPackage.priceTon);

      if (userTonBalance.isLessThan(boostPrice)) {
        return {
          success: false,
          message: "Недостаточно средств на балансе"
        };
      }

      // Транзакция для списания средств
      // 1. Обновляем баланс пользователя
      const newTonBalance = userTonBalance.minus(boostPrice).toString();
      await db
        .update(users)
        .set({
          balance_ton: newTonBalance
        })
        .where(eq(users.id, userId));

      // 2. Создаем транзакцию списания TON
      const [withdrawTransaction] = await db
        .insert(transactions)
        .values({
          user_id: userId,
          type: "boost_purchase",
          currency: "TON",
          amount: boostPrice.negated().toString(),
          status: "confirmed"
        })
        .returning();
      
      // 3. Рассчитываем скорость начисления TON и UNI
      const { tonRatePerSecond, uniRatePerSecond } = this.calculateRatesPerSecond(
        boostPackage.priceTon,
        boostPackage.rateTon,
        boostPackage.rateUni
      );

      // 4. Создаем новый TON Boost-депозит
      const [deposit] = await db
        .insert(tonBoostDeposits)
        .values({
          user_id: userId,
          ton_amount: boostPackage.priceTon,
          bonus_uni: boostPackage.bonusUni,
          rate_ton_per_second: tonRatePerSecond,
          rate_uni_per_second: uniRatePerSecond,
          is_active: true
        })
        .returning();

      // 5. Начисляем бонус UNI пользователю
      const userUniBalance = new BigNumber(user.balance_uni || "0");
      const bonusUni = new BigNumber(boostPackage.bonusUni);
      const newUniBalance = userUniBalance.plus(bonusUni).toString();

      await db
        .update(users)
        .set({
          balance_uni: newUniBalance
        })
        .where(eq(users.id, userId));

      // 6. Создаем транзакцию начисления бонуса UNI
      const [bonusTransaction] = await db
        .insert(transactions)
        .values({
          user_id: userId,
          type: "boost_bonus",
          currency: "UNI",
          amount: bonusUni.toString(),
          status: "confirmed"
        })
        .returning();

      return {
        success: true,
        message: "Буст-пакет успешно приобретен",
        boostPackage,
        transactionId: withdrawTransaction.id,
        depositId: deposit.id
      };
    } catch (error) {
      console.error("[TonBoostService] Error purchasing boost:", error);
      return {
        success: false,
        message: "Произошла ошибка при покупке буст-пакета"
      };
    }
  }

  /**
   * Рассчитывает и обновляет баланс TON и UNI для всех активных TON Boost-депозитов пользователя
   * @param userId ID пользователя
   * @returns Результат обновления
   */
  static async calculateAndUpdateUserTonFarming(userId: number): Promise<TonFarmingUpdateResult> {
    try {
      // Получаем все активные буст-депозиты пользователя
      const activeDeposits = await this.getUserActiveBoosts(userId);
      
      if (activeDeposits.length === 0) {
        return {
          totalTonDepositAmount: "0",
          totalTonRatePerSecond: "0",
          totalUniRatePerSecond: "0",
          earnedTonThisUpdate: "0",
          earnedUniThisUpdate: "0",
          depositCount: 0
        };
      }

      // Получаем информацию о пользователе
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new Error(`Пользователь с ID ${userId} не найден`);
      }

      // Расчет общей суммы заблокированных TON и скорости начисления
      let totalTonDepositAmount = new BigNumber(0);
      let totalTonRatePerSecond = new BigNumber(0);
      let totalUniRatePerSecond = new BigNumber(0);
      let earnedTonThisUpdate = new BigNumber(0);
      let earnedUniThisUpdate = new BigNumber(0);

      const now = new Date();

      // Обновляем каждый депозит
      for (const deposit of activeDeposits) {
        totalTonDepositAmount = totalTonDepositAmount.plus(deposit.ton_amount);
        totalTonRatePerSecond = totalTonRatePerSecond.plus(deposit.rate_ton_per_second);
        totalUniRatePerSecond = totalUniRatePerSecond.plus(deposit.rate_uni_per_second);

        // Рассчитываем время с последнего обновления в секундах
        const lastUpdate = deposit.last_updated_at;
        const timeDiffMs = now.getTime() - lastUpdate.getTime();
        const timeDiffSec = Math.floor(timeDiffMs / 1000);

        if (timeDiffSec > 0) {
          // Рассчитываем заработанный TON и UNI
          const earnedTon = new BigNumber(deposit.rate_ton_per_second).multipliedBy(timeDiffSec);
          const earnedUni = new BigNumber(deposit.rate_uni_per_second).multipliedBy(timeDiffSec);
          
          earnedTonThisUpdate = earnedTonThisUpdate.plus(earnedTon);
          earnedUniThisUpdate = earnedUniThisUpdate.plus(earnedUni);

          // Обновляем время последнего обновления депозита
          await db
            .update(tonBoostDeposits)
            .set({
              last_updated_at: now
            })
            .where(eq(tonBoostDeposits.id, deposit.id));
        }
      }

      // Проверяем минимальный порог для начисления TON
      if (earnedTonThisUpdate.isGreaterThanOrEqualTo(this.TON_MIN_CHANGE_THRESHOLD)) {
        const newTonBalance = new BigNumber(user.balance_ton || "0").plus(earnedTonThisUpdate).toString();
        
        // Обновляем баланс TON
        await db
          .update(users)
          .set({
            balance_ton: newTonBalance
          })
          .where(eq(users.id, userId));
        
        // Создаем транзакцию начисления TON
        await db
          .insert(transactions)
          .values({
            user_id: userId,
            type: "boost_farming",
            currency: "TON",
            amount: earnedTonThisUpdate.toString(),
            status: "confirmed"
          });
        
        console.log(`[TonFarming] User ${userId} earned ${earnedTonThisUpdate.toString()} TON from boosts`);
      }

      // Проверяем минимальный порог для начисления UNI
      if (earnedUniThisUpdate.isGreaterThan(0)) {
        const newUniBalance = new BigNumber(user.balance_uni || "0").plus(earnedUniThisUpdate).toString();
        
        // Обновляем баланс UNI
        await db
          .update(users)
          .set({
            balance_uni: newUniBalance
          })
          .where(eq(users.id, userId));
        
        // Создаем транзакцию начисления UNI
        await db
          .insert(transactions)
          .values({
            user_id: userId,
            type: "boost_uni_reward",
            currency: "UNI",
            amount: earnedUniThisUpdate.toString(),
            status: "confirmed"
          });
        
        console.log(`[TonFarming] User ${userId} earned ${earnedUniThisUpdate.toString()} UNI from boosts`);
      }

      return {
        totalTonDepositAmount: totalTonDepositAmount.toString(),
        totalTonRatePerSecond: totalTonRatePerSecond.toString(),
        totalUniRatePerSecond: totalUniRatePerSecond.toString(),
        earnedTonThisUpdate: earnedTonThisUpdate.toString(),
        earnedUniThisUpdate: earnedUniThisUpdate.toString(),
        depositCount: activeDeposits.length
      };
    } catch (error) {
      console.error("[TonBoostService] Error calculating TON farming:", error);
      throw error;
    }
  }

  /**
   * Получает данные о TON фарминге пользователя
   * @param userId ID пользователя
   * @returns Информация о TON фарминге
   */
  static async getUserTonFarmingInfo(userId: number): Promise<TonFarmingInfo> {
    try {
      const activeDeposits = await this.getUserActiveBoosts(userId);
      
      if (activeDeposits.length === 0) {
        return {
          isActive: false,
          totalTonDepositAmount: "0",
          depositCount: 0,
          totalTonRatePerSecond: "0",
          totalUniRatePerSecond: "0",
          dailyIncomeTon: "0",
          dailyIncomeUni: "0",
          deposits: []
        };
      }

      // Расчет общей суммы заблокированных TON и скорости начисления
      let totalTonDepositAmount = new BigNumber(0);
      let totalTonRatePerSecond = new BigNumber(0);
      let totalUniRatePerSecond = new BigNumber(0);

      for (const deposit of activeDeposits) {
        totalTonDepositAmount = totalTonDepositAmount.plus(deposit.ton_amount);
        totalTonRatePerSecond = totalTonRatePerSecond.plus(deposit.rate_ton_per_second);
        totalUniRatePerSecond = totalUniRatePerSecond.plus(deposit.rate_uni_per_second);
      }

      // Расчет дневного дохода: rate_per_second * SECONDS_IN_DAY
      const dailyIncomeTon = totalTonRatePerSecond.multipliedBy(this.SECONDS_IN_DAY).toString();
      const dailyIncomeUni = totalUniRatePerSecond.multipliedBy(this.SECONDS_IN_DAY).toString();

      return {
        isActive: true,
        totalTonDepositAmount: totalTonDepositAmount.toString(),
        depositCount: activeDeposits.length,
        totalTonRatePerSecond: totalTonRatePerSecond.toString(),
        totalUniRatePerSecond: totalUniRatePerSecond.toString(),
        dailyIncomeTon,
        dailyIncomeUni,
        deposits: activeDeposits
      };
    } catch (error) {
      console.error("[TonBoostService] Error getting TON farming info:", error);
      throw error;
    }
  }
}