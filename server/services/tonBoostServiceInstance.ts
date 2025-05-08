/**
 * Инстанс-ориентированная имплементация сервиса TON Boost
 * 
 * Этот файл содержит основную реализацию сервиса TON Boost,
 * который работает на базе конкретного инстанса
 */

import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { 
  tonBoostDeposits, 
  type TonBoostDeposit, 
  type InsertTonBoostDeposit,
  transactions,
  users,
  type InsertTransaction,
  insertTransactionSchema
} from "@shared/schema";
import BigNumber from "bignumber.js";
import { type IReferralBonusService } from "./referralBonusServiceInstance";
import { referralBonusServiceInstance } from "./referralBonusServiceInstance";

// Define Currency enum if not available in schema
enum Currency {
  TON = "TON",
  UNI = "UNI"
}

// Константы для расчетов
const SECONDS_IN_DAY = 86400;
const TON_MIN_CHANGE_THRESHOLD = 0.000001; // Минимальный порог для обновления баланса в БД (0.000001 TON)

// Адрес TON кошелька проекта для приема платежей
const TON_WALLET_ADDRESS = "UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8";

// Каталог буст-пакетов
const boostPackages = [
  {
    id: 1,
    name: "Small Boost",
    priceTon: "1.0",
    bonusUni: "10000.0",    // Бонус UNI при покупке
    rateTon: "0.5",         // 0.5% в день для TON (обновлено)
    rateUni: "0.0"          // Нет дополнительного бонуса в UNI
  },
  {
    id: 2,
    name: "Medium Boost",
    priceTon: "5.0",
    bonusUni: "75000.0",    // Бонус UNI при покупке
    rateTon: "1.0",         // 1.0% в день для TON (обновлено)
    rateUni: "0.05"         // 0.05% в день для UNI
  },
  {
    id: 3,
    name: "Large Boost",
    priceTon: "15.0",       // Обновлена цена на 15 TON
    bonusUni: "250000.0",   // Бонус UNI при покупке
    rateTon: "2.0",         // 2.0% в день для TON (обновлено)
    rateUni: "0.1"          // 0.1% в день для UNI
  },
  {
    id: 4,
    name: "Mega Boost",
    priceTon: "25.0",
    bonusUni: "500000.0",   // Бонус UNI при покупке
    rateTon: "2.5",         // 2.5% в день для TON (обновлено)
    rateUni: "0.2"          // 0.2% в день для UNI
  }
];

/**
 * Перечисления для модуля TON Boost
 */
export enum TonBoostPaymentMethod {
  INTERNAL_BALANCE = "internal_balance",
  EXTERNAL_WALLET = "external_wallet"
}

export enum TonBoostExternalPaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  CANCELLED = "cancelled",
  EXPIRED = "expired"
}

/**
 * Типы данных для модуля TON Boost
 */
export interface TonBoostPackage {
  id: number;
  name: string;
  priceTon: string;
  bonusUni: string;
  rateTon: string;
  rateUni: string;
}

export interface PurchaseTonBoostResult {
  success: boolean;
  message: string;
  boostPackage?: TonBoostPackage;
  depositId?: number;
  paymentMethod?: TonBoostPaymentMethod;
  paymentStatus?: TonBoostExternalPaymentStatus;
  paymentLink?: string;
  purchaseTransaction?: any;
  bonusTransaction?: any;
  transactionId?: number;
}

export interface TonFarmingUpdateResult {
  success: boolean;
  userId: number;
  earnedTon: string;
  earnedUni: string;
  lastUpdateTimestamp: number;
}

export interface TonFarmingInfo {
  totalTonRatePerSecond: string;
  totalUniRatePerSecond: string;
  dailyIncomeTon: string;
  dailyIncomeUni: string;
  deposits: TonBoostDeposit[];
}

/**
 * Интерфейс сервиса TON Boost
 */
export interface ITonBoostService {
  getBoostPackages(): TonBoostPackage[];
  getBoostPackageById(boostId: number): TonBoostPackage | undefined;
  getUserActiveBoosts(userId: number): Promise<TonBoostDeposit[]>;
  createTonBoostDeposit(depositData: InsertTonBoostDeposit): Promise<TonBoostDeposit>;
  calculateRatesPerSecond(amount: string, rateTonPerDay: string, rateUniPerDay: string): { 
    tonRatePerSecond: string, 
    uniRatePerSecond: string 
  };
  purchaseTonBoost(
    userId: number, 
    boostId: number, 
    paymentMethod?: TonBoostPaymentMethod
  ): Promise<PurchaseTonBoostResult>;
  calculateAndUpdateUserTonFarming(userId: number): Promise<TonFarmingUpdateResult>;
  getUserTonFarmingInfo(userId: number): Promise<TonFarmingInfo>;
  harvestTonFarming(userId: number): Promise<{ 
    success: boolean; 
    message: string; 
    harvestedTon: string; 
    transactionId?: number; 
  }>;
}

