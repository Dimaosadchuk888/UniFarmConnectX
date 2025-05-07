/**
 * Инстанс-ориентированная имплементация сервиса UNI Farming
 * 
 * Этот файл содержит основную реализацию сервиса UNI Farming,
 * который работает на базе конкретного инстанса
 */

import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { BigNumber } from 'bignumber.js';

// Используем BigNumber для точных вычислений с плавающей точкой
BigNumber.config({
  DECIMAL_PLACES: 10,
  ROUNDING_MODE: BigNumber.ROUND_DOWN
});

/**
 * Интерфейс для обновления фарминга пользователя
 */
export interface FarmingUpdateResult {
  depositAmount: string;
  farmingBalance: string;
  ratePerSecond: string;
  earnedThisUpdate: string;
}

/**
 * Интерфейс для создания депозита
 */
export interface CreateDepositResult {
  success: boolean;
  message: string;
  depositAmount?: string;
  ratePerSecond?: string;
}

/**
 * Интерфейс для информации о фарминге пользователя
 */
export interface FarmingInfo {
  isActive: boolean;
  depositAmount: string;
  farmingBalance: string;
  ratePerSecond: string;
  startDate: string | null;
}

/**
 * Интерфейс для результата сбора вознаграждения
 */
export interface HarvestResult {
  success: boolean;
  message: string;
  harvestedAmount?: string;
}

/**
 * Интерфейс сервиса UNI Farming
 */
export interface IUniFarmingService {
  /**
   * Начисляет доход пользователю от UNI фарминга на основе времени с последнего обновления
   * Доход начисляется напрямую на основной баланс пользователя в соответствии с ТЗ
   * @param userId ID пользователя
   * @returns Объект с обновленными данными или null, если фарминг не активен
   */
  calculateAndUpdateUserFarming(userId: number): Promise<FarmingUpdateResult | null>;

  /**
   * Создает UNI фарминг-депозит для пользователя
   * @param userId ID пользователя
   * @param amount Сумма депозита
   * @returns Объект с данными о созданном депозите
   */
  createUniFarmingDeposit(userId: number, amount: string): Promise<CreateDepositResult>;

  /**
   * Получает данные о UNI фарминге пользователя
   * @param userId ID пользователя
   * @returns Объект с данными о фарминге
   */
  getUserFarmingInfo(userId: number): Promise<FarmingInfo>;

  /**
   * Рассчитывает скорость начисления UNI в секунду
   * @param depositAmount Сумма депозита
   * @returns Скорость начисления в секунду
   */
  calculateRatePerSecond(depositAmount: string): string;

  /**
   * Метод сохранен для обратной совместимости
   * В новой версии доход автоматически начисляется на основной баланс
   * @param userId ID пользователя 
   * @returns Информационное сообщение о том, что доход начисляется автоматически
   */
  harvestFarmingBalance(userId: number): Promise<HarvestResult>;
}

/**
 * Фабрика для создания сервиса UNI Farming
 */
