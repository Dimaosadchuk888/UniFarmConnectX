import { db } from '../db';
import { users, uniFarmingDeposits } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { BigNumber } from 'bignumber.js';

// Используем BigNumber для точных вычислений с плавающей точкой
BigNumber.config({
  DECIMAL_PLACES: 16,
  ROUNDING_MODE: BigNumber.ROUND_DOWN
});

/**
 * Сервис для работы с UNI фармингом по множественным депозитам
 */
export class NewUniFarmingService {
  private static readonly DAILY_RATE = 0.005; // 0.5% в день
  private static readonly SECONDS_IN_DAY = 86400;
  private static readonly MIN_CHANGE_THRESHOLD = 0.000001; // Минимальный порог изменения для обновления баланса в БД

  /**
   * Начисляет доход пользователю от UNI фарминга на основе всех активных депозитов
   * @param userId ID пользователя
   * @returns Объект с обновленными данными
   */
  static async calculateAndUpdateUserFarming(userId: number): Promise<{
    totalDepositAmount: string;
    totalRatePerSecond: string;
    earnedThisUpdate: string;
    depositCount: number;
  }> {
    // Получаем данные пользователя
    const [user] = await db
      .select({
        balance_uni: users.balance_uni,
        uni_farming_balance: users.uni_farming_balance
      })
      .from(users)
      .where(eq(users.id, userId));

    // Если пользователь не найден, возвращаем нулевые значения
    if (!user) {
      return {
        totalDepositAmount: '0',
        totalRatePerSecond: '0',
        earnedThisUpdate: '0',
        depositCount: 0
      };
    }

    // Текущий баланс пользователя
    const currentBalance = new BigNumber(user.balance_uni !== null ? user.balance_uni.toString() : '0');
    
    // Получаем все активные депозиты пользователя
    const activeDeposits = await db
      .select()
      .from(uniFarmingDeposits)
      .where(and(
        eq(uniFarmingDeposits.user_id, userId),
        eq(uniFarmingDeposits.is_active, true)
      ));

    // Если нет активных депозитов, возвращаем нулевые значения
    if (activeDeposits.length === 0) {
      return {
        totalDepositAmount: '0',
        totalRatePerSecond: '0',
        earnedThisUpdate: '0',
        depositCount: 0
      };
    }

    // Инициализируем переменные для накопления
    let totalDepositAmount = new BigNumber(0);
    let totalRatePerSecond = new BigNumber(0);
    let totalEarnedAmount = new BigNumber(0);
    const now = new Date();

    // Обрабатываем каждый депозит
    for (const deposit of activeDeposits) {
      // Добавляем сумму депозита к общей сумме
      const depositAmount = new BigNumber(deposit.amount.toString());
      totalDepositAmount = totalDepositAmount.plus(depositAmount);

      // Рассчитываем прошедшее время с последнего обновления
      const lastUpdate = deposit.last_updated_at;
      const secondsSinceLastUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
      
      // Минимальное начисление за 0.1 секунды
      const effectiveSeconds = Math.max(0.1, secondsSinceLastUpdate);

      // Рассчитываем доход за прошедшие секунды
      const ratePerSecond = new BigNumber(deposit.rate_per_second.toString());
      const earnedAmount = ratePerSecond.multipliedBy(effectiveSeconds);

      // Логирование
      console.log(`[MultiFarming] User ${userId} Deposit #${deposit.id}: Amount=${depositAmount.toString()}, Rate=${ratePerSecond.toString()}/sec, Time=${effectiveSeconds}s, Earned=${earnedAmount.toString()}`);

      // Добавляем к общей сумме заработанного
      totalEarnedAmount = totalEarnedAmount.plus(earnedAmount);
      totalRatePerSecond = totalRatePerSecond.plus(ratePerSecond);

      // Обновляем время последнего обновления депозита
      await db
        .update(uniFarmingDeposits)
        .set({
          last_updated_at: now
        })
        .where(eq(uniFarmingDeposits.id, deposit.id));
    }

    // Используем накопитель для микро-начислений
    const currentAccumulatedBalance = new BigNumber(user.uni_farming_balance !== null ? user.uni_farming_balance.toString() : '0');
    const newAccumulatedBalance = currentAccumulatedBalance.plus(totalEarnedAmount);

    // Проверяем, достаточно ли накопленной суммы для обновления баланса
    const readyToUpdate = newAccumulatedBalance.isGreaterThanOrEqualTo(this.MIN_CHANGE_THRESHOLD);
    
    // Новый баланс с учетом начисленного дохода
    const newBalance = currentBalance.plus(totalEarnedAmount);
    const formattedNewBalance = newBalance.toFixed(6);

    // Если накоплено достаточно для обновления
    if (readyToUpdate) {
      // Логируем, что будем обновлять баланс
      console.log(`[MultiFarming] Balance Updated User ${userId} | Balance: ${currentBalance.toFixed(6)} => ${formattedNewBalance}`);
      console.log(`[MultiFarming] Accumulated Balance User ${userId} | ${currentAccumulatedBalance.toFixed(8)} => 0 (Transferring to main balance)`);
      
      // Обновляем основной баланс пользователя и сбрасываем накопленный баланс
      try {
        const updateResult = await db
          .update(users)
          .set({
            balance_uni: formattedNewBalance,
            uni_farming_balance: '0' // Обнуляем накопленный баланс после трансфера
          })
          .where(eq(users.id, userId))
          .returning({ balance_uni: users.balance_uni });
        
        if (updateResult && updateResult.length > 0) {
          console.log(`[MultiFarming] Balance Updated OK User ${userId} new balance confirmed: ${updateResult[0].balance_uni}`);
        } else {
          console.error(`[MultiFarming] Balance Update Failed User ${userId} - no rows updated`);
        }
      } catch (error) {
        console.error(`[MultiFarming] Balance Update Error User ${userId} - error updating balance:`, error);
      }
    } else {
      // Обновляем только накопленный баланс
      try {
        const updateResult = await db
          .update(users)
          .set({
            uni_farming_balance: newAccumulatedBalance.toFixed(8) // Сохраняем накопленное с большей точностью
          })
          .where(eq(users.id, userId))
          .returning({ uni_farming_balance: users.uni_farming_balance });
        
        if (updateResult && updateResult.length > 0) {
          console.log(`[MultiFarming] Accumulated Balance Updated User ${userId} | ${currentAccumulatedBalance.toFixed(8)} => ${updateResult[0].uni_farming_balance}`);
        } else {
          console.error(`[MultiFarming] Accumulated Balance Update Failed User ${userId} - no rows updated`);
        }
      } catch (error) {
        console.error(`[MultiFarming] Accumulated Balance Update Error User ${userId}:`, error);
      }
      
      console.log(`[MultiFarming] Balance No Change User ${userId} | Balance remains: ${formattedNewBalance} (Accumulating: ${newAccumulatedBalance.toFixed(8)})`);
    }
    
    return {
      totalDepositAmount: totalDepositAmount.toString(),
      totalRatePerSecond: totalRatePerSecond.toString(),
      earnedThisUpdate: totalEarnedAmount.toString(),
      depositCount: activeDeposits.length
    };
  }