/**
 * Класс сервиса TON Boost
 * Предоставляет методы для работы с TON Boost-пакетами
 */
class TonBoostService implements ITonBoostService {
  constructor(
    private readonly referralBonusService: IReferralBonusService
  ) {}

  /**
   * Получает список всех доступных буст-пакетов
   * @returns Список буст-пакетов
   */
  getBoostPackages(): TonBoostPackage[] {
    return boostPackages;
  }

  /**
   * Получает буст-пакет по ID
   * @param boostId ID буст-пакета
   * @returns Буст-пакет или undefined, если не найден
   */
  getBoostPackageById(boostId: number): TonBoostPackage | undefined {
    // Проверка на валидный ID и его наличие в списке packages
    if (!boostId || isNaN(boostId) || boostId < 1 || boostId > boostPackages.length) {
      console.log(`[TonBoostService] Недопустимый ID буст-пакета: ${boostId}`);
      return undefined;
    }
    
    const pkg = boostPackages.find(pkg => pkg.id === boostId);
    
    // Проверка, что у пакета есть цена в TON
    if (!pkg || !pkg.priceTon || pkg.priceTon === 'null') {
      console.log(`[TonBoostService] Пакет найден, но цена отсутствует: ${JSON.stringify(pkg)}`);
      return undefined;
    }
    
    return pkg;
  }