export function createUniFarmingService(): IUniFarmingService {
  // Константы для расчетов
  const DAILY_RATE = 0.005; // 0.5% в день
  const SECONDS_IN_DAY = 86400;
  const MIN_CHANGE_THRESHOLD = 0.000001; // Минимальный порог изменения для обновления баланса в БД

  return {
    /**
     * Начисляет доход пользователю от UNI фарминга на основе времени с последнего обновления
     * Доход начисляется напрямую на основной баланс пользователя в соответствии с ТЗ
     * @param userId ID пользователя
     * @returns Объект с обновленными данными или null, если фарминг не активен
     */
    async calculateAndUpdateUserFarming(userId: number): Promise<FarmingUpdateResult | null> {
      // Получаем данные пользователя
      const [user] = await db
        .select({
          balance_uni: users.balance_uni,
          uni_deposit_amount: users.uni_deposit_amount,
          uni_farming_start_timestamp: users.uni_farming_start_timestamp,
          uni_farming_balance: users.uni_farming_balance,
          uni_farming_last_update: users.uni_farming_last_update
        })
        .from(users)
        .where(eq(users.id, userId));

      // Проверка, что фарминг активен (есть депозит и время старта)
      if (!user || 
          !user.uni_deposit_amount || 
          new BigNumber(user.uni_deposit_amount.toString()).isZero() ||
          !user.uni_farming_start_timestamp) {
        return null;
      }

      // Рассчитать текущую временную метку
      const now = new Date();
      const lastUpdate = user.uni_farming_last_update || user.uni_farming_start_timestamp;
      
      // Рассчитать прошедшие секунды с последнего обновления
      const secondsSinceLastUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
      
      // Даже если прошло меньше секунды, всегда начисляем хоть что-то при вызове метода
      // Это гарантирует, что начисления будут добавляться при каждом вызове
      // Удаляем блокировку обновления, если secondsSinceLastUpdate <= 0
      // Минимальное начисление за 0.1 секунды
      const effectiveSeconds = Math.max(0.1, secondsSinceLastUpdate);

      // Рассчитать доход за прошедшие секунды (используем effectiveSeconds)
      const depositAmount = new BigNumber(user.uni_deposit_amount.toString());
      const ratePerSecond = depositAmount.multipliedBy(DAILY_RATE).dividedBy(SECONDS_IN_DAY);
      // Используем effectiveSeconds вместо secondsSinceLastUpdate, чтобы гарантировать начисление
      const earnedAmount = ratePerSecond.multipliedBy(effectiveSeconds);
      
      // Логирование для диагностики
      console.log(`[UniFarming] User ${userId}: Deposit=${depositAmount.toString()}, Rate=${ratePerSecond.toString()}/sec, Time=${effectiveSeconds}s, Earned=${earnedAmount.toString()}`);
      
      
      // Текущий баланс пользователя
      const currentBalance = new BigNumber(user.balance_uni !== null ? user.balance_uni.toString() : '0');
      // Новый баланс с учетом начисленного дохода
      const newBalance = currentBalance.plus(earnedAmount);
      
      // Форматируем с 6 знаками после запятой как указано в ТЗ
      const formattedNewBalance = newBalance.toFixed(6);
      
      // Используем имеющееся поле uni_farming_balance как накопитель для микро-начислений
      // Это позволит накапливать маленькие суммы до достижения порога для обновления основного баланса
      const currentAccumulatedBalance = new BigNumber(user.uni_farming_balance !== null ? user.uni_farming_balance.toString() : '0');
      const newAccumulatedBalance = currentAccumulatedBalance.plus(earnedAmount);
      
      // Проверяем, достаточно ли накопленной суммы для обновления баланса
      const readyToUpdate = newAccumulatedBalance.isGreaterThanOrEqualTo(MIN_CHANGE_THRESHOLD);
      
      // Если сумма достигла порога или общая заработанная сумма достаточно большая
      const hasBalanceChanged = readyToUpdate || earnedAmount.isGreaterThanOrEqualTo(MIN_CHANGE_THRESHOLD);
      
      if (hasBalanceChanged) {
        // Логируем, что будем обновлять баланс
        console.log(`[Balance Updated] User ${userId} | Balance: ${currentBalance.toFixed(6)} => ${formattedNewBalance}`);
        console.log(`[Accumulated Balance] User ${userId} | ${currentAccumulatedBalance.toFixed(8)} => 0 (Transferring to main balance)`);
        
        // Обновляем основной баланс пользователя и сбрасываем накопленный баланс
        try {
          const updateResult = await db
            .update(users)
            .set({
              balance_uni: formattedNewBalance,
              uni_farming_last_update: now,
              uni_farming_balance: '0' // Обнуляем накопленный баланс после трансфера
            })
            .where(eq(users.id, userId))
            .returning({ balance_uni: users.balance_uni });
          
          if (updateResult && updateResult.length > 0) {
            console.log(`[Balance Updated OK] User ${userId} new balance confirmed: ${updateResult[0].balance_uni}`);
          } else {
            console.error(`[Balance Update Failed] User ${userId} - no rows updated`);
          }
        } catch (error) {
          console.error(`[Balance Update Error] User ${userId} - error updating balance:`, error);
        }
      } else {
        // Обновляем только накопленный баланс и timestamp
        try {
          const updateResult = await db
            .update(users)
            .set({
              uni_farming_balance: newAccumulatedBalance.toFixed(8), // Сохраняем накопленное с большей точностью
              uni_farming_last_update: now
            })
            .where(eq(users.id, userId))
            .returning({ uni_farming_balance: users.uni_farming_balance });
          
          if (updateResult && updateResult.length > 0) {
            console.log(`[Accumulated Balance Updated] User ${userId} | ${currentAccumulatedBalance.toFixed(8)} => ${updateResult[0].uni_farming_balance}`);
          } else {
            console.error(`[Accumulated Balance Update Failed] User ${userId} - no rows updated`);
          }
        } catch (error) {
          console.error(`[Accumulated Balance Update Error] User ${userId}:`, error);
        }
        
        console.log(`[Balance No Change] User ${userId} | Balance remains: ${formattedNewBalance} (Accumulating: ${newAccumulatedBalance.toFixed(8)})`);
      }
      
      return {
        depositAmount: depositAmount.toString(),
        farmingBalance: '0', // Теперь баланс фарминга всегда 0, т.к. доход сразу идет на основной баланс
        ratePerSecond: ratePerSecond.toString(),
        earnedThisUpdate: earnedAmount.toString()
      };
    },

    /**
     * Создает UNI фарминг-депозит для пользователя
     * @param userId ID пользователя
     * @param amount Сумма депозита
     * @returns Объект с данными о созданном депозите
     */
    async createUniFarmingDeposit(userId: number, amount: string): Promise<CreateDepositResult> {
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
            balance_uni: users.balance_uni,
            uni_deposit_amount: users.uni_deposit_amount,
            uni_farming_start_timestamp: users.uni_farming_start_timestamp
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
        
        // Текущая временная метка
        const now = new Date();
        
        // Проверяем, первый ли это депозит
        const isFirstDeposit = !user.uni_farming_start_timestamp || 
                              new BigNumber(user.uni_deposit_amount?.toString() || '0').isZero();
        
        // Обновляем данные пользователя
        await db
          .update(users)
          .set({
            balance_uni: balanceUni.minus(depositAmount).toString(),
            uni_deposit_amount: depositAmount.toString(),
            uni_farming_start_timestamp: isFirstDeposit ? now : user.uni_farming_start_timestamp,
            uni_farming_last_update: now
            // В новой версии не используем uni_farming_balance, т.к. доход начисляется напрямую
          })
          .where(eq(users.id, userId));
        
        // Рассчитываем скорость начисления
        const ratePerSecond = this.calculateRatePerSecond(depositAmount.toString());
        
        return {
          success: true,
          message: 'Депозит успешно создан',
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
    },

    /**
     * Получает данные о UNI фарминге пользователя
     * @param userId ID пользователя
     * @returns Объект с данными о фарминге
     */
    async getUserFarmingInfo(userId: number): Promise<FarmingInfo> {
      // Обновляем баланс для получения актуальных данных
      const updatedFarming = await this.calculateAndUpdateUserFarming(userId);
      
      // Получаем данные пользователя
      const [user] = await db
        .select({
          uni_deposit_amount: users.uni_deposit_amount,
          uni_farming_start_timestamp: users.uni_farming_start_timestamp,
          uni_farming_last_update: users.uni_farming_last_update
        })
        .from(users)
        .where(eq(users.id, userId));
      
      // Значения по умолчанию, если пользователь не найден
      if (!user) {
        return {
          isActive: false,
          depositAmount: '0',
          farmingBalance: '0',
          ratePerSecond: '0',
          startDate: null
        };
      }
      
      const depositAmount = user.uni_deposit_amount?.toString() || '0';
      const isActive = new BigNumber(depositAmount).isGreaterThan(0) && !!user.uni_farming_start_timestamp;
      
      return {
        isActive,
        depositAmount,
        farmingBalance: '0', // В новой версии всегда 0, т.к. доход начисляется автоматически
        ratePerSecond: isActive ? this.calculateRatePerSecond(depositAmount) : '0',
        startDate: user.uni_farming_start_timestamp ? user.uni_farming_start_timestamp.toISOString() : null
      };
    },

    /**
     * Рассчитывает скорость начисления UNI в секунду
     * @param depositAmount Сумма депозита
     * @returns Скорость начисления в секунду
     */
    calculateRatePerSecond(depositAmount: string): string {
      try {
        const deposit = new BigNumber(depositAmount);
        return deposit
          .multipliedBy(DAILY_RATE)
          .dividedBy(SECONDS_IN_DAY)
          .toString();
      } catch (error) {
        console.error('Error calculating rate per second:', error);
        return '0';
      }
    },

    /**
     * Метод сохранен для обратной совместимости
     * В новой версии доход автоматически начисляется на основной баланс
     * @param userId ID пользователя 
     * @returns Информационное сообщение о том, что доход начисляется автоматически
     */
    async harvestFarmingBalance(userId: number): Promise<HarvestResult> {
      try {
        // Обновляем баланс для получения актуальных данных
        const updatedFarming = await this.calculateAndUpdateUserFarming(userId);
        
        // Если фарминг не активен
        if (!updatedFarming) {
          return {
            success: false,
            message: 'У вас нет активного депозита'
          };
        }
        
        // В новой версии доход начисляется автоматически на основной баланс
        return {
          success: true,
          message: 'Доход от фарминга теперь начисляется автоматически на ваш основной баланс',
          harvestedAmount: '0' // Всегда 0, т.к. всё начисляется автоматически
        };
      } catch (error) {
        console.error('Error in harvest farming method:', error);
        return {
          success: false,
          message: 'Произошла ошибка при проверке фарминга'
        };
      }
    }
  };
}