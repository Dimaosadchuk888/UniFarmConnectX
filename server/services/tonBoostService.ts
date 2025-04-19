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
 * Метод оплаты TON буст-пакета
 */
export enum TonBoostPaymentMethod {
  INTERNAL_BALANCE = 'internal_balance',
  EXTERNAL_WALLET = 'external_wallet'
}

/**
 * Статус оплаты TON буст-пакета через внешний кошелек
 */
export enum TonBoostExternalPaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
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
  paymentMethod?: TonBoostPaymentMethod;
  paymentStatus?: TonBoostExternalPaymentStatus;
  paymentLink?: string;
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
  private static readonly TON_MIN_CHANGE_THRESHOLD = 0.000001; // Минимальный порог для обновления баланса в БД (0.000001 TON)
  
  // Каталог буст-пакетов
  private static readonly boostPackages: TonBoostPackage[] = [
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
   * @param paymentMethod Метод оплаты (по умолчанию - внутренний баланс)
   * @returns Результат покупки
   */
  // Адрес TON кошелька проекта для приема платежей
  private static readonly TON_WALLET_ADDRESS = "UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8";
  
  /**
   * Покупает TON буст-пакет для пользователя
   * @param userId ID пользователя
   * @param boostId ID буст-пакета
   * @param paymentMethod Метод оплаты (по умолчанию - внутренний баланс)
   * @returns Результат покупки
   */
  static async purchaseTonBoost(
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
        const paymentLink = `ton://transfer/${this.TON_WALLET_ADDRESS}?amount=${boostPackage.priceTon}&text=UniFarmBoost:${userId}:${boostId}`;
        
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
            category: "bonus"   // Категория - бонус
          })
          .returning();

        return {
          success: true,
          message: "Буст-пакет успешно приобретен",
          boostPackage,
          transactionId: withdrawTransaction.id,
          depositId: deposit.id,
          paymentMethod: TonBoostPaymentMethod.INTERNAL_BALANCE
        };
      }
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
              last_updated_at: now,
              accumulated_ton: new BigNumber(deposit.accumulated_ton || "0").plus(earnedTon).toString()
            })
            .where(eq(tonBoostDeposits.id, deposit.id));
        }
      }

      // Получить все накопления TON из депозитов
      const allDeposits = await this.getUserActiveBoosts(userId);
      let totalAccumulatedTon = new BigNumber(0);
      for (const deposit of allDeposits) {
        totalAccumulatedTon = totalAccumulatedTon.plus(deposit.accumulated_ton || "0");
      }

      // Проверяем минимальный порог для начисления TON
      if (totalAccumulatedTon.isGreaterThanOrEqualTo(this.TON_MIN_CHANGE_THRESHOLD)) {
        const newTonBalance = new BigNumber(user.balance_ton || "0").plus(totalAccumulatedTon).toString();
        
        // Обновляем баланс TON
        await db
          .update(users)
          .set({
            balance_ton: newTonBalance
          })
          .where(eq(users.id, userId));
        
        // Создаем транзакцию начисления TON с дополнительными метаданными
        await db
          .insert(transactions)
          .values({
            user_id: userId,
            type: "boost_farming",
            currency: "TON",
            amount: totalAccumulatedTon.toString(),
            status: "confirmed",
            source: "TON Boost", // Указываем источник транзакции
            category: "farming" // Указываем категорию - фарминг
          });
        
        // Обнуляем накопления во всех депозитах
        for (const deposit of allDeposits) {
          await db
            .update(tonBoostDeposits)
            .set({
              accumulated_ton: "0"
            })
            .where(eq(tonBoostDeposits.id, deposit.id));
        }
        
        console.log(`[TonFarming] User ${userId} earned ${totalAccumulatedTon.toString()} TON from boosts (balance updated to ${newTonBalance})`);
      } else {
        console.log(`[TonFarming] User ${userId} accumulated ${totalAccumulatedTon.toString()} TON (waiting for threshold ${this.TON_MIN_CHANGE_THRESHOLD})`);
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
        
        // Создаем транзакцию начисления UNI с дополнительными метаданными
        await db
          .insert(transactions)
          .values({
            user_id: userId,
            type: "boost_uni_reward",
            currency: "UNI",
            amount: earnedUniThisUpdate.toString(),
            status: "confirmed",
            source: "TON Boost", // Указываем источник транзакции
            category: "farming"   // Указываем категорию - фарминг
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
   * Подтверждает оплату TON буст-пакета через внешний кошелек
   * @param userId ID пользователя
   * @param transactionId ID транзакции в статусе pending
   * @returns Результат подтверждения
   */
  static async confirmExternalPayment(userId: number, transactionId: number): Promise<PurchaseTonBoostResult> {
    try {
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

      // Получаем транзакцию
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.id, transactionId),
            eq(transactions.user_id, userId),
            eq(transactions.type, "boost_purchase_external"),
            eq(transactions.status, "pending")
          )
        );

      if (!transaction) {
        return {
          success: false,
          message: "Транзакция не найдена или уже подтверждена"
        };
      }

      // Обновляем статус транзакции
      await db
        .update(transactions)
        .set({
          status: "confirmed"
        })
        .where(eq(transactions.id, transactionId));

      // Размер буст-пакета - это сумма транзакции
      const amount = transaction.amount;
      
      // [АУДИТ ПЛАТЕЖЕЙ - УБРАТЬ ПОСЛЕ ТЕСТИРОВАНИЯ]
      console.log("[TON AUDIT] confirmExternalPayment вход:", { 
        transactionId,
        amount,
        amountType: typeof amount,
        amountNumber: Number(amount),
        availablePackages: this.boostPackages.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          price: pkg.priceTon,
          priceType: typeof pkg.priceTon,
          directComparison: amount === pkg.priceTon
        }))
      });
      
      // ТЗ: Преобразуем суммы в nanoTON для корректного сравнения
      const transactionAmount = BigInt(parseFloat(amount) * 1e9);
      
      // Находим буст-пакет с соответствующей ценой
      // ТЗ: Логируем для отладки
      console.log("[TON Boost] Подтверждение платежа, поиск буст-пакета для суммы:", {
        transactionAmount: transactionAmount.toString(),
        availablePackages: this.boostPackages.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          price: pkg.priceTon,
          priceNano: BigInt(parseFloat(pkg.priceTon) * 1e9).toString()
        }))
      });
      
      // [АУДИТ ПЛАТЕЖЕЙ - УБРАТЬ ПОСЛЕ ТЕСТИРОВАНИЯ]
      console.log("[TON AUDIT] Значения для поиска буст-пакета:", {
        transactionAmount: transactionAmount.toString(),
        transactionAmountType: typeof transactionAmount,
        packageValues: this.boostPackages.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          priceTon: pkg.priceTon,
          priceTonType: typeof pkg.priceTon,
          calculatedNanoTon: BigInt(parseFloat(pkg.priceTon) * 1e9).toString(),
          match: BigInt(parseFloat(pkg.priceTon) * 1e9) === transactionAmount
        }))
      });
      
      // Ищем пакет по сумме, сравнивая nanoTON значения через BigInt
      const boostPackage = this.boostPackages.find(pkg => {
        const packageAmount = BigInt(parseFloat(pkg.priceTon) * 1e9);
        const match = packageAmount === transactionAmount;
        console.log(`[TON AUDIT] Сравнение пакета ${pkg.id} (${pkg.name}): ${packageAmount} === ${transactionAmount} => ${match}`);
        return match;
      });
      
      if (!boostPackage) {
        return {
          success: false,
          message: "Не удалось найти соответствующий буст-пакет"
        };
      }

      // Рассчитываем скорость начисления TON и UNI
      const { tonRatePerSecond, uniRatePerSecond } = this.calculateRatesPerSecond(
        boostPackage.priceTon,
        boostPackage.rateTon,
        boostPackage.rateUni
      );

      // Создаем новый TON Boost-депозит
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

      // Начисляем бонус UNI пользователю
      const userUniBalance = new BigNumber(user.balance_uni || "0");
      const bonusUni = new BigNumber(boostPackage.bonusUni);
      const newUniBalance = userUniBalance.plus(bonusUni).toString();

      await db
        .update(users)
        .set({
          balance_uni: newUniBalance
        })
        .where(eq(users.id, userId));

      // Создаем транзакцию начисления бонуса UNI с дополнительными метаданными
      const [bonusTransaction] = await db
        .insert(transactions)
        .values({
          user_id: userId,
          type: "boost_bonus", // Тип транзакции - бонус
          currency: "UNI",    // Валюта - UNI
          amount: bonusUni.toString(),
          status: "confirmed",
          source: "TON Boost", // Источник бонуса - TON Boost
          category: "bonus"   // Категория - бонус
        })
        .returning();

      return {
        success: true,
        message: "Внешняя оплата подтверждена, буст-пакет активирован",
        boostPackage,
        transactionId: transaction.id,
        depositId: deposit.id,
        paymentMethod: TonBoostPaymentMethod.EXTERNAL_WALLET,
        paymentStatus: TonBoostExternalPaymentStatus.COMPLETED
      };
    } catch (error) {
      console.error("[TonBoostService] Error confirming external payment:", error);
      return {
        success: false,
        message: "Произошла ошибка при подтверждении оплаты"
      };
    }
  }

  /**
   * Проверяет входящую TON транзакцию и активирует буст при совпадении параметров
   * @param senderAddress Адрес отправителя TON
   * @param amount Сумма перевода в TON
   * @param comment Комментарий к переводу (обычно содержит UniFarmBoost:userId:boostId)
   * @returns Результат обработки транзакции
   */
  static async processIncomingTonTransaction(senderAddress: string, amount: string, comment: string): Promise<PurchaseTonBoostResult> {
    try {
      // Валидация входных параметров
      if (!amount || !comment) {
        return {
          success: false,
          message: "Недостаточно данных для обработки транзакции"
        };
      }
      
      // Проверяем, соответствует ли комментарий нашему формату (UniFarmBoost:userId:boostId)
      const commentPattern = /^UniFarmBoost:(\d+):(\d+)$/;
      const match = comment.match(commentPattern);
      
      if (!match) {
        console.log(`[TonBoostService] Received TON transaction with invalid comment format: ${comment}`);
        return {
          success: false,
          message: "Неверный формат комментария"
        };
      }
      
      const userId = parseInt(match[1]);
      const boostId = parseInt(match[2]);
      
      if (isNaN(userId) || isNaN(boostId)) {
        return {
          success: false,
          message: "Некорректный ID пользователя или буст-пакета в комментарии"
        };
      }
      
      // Проверяем существование пользователя
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
        
      if (!user) {
        return {
          success: false,
          message: `Пользователь с ID ${userId} не найден`
        };
      }
      
      // Проверяем существование буст-пакета
      const boostPackage = this.getBoostPackageById(boostId);
      
      if (!boostPackage) {
        return {
          success: false,
          message: `Буст-пакет с ID ${boostId} не найден`
        };
      }
      
      // [АУДИТ ПЛАТЕЖЕЙ - УБРАТЬ ПОСЛЕ ТЕСТИРОВАНИЯ]
      console.log("[TON AUDIT] processIncomingTonTransaction вход:", { 
        senderAddress, 
        amount, 
        comment, 
        boostId,
        boostPrice: boostPackage.priceTon
      });
      console.log("[TON AUDIT] Типы данных:", {
        amountType: typeof amount,
        boostPriceType: typeof boostPackage.priceTon,
        amountIsNumber: !isNaN(Number(amount)),
        boostPriceIsNumber: !isNaN(Number(boostPackage.priceTon)),
        directComparison: amount === boostPackage.priceTon
      });
      
      // Проверяем, соответствует ли сумма стоимости буст-пакета
      // Преобразуем суммы в nanoTON через BigInt для корректного сравнения
      // Форма: 1.0 TON = 1000000000 nanoTON
      const receivedAmount = BigInt(parseFloat(amount) * 1e9);
      const expectedAmount = BigInt(parseFloat(boostPackage.priceTon) * 1e9);
      
      // ТЗ: Логируем для отладки
      console.log("[TON Boost] Проверка суммы:", {
        received: receivedAmount.toString(),
        expected: expectedAmount.toString(),
      });

      // [АУДИТ ПЛАТЕЖЕЙ - УБРАТЬ ПОСЛЕ ТЕСТИРОВАНИЯ]
      console.log("[TON AUDIT] Значения nanoTON:", {
        received: receivedAmount.toString(),
        expected: expectedAmount.toString(),
        comparison: receivedAmount === expectedAmount,
        receivedType: typeof receivedAmount,
        expectedType: typeof expectedAmount
      });
      
      if (receivedAmount !== expectedAmount) {
        return {
          success: false,
          message: `Сумма платежа (${amount} TON) не соответствует стоимости буст-пакета (${boostPackage.priceTon} TON)`
        };
      }
      
      // Создаем транзакцию внешнего платежа
      const [transaction] = await db
        .insert(transactions)
        .values({
          user_id: userId,
          type: "boost_purchase_external",
          currency: "TON",
          amount: amount,
          status: "pending",
          source: "External Wallet",
          category: "purchase",
          metadata: JSON.stringify({
            sender_address: senderAddress,
            comment: comment,
            boost_id: boostId
          }) as any
        })
        .returning();
      
      // Подтверждаем платеж и активируем буст
      return await this.confirmExternalPayment(userId, transaction.id);
    } catch (error) {
      console.error("[TonBoostService] Error processing incoming TON transaction:", error);
      return {
        success: false,
        message: "Произошла ошибка при обработке входящей TON транзакции"
      };
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
      // (Показываем реалистичные значения, а не нереалистично высокий доход)
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