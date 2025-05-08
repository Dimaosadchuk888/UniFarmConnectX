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
  type User,
  type InsertTransaction,
  insertTransactionSchema
} from "@shared/schema";
import BigNumber from "bignumber.js";
import { type IReferralBonusService } from "./referralBonusServiceInstance";
import { referralBonusServiceInstance } from "./referralBonusServiceInstance";

// Extended type for User to handle legacy farming fields
// This is for backwards compatibility only, a proper schema update should be done in the future
interface ExtendedUser extends User {
  // These fields are not in the schema but may be used by old code
  farming_balance_ton?: string;
  farming_balance_uni?: string;
  farming_last_update?: Date;
}

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
      // Явное приведение к расширенному типу для работы со старым кодом
      const extendedUser = user as ExtendedUser;
      
      // Используем uni_farming_last_update вместо farming_last_update (если такое свойство есть)
      const lastUpdateTimestamp = user.uni_farming_last_update 
        ? Math.floor(new Date(user.uni_farming_last_update).getTime() / 1000)
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

      // Временное решение: используем транзакции для отслеживания начислений фарминга
      // В будущем заменить на отдельную таблицу для хранения баланса фарминга
      if (totalEarnedTon.isGreaterThan(TON_MIN_CHANGE_THRESHOLD) || totalEarnedUni.isGreaterThan(0)) {
        // Обновляем время последнего обновления
        await db
          .update(users)
          .set({
            uni_farming_last_update: new Date(currentTimestamp * 1000)
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
      const updateResult = await this.calculateAndUpdateUserTonFarming(userId);
      
      if (!updateResult.success) {
        return {
          success: false,
          message: "Ошибка при расчете фарминга",
          harvestedTon: "0"
        };
      }
      
      // Если нет средств для вывода
      if (new BigNumber(updateResult.earnedTon).isLessThanOrEqualTo(0)) {
        return {
          success: false,
          message: "Нет средств для вывода",
          harvestedTon: "0"
        };
      }
      
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
      
      // Текущий баланс пользователя
      const userBalanceTon = new BigNumber(user.balance_ton || "0");
      const harvestedTon = new BigNumber(updateResult.earnedTon);
      
      // Обновляем баланс пользователя
      const newBalanceTon = userBalanceTon.plus(harvestedTon);
      
      await db
        .update(users)
        .set({
          balance_ton: newBalanceTon.toString(),
        })
        .where(eq(users.id, userId));
        
      // Создаем транзакцию для начисления TON
      const [transaction] = await db
        .insert(transactions)
        .values({
          user_id: userId,
          type: "farming_harvest",
          currency: "TON",
          amount: harvestedTon.toString(),
          status: "confirmed",
          source: "TON Boost", // Источник транзакции
          category: "farming"  // Категория - фарминг
        })
        .returning();
        
      // Обрабатываем реферальное вознаграждение от фарминга
      try {
        await this.referralBonusService.processFarmingReferralReward(
          userId,
          parseFloat(harvestedTon.toString()),
          Currency.TON
        );
      } catch (refError) {
        console.error(`[TonBoostService] Ошибка при обработке реферального вознаграждения от фарминга: ${refError}`);
        // Не прерываем основной процесс, если реферальное вознаграждение не удалось начислить
      }
        
      return {
        success: true,
        message: "Средства успешно выведены на баланс",
        harvestedTon: harvestedTon.toString(),
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

      // Проверяем метод оплаты
      if (paymentMethod === TonBoostPaymentMethod.INTERNAL_BALANCE) {
        // Проверка баланса пользователя
        const userBalance = new BigNumber(user.balance_ton || "0");
        const packagePrice = new BigNumber(boostPackage.priceTon);
        
        if (userBalance.isLessThan(packagePrice)) {
          return {
            success: false,
            message: "Недостаточно средств на балансе",
            boostPackage
          };
        }
        
        // Списываем средства с баланса пользователя
        const newBalance = userBalance.minus(packagePrice);
        
        await db
          .update(users)
          .set({
            balance_ton: newBalance.toString()
          })
          .where(eq(users.id, userId));
          
        // Создаем транзакцию списания TON
        const [purchaseTransaction] = await db
          .insert(transactions)
          .values({
            user_id: userId,
            type: "boost_purchase",
            currency: "TON",
            amount: `-${packagePrice.toString()}`, // Отрицательная сумма - списание
            status: "confirmed",
            source: `TON Boost (ID: ${boostId})`,
            category: "boost",
            description: `Покупка TON Boost (${boostPackage.name})`
          })
          .returning();
          
        // Начисляем бонусные UNI
        const bonusUni = new BigNumber(boostPackage.bonusUni);
        const currentUniBalance = new BigNumber(user.balance_uni || "0");
        const newUniBalance = currentUniBalance.plus(bonusUni);
        
        await db
          .update(users)
          .set({
            balance_uni: newUniBalance.toString()
          })
          .where(eq(users.id, userId));
          
        // Создаем транзакцию начисления UNI
        const [bonusTransaction] = await db
          .insert(transactions)
          .values({
            user_id: userId,
            type: "boost_bonus",
            currency: "UNI",
            amount: bonusUni.toString(),
            status: "confirmed",
            source: `TON Boost (ID: ${boostId})`,
            category: "bonus",
            description: `Бонус за покупку TON Boost (${boostPackage.name})`
          })
          .returning();
          
        // Рассчитываем скорость начисления TON и UNI в секунду
        const { tonRatePerSecond, uniRatePerSecond } = this.calculateRatesPerSecond(
          boostPackage.priceTon,
          boostPackage.rateTon,
          boostPackage.rateUni
        );
        
        // Создаем запись о депозите TON Boost
        const deposit = await this.createTonBoostDeposit({
          user_id: userId,
          ton_amount: boostPackage.priceTon,
          bonus_uni: boostPackage.bonusUni,
          rate_ton_per_second: tonRatePerSecond,
          rate_uni_per_second: uniRatePerSecond,
          is_active: true
        });
        
        // Обрабатываем реферальное вознаграждение
        try {
          // Если метод processBoostReferralReward определен в интерфейсе IReferralBonusService
          // в версии компонента, с которым вы работаете, вы можете использовать его.
          // В противном случае для совместимости используем processFarmingReferralReward
          if (typeof this.referralBonusService.processBoostReferralReward === 'function') {
            await (this.referralBonusService as any).processBoostReferralReward(
              userId,
              parseFloat(boostPackage.priceTon),
              Currency.TON
            );
          } else {
            // Используем метод processFarmingReferralReward, если метод processBoostReferralReward не определён
            console.log(`[TonBoostService] Используем альтернативный метод для обработки реферального вознаграждения`);
            await this.referralBonusService.processFarmingReferralReward(
              userId,
              parseFloat(boostPackage.priceTon),
              Currency.TON
            );
          }
        } catch (refError) {
          console.error(`[TonBoostService] Ошибка при обработке реферального вознаграждения: ${refError}`);
          // Не прерываем основной процесс, если реферальное вознаграждение не удалось начислить
        }
        
        return {
          success: true,
          message: "TON Boost успешно активирован",
          boostPackage,
          depositId: deposit.id,
          paymentMethod: TonBoostPaymentMethod.INTERNAL_BALANCE,
          purchaseTransaction,
          bonusTransaction,
          transactionId: purchaseTransaction.id
        };
      } else if (paymentMethod === TonBoostPaymentMethod.EXTERNAL_WALLET) {
        // Здесь должен быть код для оплаты через внешний кошелек
        // Это заглушка для интерфейса
        return {
          success: true,
          message: "Для завершения покупки отправьте TON на указанный адрес",
          boostPackage,
          paymentMethod: TonBoostPaymentMethod.EXTERNAL_WALLET,
          paymentStatus: TonBoostExternalPaymentStatus.PENDING,
          paymentLink: `ton://transfer/${TON_WALLET_ADDRESS}?amount=${boostPackage.priceTon}&text=boost_${userId}_${boostId}`
        };
      } else {
        return {
          success: false,
          message: "Неподдерживаемый метод оплаты"
        };
      }
    } catch (error) {
      console.error(`[TonBoostService] Ошибка при покупке TON Boost: ${error}`);
      return {
        success: false,
        message: "Произошла ошибка при активации TON Boost"
      };
    }
  }
}

// Создаем экземпляр сервиса
export const tonBoostServiceInstance = new TonBoostService(referralBonusServiceInstance);

/**
 * Фабричная функция для создания экземпляра сервиса TonBoost
 * Используется для внедрения зависимостей и упрощения тестирования
 * @returns Экземпляр сервиса ITonBoostService
 */
export function createTonBoostService(): ITonBoostService {
  return tonBoostServiceInstance;
}