  /**
   * Создает новый UNI фарминг-депозит
   * @param userId ID пользователя
   * @param amount Сумма депозита
   * @returns Объект с данными о созданном депозите
   */
  static async createUniFarmingDeposit(userId: number, amount: string): Promise<{
    success: boolean;
    message: string;
    depositId?: number;
    depositAmount?: string;
    ratePerSecond?: string;
  }> {
    try {
      // Проверяем, что сумма положительная
      const depositAmount = new BigNumber(amount);
      if (depositAmount.isNaN() || depositAmount.isLessThanOrEqualTo(0)) {
        return {
          success: false,
          message: 'Сумма депозита должна быть положительной'
        };
      }
      
      // Получаем данные пользователя
      const [user] = await db
        .select({
          balance_uni: users.balance_uni
        })
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user) {
        return {
          success: false,
          message: 'Пользователь не найден'
        };
      }
      
      // Проверяем, достаточно ли средств
      const balanceUni = new BigNumber(user.balance_uni !== null ? user.balance_uni.toString() : '0');
      if (balanceUni.isLessThan(depositAmount)) {
        return {
          success: false,
          message: 'Недостаточно средств на балансе'
        };
      }
      
      // Проверка минимальной суммы пополнения (0.001 UNI)
      if (depositAmount.isLessThan(0.001)) {
        return {
          success: false,
          message: 'Минимальная сумма пополнения - 0.001 UNI'
        };
      }
      
      // Рассчитываем скорость начисления
      const ratePerSecond = this.calculateRatePerSecond(depositAmount.toString());

      // Создаем новый депозит
      const currentTime = new Date();
      const [newDeposit] = await db
        .insert(uniFarmingDeposits)
        .values({
          user_id: userId,
          amount: depositAmount.toFixed(6),
          rate_per_second: ratePerSecond,
          created_at: currentTime,
          last_updated_at: currentTime,
          is_active: true
        })
        .returning();

      if (!newDeposit) {
        return {
          success: false,
          message: 'Ошибка при создании депозита'
        };
      }

      // Обновляем баланс пользователя
      await db
        .update(users)
        .set({
          balance_uni: balanceUni.minus(depositAmount).toFixed(6)
        })
        .where(eq(users.id, userId));
      
      return {
        success: true,
        message: 'Депозит успешно создан',
        depositId: newDeposit.id,
        depositAmount: depositAmount.toString(),
        ratePerSecond
      };
    } catch (error) {
      console.error('Error creating UNI farming deposit:', error);
      return {
        success: false,
        message: 'Произошла ошибка при создании депозита'
      };
    }
  }

  /**
   * Получает все активные депозиты пользователя
   * @param userId ID пользователя
   * @returns Массив активных депозитов
   */
  static async getUserFarmingDeposits(userId: number) {
    return await db
      .select()
      .from(uniFarmingDeposits)
      .where(and(
        eq(uniFarmingDeposits.user_id, userId),
        eq(uniFarmingDeposits.is_active, true)
      ));
  }

  /**
   * Получает данные о всех фарминг-депозитах пользователя и общую статистику
   * @param userId ID пользователя
   * @returns Объект с данными о фарминге
   */
  static async getUserFarmingInfo(userId: number): Promise<{
    isActive: boolean;
    totalDepositAmount: string;
    depositCount: number;
    totalRatePerSecond: string;
    dailyIncomeUni: string;
    deposits: any[];
  }> {
    // Обновляем баланс для получения актуальных данных
    await this.calculateAndUpdateUserFarming(userId);
    
    // Получаем все депозиты пользователя
    const deposits = await this.getUserFarmingDeposits(userId);
    
    // Если нет депозитов, возвращаем нулевые значения
    if (deposits.length === 0) {
      return {
        isActive: false,
        totalDepositAmount: '0',
        depositCount: 0,
        totalRatePerSecond: '0',
        dailyIncomeUni: '0',
        deposits: []
      };
    }

    // Считаем общую сумму депозитов и скорость начисления
    let totalDepositAmount = new BigNumber(0);
    let totalRatePerSecond = new BigNumber(0);

    for (const deposit of deposits) {
      totalDepositAmount = totalDepositAmount.plus(new BigNumber(deposit.amount.toString()));
      totalRatePerSecond = totalRatePerSecond.plus(new BigNumber(deposit.rate_per_second.toString()));
    }

    // Рассчитываем дневной доход
    const dailyIncomeUni = totalRatePerSecond.multipliedBy(this.SECONDS_IN_DAY).toString();

    return {
      isActive: deposits.length > 0,
      totalDepositAmount: totalDepositAmount.toString(),
      depositCount: deposits.length,
      totalRatePerSecond: totalRatePerSecond.toString(),
      dailyIncomeUni,
      deposits
    };
  }

  /**
   * Рассчитывает скорость начисления UNI в секунду
   * @param depositAmount Сумма депозита
   * @returns Скорость начисления в секунду
   */
  static calculateRatePerSecond(depositAmount: string): string {
    try {
      const deposit = new BigNumber(depositAmount);
      return deposit
        .multipliedBy(this.DAILY_RATE)
        .dividedBy(this.SECONDS_IN_DAY)
        .toString();
    } catch (error) {
      console.error('Error calculating rate per second:', error);
      return '0';
    }
  }
}