  /**
   * Получает все активные TON Boost-депозиты пользователя
   * @param userId ID пользователя
   * @returns Список активных TON Boost-депозитов
   */
  async getUserActiveBoosts(userId: number): Promise<TonBoostDeposit[]> {
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
  async createTonBoostDeposit(depositData: InsertTonBoostDeposit): Promise<TonBoostDeposit> {
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
  calculateRatesPerSecond(amount: string, rateTonPerDay: string, rateUniPerDay: string): { 
    tonRatePerSecond: string, 
    uniRatePerSecond: string 
  } {
    // Расчет для TON: amount * (rateTonPerDay / 100) / SECONDS_IN_DAY
    const tonRatePerSecond = new BigNumber(amount)
      .multipliedBy(new BigNumber(rateTonPerDay).dividedBy(100))
      .dividedBy(SECONDS_IN_DAY)
      .toString();

    // Расчет для UNI (может быть 0): amount * (rateUniPerDay / 100) / SECONDS_IN_DAY
    const uniRatePerSecond = new BigNumber(amount)
      .multipliedBy(new BigNumber(rateUniPerDay).dividedBy(100))
      .dividedBy(SECONDS_IN_DAY)
      .toString();

    return { tonRatePerSecond, uniRatePerSecond };
  }

  /**
   * Покупает TON буст-пакет для пользователя
   * @param userId ID пользователя
   * @param boostId ID буст-пакета
   * @param paymentMethod Метод оплаты (по умолчанию - внутренний баланс)
   * @returns Результат покупки
   */
  /**
   * Рассчитывает и обновляет баланс фарминга TON для пользователя
   * @param userId ID пользователя
   * @returns Результат обновления с информацией о начисленных средствах
   */
  async calculateAndUpdateUserTonFarming(userId: number): Promise<TonFarmingUpdateResult> {
    try {
      // Получаем активные TON Boost-депозиты пользователя
      const activeDeposits = await this.getUserActiveBoosts(userId);
      
      if (activeDeposits.length === 0) {
        return {
          success: true,
          userId,
          earnedTon: "0",
          earnedUni: "0",
          lastUpdateTimestamp: Math.floor(Date.now() / 1000)
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

      // Рассчитываем заработанные средства для каждого депозита
      let totalEarnedTon = new BigNumber(0);
      let totalEarnedUni = new BigNumber(0);
      
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const lastUpdateTimestamp = user.farming_last_update 
        ? Math.floor(new Date(user.farming_last_update).getTime() / 1000)
        : currentTimestamp;
      
      // Время в секундах с последнего обновления
      const elapsedSeconds = Math.max(0, currentTimestamp - lastUpdateTimestamp);
      
      if (elapsedSeconds <= 0) {
        return {
          success: true,
          userId,
          earnedTon: "0",
          earnedUni: "0",
          lastUpdateTimestamp: currentTimestamp
        };
      }

      // Рассчитываем доходность для каждого депозита
      for (const deposit of activeDeposits) {
        // Начисления TON: rate_ton_per_second * elapsed_time
        const earnedTon = new BigNumber(deposit.rate_ton_per_second || "0")
          .multipliedBy(elapsedSeconds);
          
        // Начисления UNI: rate_uni_per_second * elapsed_time
        const earnedUni = new BigNumber(deposit.rate_uni_per_second || "0")
          .multipliedBy(elapsedSeconds);
          
        totalEarnedTon = totalEarnedTon.plus(earnedTon);
        totalEarnedUni = totalEarnedUni.plus(earnedUni);
      }

      // Обновляем баланс фарминга пользователя только если начисления выше порога
      if (totalEarnedTon.isGreaterThan(TON_MIN_CHANGE_THRESHOLD) || totalEarnedUni.isGreaterThan(0)) {
        // Текущий баланс фарминга
        const currentFarmingTon = new BigNumber(user.farming_balance_ton || "0");
        const currentFarmingUni = new BigNumber(user.farming_balance_uni || "0");
        
        // Обновленный баланс фарминга
        const newFarmingTon = currentFarmingTon.plus(totalEarnedTon);
        const newFarmingUni = currentFarmingUni.plus(totalEarnedUni);
        
        // Обновляем баланс фарминга и время последнего обновления
        await db
          .update(users)
          .set({
            farming_balance_ton: newFarmingTon.toString(),
            farming_balance_uni: newFarmingUni.toString(),
            farming_last_update: new Date(currentTimestamp * 1000)
          })
          .where(eq(users.id, userId));
      }

      return {
        success: true,
        userId,
        earnedTon: totalEarnedTon.toString(),
        earnedUni: totalEarnedUni.toString(),
        lastUpdateTimestamp: currentTimestamp
      };
    } catch (error) {
      console.error(`[TonBoostService] Ошибка при обновлении TON фарминга: ${error}`);
      return {
        success: false,
        userId,
        earnedTon: "0",
        earnedUni: "0",
        lastUpdateTimestamp: Math.floor(Date.now() / 1000)
      };
    }
  }

  /**
   * Получает информацию о TON фарминге пользователя
   * @param userId ID пользователя
   * @returns Информацию о TON фарминге пользователя
   */
  async getUserTonFarmingInfo(userId: number): Promise<TonFarmingInfo> {
    // Получаем активные TON Boost-депозиты пользователя
    const activeDeposits = await this.getUserActiveBoosts(userId);
    
    // Рассчитываем общую скорость начисления TON и UNI
    let totalTonRatePerSecond = new BigNumber(0);
    let totalUniRatePerSecond = new BigNumber(0);
    
    for (const deposit of activeDeposits) {
      totalTonRatePerSecond = totalTonRatePerSecond.plus(deposit.rate_ton_per_second || "0");
      totalUniRatePerSecond = totalUniRatePerSecond.plus(deposit.rate_uni_per_second || "0");
    }
    
    // Рассчитываем дневной доход
    const dailyIncomeTon = totalTonRatePerSecond.multipliedBy(SECONDS_IN_DAY);
    const dailyIncomeUni = totalUniRatePerSecond.multipliedBy(SECONDS_IN_DAY);
    
    return {
      totalTonRatePerSecond: totalTonRatePerSecond.toString(),
      totalUniRatePerSecond: totalUniRatePerSecond.toString(),
      dailyIncomeTon: dailyIncomeTon.toString(),
      dailyIncomeUni: dailyIncomeUni.toString(),
      deposits: activeDeposits
    };
  }

  /**
   * Выводит накопленные TON с фарминга на баланс пользователя
   * @param userId ID пользователя
   * @returns Результат вывода TON
   */
  async harvestTonFarming(userId: number): Promise<{ 
    success: boolean; 
    message: string; 
    harvestedTon: string; 
    transactionId?: number; 
  }> {
    try {
      // Обновляем баланс фарминга пользователя
      await this.calculateAndUpdateUserTonFarming(userId);
      
      // Получаем пользователя
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
        
      if (!user) {
        return {
          success: false,
          message: "Пользователь не найден",
          harvestedTon: "0"
        };
      }
      
      // Проверяем, есть ли средства для вывода
      const farmingBalanceTon = new BigNumber(user.farming_balance_ton || "0");
      
      if (farmingBalanceTon.isLessThanOrEqualTo(0)) {
        return {
          success: false,
          message: "Нет средств для вывода",
          harvestedTon: "0"
        };
      }
      
      // Текущий баланс пользователя
      const userBalanceTon = new BigNumber(user.balance_ton || "0");
      
      // Обновляем баланс пользователя
      const newBalanceTon = userBalanceTon.plus(farmingBalanceTon);
      
      await db
        .update(users)
        .set({
          balance_ton: newBalanceTon.toString(),
          farming_balance_ton: "0" // Обнуляем баланс фарминга TON
        })
        .where(eq(users.id, userId));
        
      // Создаем транзакцию для начисления TON
      const [transaction] = await db
        .insert(transactions)
        .values({
          user_id: userId,
          type: "farming_harvest",
          currency: "TON",
          amount: farmingBalanceTon.toString(),
          status: "confirmed",
          source: "TON Boost", // Источник транзакции
          category: "farming"  // Категория - фарминг
        })
        .returning();
        
      // Обрабатываем реферальное вознаграждение от фарминга
      try {
        await this.referralBonusService.processFarmingReferralReward(
          userId,
          parseFloat(farmingBalanceTon.toString()),
          Currency.TON
        );
      } catch (refError) {
        console.error(`[TonBoostService] Ошибка при обработке реферального вознаграждения от фарминга: ${refError}`);
        // Не прерываем основной процесс, если реферальное вознаграждение не удалось начислить
      }
        
      return {
        success: true,
        message: "Средства успешно выведены на баланс",
        harvestedTon: farmingBalanceTon.toString(),
        transactionId: transaction.id
      };
    } catch (error) {
      console.error(`[TonBoostService] Ошибка при выводе TON фарминга: ${error}`);
      return {
        success: false,
        message: "Произошла ошибка при выводе средств",
        harvestedTon: "0"
      };
    }
  }

  /**
   * Покупает TON буст-пакет для пользователя
   * @param userId ID пользователя
   * @param boostId ID буст-пакета
   * @param paymentMethod Метод оплаты (по умолчанию - внутренний баланс)
   * @returns Результат покупки
   */
  async purchaseTonBoost(
    userId: number, 
    boostId: number, 
    paymentMethod: TonBoostPaymentMethod = TonBoostPaymentMethod.INTERNAL_BALANCE
  ): Promise<PurchaseTonBoostResult> {
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

      // Различная обработка в зависимости от метода оплаты
      if (paymentMethod === TonBoostPaymentMethod.EXTERNAL_WALLET) {
        // Генерируем ссылку на оплату через внешний кошелек
        const paymentLink = `ton://transfer/${TON_WALLET_ADDRESS}?amount=${boostPackage.priceTon}&text=UniFarmBoost:${userId}:${boostId}`;
        
        // Создаем транзакцию с статусом pending и дополнительными метаданными
        const [pendingTransaction] = await db
          .insert(transactions)
          .values({
            user_id: userId,
            type: "boost_purchase_external",
            currency: "TON",
            amount: boostPackage.priceTon,
            status: "pending",
            source: "TON Boost", // Источник транзакции
            category: "purchase" // Категория - покупка
          })
          .returning();
        
        return {
          success: true,
          message: "Создана заявка на покупку буст-пакета через внешний кошелек",
          boostPackage,
          transactionId: pendingTransaction.id,
          paymentMethod: TonBoostPaymentMethod.EXTERNAL_WALLET,
          paymentStatus: TonBoostExternalPaymentStatus.PENDING,
          paymentLink
        };
      } else {
        // Оплата с внутреннего баланса
        
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

        // 2. Создаем транзакцию списания TON с метаданными
        const [withdrawTransaction] = await db
          .insert(transactions)
          .values({
            user_id: userId,
            type: "boost_purchase",
            currency: "TON",
            amount: boostPrice.negated().toString(),
            status: "confirmed",
            source: "TON Boost", // Источник транзакции
            category: "purchase" // Категория - покупка
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

        // 6. Создаем транзакцию начисления бонуса UNI с дополнительными метаданными
        const [bonusTransaction] = await db
          .insert(transactions)
          .values({
            user_id: userId,
            type: "boost_bonus", // Тип транзакции - бонус
            currency: "UNI",    // Валюта - UNI
            amount: bonusUni.toString(),
            status: "confirmed",
            source: "TON Boost", // Источник бонуса - TON Boost
            category: "bonus"    // Категория - бонус
          })
          .returning();

        // 7. Обрабатываем реферальное вознаграждение
        try {
          await this.referralBonusService.processReferralBonus(
            userId, 
            parseFloat(boostPackage.priceTon), 
            Currency.TON
          );
        } catch (refError) {
          console.error(`[TonBoostService] Ошибка при обработке реферального вознаграждения: ${refError}`);
          // Не прерываем основной процесс, если реферальное вознаграждение не удалось начислить
        }

        return {
          success: true,
          message: "Буст-пакет успешно приобретен",
          boostPackage,
          depositId: deposit.id,
          purchaseTransaction: withdrawTransaction,
          bonusTransaction: bonusTransaction
        };
      }
    } catch (error) {
      console.error(`[TonBoostService] Ошибка при покупке TON буст-пакета: ${error}`);
      return {
        success: false,
        message: "Произошла ошибка при покупке буст-пакета"
      };
    }
  }

  /**
   * Рассчитывает и обновляет баланс фарминга TON для пользователя
   * @param userId ID пользователя
   * @returns Результат обновления с информацией о начисленных средствах
   */
  async calculateAndUpdateUserTonFarming(userId: number): Promise<TonFarmingUpdateResult> {
    try {
      // Получаем активные TON Boost-депозиты пользователя
      const activeDeposits = await this.getUserActiveBoosts(userId);
      
      if (activeDeposits.length === 0) {
        return {
          success: true,
          userId,
          earnedTon: "0",
          earnedUni: "0",
          lastUpdateTimestamp: Math.floor(Date.now() / 1000)
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

      // Рассчитываем заработанные средства для каждого депозита
      let totalEarnedTon = new BigNumber(0);
      let totalEarnedUni = new BigNumber(0);
      
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const lastUpdateTimestamp = user.farming_last_update 
        ? Math.floor(new Date(user.farming_last_update).getTime() / 1000)
        : currentTimestamp;
      
      // Время в секундах с последнего обновления
      const elapsedSeconds = Math.max(0, currentTimestamp - lastUpdateTimestamp);
      
      if (elapsedSeconds <= 0) {
        return {
          success: true,
          userId,
          earnedTon: "0",
          earnedUni: "0",
          lastUpdateTimestamp: currentTimestamp
        };
      }

      // Рассчитываем доходность для каждого депозита
      for (const deposit of activeDeposits) {
        // Начисления TON: rate_ton_per_second * elapsed_time
        const earnedTon = new BigNumber(deposit.rate_ton_per_second || "0")
          .multipliedBy(elapsedSeconds);
          
        // Начисления UNI: rate_uni_per_second * elapsed_time
        const earnedUni = new BigNumber(deposit.rate_uni_per_second || "0")
          .multipliedBy(elapsedSeconds);
          
        totalEarnedTon = totalEarnedTon.plus(earnedTon);
        totalEarnedUni = totalEarnedUni.plus(earnedUni);
      }

      // Обновляем баланс фарминга пользователя только если начисления выше порога
      if (totalEarnedTon.isGreaterThan(TON_MIN_CHANGE_THRESHOLD) || totalEarnedUni.isGreaterThan(0)) {
        // Текущий баланс фарминга
        const currentFarmingTon = new BigNumber(user.farming_balance_ton || "0");
        const currentFarmingUni = new BigNumber(user.farming_balance_uni || "0");
        
        // Обновленный баланс фарминга
        const newFarmingTon = currentFarmingTon.plus(totalEarnedTon);
        const newFarmingUni = currentFarmingUni.plus(totalEarnedUni);
        
        // Обновляем баланс фарминга и время последнего обновления
        await db
          .update(users)
          .set({
            farming_balance_ton: newFarmingTon.toString(),
            farming_balance_uni: newFarmingUni.toString(),
            farming_last_update: new Date(currentTimestamp * 1000)
          })
          .where(eq(users.id, userId));
      }

      return {
        success: true,
        userId,
        earnedTon: totalEarnedTon.toString(),
        earnedUni: totalEarnedUni.toString(),
        lastUpdateTimestamp: currentTimestamp
      };
    } catch (error) {
      console.error(`[TonBoostService] Ошибка при обновлении TON фарминга: ${error}`);
      return {
        success: false,
        userId,
        earnedTon: "0",
        earnedUni: "0",
        lastUpdateTimestamp: Math.floor(Date.now() / 1000)
      };
    }
  }

  /**
   * Получает информацию о TON фарминге пользователя
   * @param userId ID пользователя
   * @returns Информацию о TON фарминге пользователя
   */
  async getUserTonFarmingInfo(userId: number): Promise<TonFarmingInfo> {
    // Получаем активные TON Boost-депозиты пользователя
    const activeDeposits = await this.getUserActiveBoosts(userId);
    
    // Рассчитываем общую скорость начисления TON и UNI
    let totalTonRatePerSecond = new BigNumber(0);
    let totalUniRatePerSecond = new BigNumber(0);
    
    for (const deposit of activeDeposits) {
      totalTonRatePerSecond = totalTonRatePerSecond.plus(deposit.rate_ton_per_second || "0");
      totalUniRatePerSecond = totalUniRatePerSecond.plus(deposit.rate_uni_per_second || "0");
    }
    
    // Рассчитываем дневной доход
    const dailyIncomeTon = totalTonRatePerSecond.multipliedBy(SECONDS_IN_DAY);
    const dailyIncomeUni = totalUniRatePerSecond.multipliedBy(SECONDS_IN_DAY);
    
    return {
      totalTonRatePerSecond: totalTonRatePerSecond.toString(),
      totalUniRatePerSecond: totalUniRatePerSecond.toString(),
      dailyIncomeTon: dailyIncomeTon.toString(),
      dailyIncomeUni: dailyIncomeUni.toString(),
      deposits: activeDeposits
    };
  }

  /**
   * Выводит накопленные TON с фарминга на баланс пользователя
   * @param userId ID пользователя
   * @returns Результат вывода TON
   */
  async harvestTonFarming(userId: number): Promise<{ 
    success: boolean; 
    message: string; 
    harvestedTon: string; 
    transactionId?: number; 
  }> {
    try {
      // Обновляем баланс фарминга пользователя
      await this.calculateAndUpdateUserTonFarming(userId);
      
      // Получаем пользователя
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
        
      if (!user) {
        return {
          success: false,
          message: "Пользователь не найден",
          harvestedTon: "0"
        };
      }
      
      // Проверяем, есть ли средства для вывода
      const farmingBalanceTon = new BigNumber(user.farming_balance_ton || "0");
      
      if (farmingBalanceTon.isLessThanOrEqualTo(0)) {
        return {
          success: false,
          message: "Нет средств для вывода",
          harvestedTon: "0"
        };
      }
      
      // Текущий баланс пользователя
      const userBalanceTon = new BigNumber(user.balance_ton || "0");
      
      // Обновляем баланс пользователя
      const newBalanceTon = userBalanceTon.plus(farmingBalanceTon);
      
      await db
        .update(users)
        .set({
          balance_ton: newBalanceTon.toString(),
          farming_balance_ton: "0" // Обнуляем баланс фарминга TON
        })
        .where(eq(users.id, userId));
        
      // Создаем транзакцию для начисления TON
      const [transaction] = await db
        .insert(transactions)
        .values({
          user_id: userId,
          type: "farming_harvest",
          currency: "TON",
          amount: farmingBalanceTon.toString(),
          status: "confirmed",
          source: "TON Boost", // Источник транзакции
          category: "farming"  // Категория - фарминг
        })
        .returning();
        
      // Обрабатываем реферальное вознаграждение от фарминга
      try {
        await this.referralBonusService.processFarmingReferralReward(
          userId,
          parseFloat(farmingBalanceTon.toString()),
          Currency.TON
        );
      } catch (refError) {
        console.error(`[TonBoostService] Ошибка при обработке реферального вознаграждения от фарминга: ${refError}`);
        // Не прерываем основной процесс, если реферальное вознаграждение не удалось начислить
      }
        
      return {
        success: true,
        message: "Средства успешно выведены на баланс",
        harvestedTon: farmingBalanceTon.toString(),
        transactionId: transaction.id
      };
    } catch (error) {
      console.error(`[TonBoostService] Ошибка при выводе TON фарминга: ${error}`);
      return {
        success: false,
        message: "Произошла ошибка при выводе средств",
        harvestedTon: "0"
      };
    }
  }
}

/**
 * Создаем единственный экземпляр сервиса
 */
export const tonBoostServiceInstance = new TonBoostService(referralBonusServiceInstance);

/**
 * Фабрика для создания сервиса TON Boost
 * @returns Экземпляр сервиса TON Boost
 */
export function createTonBoostService(): ITonBoostService {
  return tonBoostServiceInstance;
}