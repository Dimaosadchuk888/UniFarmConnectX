/**
 * Инстанс-ориентированная имплементация сервиса множественного UNI Farming
 * 
 * Этот файл содержит реализацию сервиса множественного UNI Farming,
 * который работает с таблицей uni_farming_deposits и поддерживает множественные депозиты
 */

import { db } from '../db';
import { users, uniFarmingDeposits } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { BigNumber } from 'bignumber.js';
import { TransactionService, TransactionType, Currency, TransactionStatus } from './transactionService';
import { referralBonusService } from './index';

// Глобальное объявление для TypeScript
declare global {
  var _processingUsers: Map<number, boolean>;
}

// Используем BigNumber для точных вычислений с плавающей точкой
BigNumber.config({
  DECIMAL_PLACES: 16,
  ROUNDING_MODE: BigNumber.ROUND_DOWN
});

/**
 * Результат обновления фарминга пользователя
 */
export interface MultiFarmingUpdateResult {
  totalDepositAmount: string;
  totalRatePerSecond: string;
  earnedThisUpdate: string;
  depositCount: number;
}

/**
 * Результат создания депозита
 */
export interface CreateMultiDepositResult {
  success: boolean;
  message: string;
  depositId?: number;
  depositAmount?: string;
  ratePerSecond?: string;
}

/**
 * Информация о фарминге пользователя
 */
export interface MultiFarmingInfo {
  isActive: boolean;
  totalDepositAmount: string;
  depositCount: number;
  totalRatePerSecond: string;
  dailyIncomeUni: string;
  deposits: any[];
}

/**
 * Интерфейс для сервиса множественного UNI Farming
 */
export interface INewUniFarmingService {
  /**
   * Начисляет доход пользователю от UNI фарминга на основе всех активных депозитов
   * @param userId ID пользователя
   * @returns Объект с обновленными данными
   */
  calculateAndUpdateUserFarming(userId: number): Promise<MultiFarmingUpdateResult>;

  /**
   * Создает новый UNI фарминг-депозит
   * @param userId ID пользователя
   * @param amount Сумма депозита
   * @returns Объект с данными о созданном депозите
   */
  createUniFarmingDeposit(userId: number, amount: string): Promise<CreateMultiDepositResult>;

  /**
   * Получает все активные депозиты пользователя
   * @param userId ID пользователя
   * @returns Массив активных депозитов
   */
  getUserFarmingDeposits(userId: number): Promise<any[]>;

  /**
   * Получает данные о всех фарминг-депозитах пользователя и общую статистику
   * @param userId ID пользователя
   * @returns Объект с данными о фарминге
   */
  getUserFarmingInfo(userId: number): Promise<MultiFarmingInfo>;
}

/**
 * Фабрика для создания сервиса множественного UNI Farming
 */
export function createNewUniFarmingService(): INewUniFarmingService {
  // Константы для расчетов
  const DAILY_RATE = 0.005; // 0.5% в день
  const SECONDS_IN_DAY = 86400;
  const MIN_CHANGE_THRESHOLD = 0.000001; // Минимальный порог изменения для обновления баланса в БД

  return {
    /**
     * Начисляет доход пользователю от UNI фарминга на основе всех активных депозитов
     * @param userId ID пользователя
     * @returns Объект с обновленными данными
     */
    async calculateAndUpdateUserFarming(userId: number): Promise<MultiFarmingUpdateResult> {
      // Защита от одновременных вызовов для одного пользователя
      // Используем глобальный объект для отслеживания обработки пользователей
      if (!globalThis._processingUsers) {
        globalThis._processingUsers = new Map<number, boolean>();
      }

      // Если пользователь уже обрабатывается, пропускаем текущий вызов
      if (globalThis._processingUsers.get(userId)) {
        // console.log(`[MultiFarming] User ${userId} is already being processed, skipping`);
        return {
          totalDepositAmount: '0',
          totalRatePerSecond: '0',
          earnedThisUpdate: '0',
          depositCount: 0
        };
      }

      // Отмечаем, что начали обработку пользователя
      globalThis._processingUsers.set(userId, true);

      try {
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
          
          // Защита от чрезмерного начисления при перезагрузке сервера или длительных перерывах
          // Ограничиваем максимальное время с последнего обновления 10 секундами
          // Это предотвращает накопление огромных сумм при перезапусках
          const MAX_SECONDS_BETWEEN_UPDATES = 10;
          
          // Минимальное начисление за 0.1 секунды, но не более MAX_SECONDS_BETWEEN_UPDATES
          const effectiveSeconds = Math.min(
            MAX_SECONDS_BETWEEN_UPDATES,
            Math.max(0.1, secondsSinceLastUpdate)
          );

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
        const readyToUpdate = newAccumulatedBalance.isGreaterThanOrEqualTo(MIN_CHANGE_THRESHOLD);
        
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
              
              // Логируем транзакцию в БД
              try {
                await TransactionService.logTransaction({
                  userId,
                  type: TransactionType.FARMING_REWARD,
                  currency: Currency.UNI,
                  amount: totalEarnedAmount.toString(),
                  status: TransactionStatus.CONFIRMED,
                  source: 'MultiFarming',
                  category: 'farming'
                });
                
                // Обрабатываем реферальные бонусы от дохода фарминга
                try {
                  // Пытаемся начислить "доход от дохода" рефералам
                  const { totalRewardsDistributed } = await referralBonusService.processFarmingReferralReward(
                    userId,
                    totalEarnedAmount.toNumber(),
                    Currency.UNI
                  );
                  
                  if (totalRewardsDistributed > 0) {
                    console.log(`[MultiFarming] Referral Income From Income | User ${userId} earned ${totalEarnedAmount.toString()} UNI and distributed ${totalRewardsDistributed.toFixed(8)} UNI to referrals`);
                  }
                } catch (referralError) {
                  console.error(`[MultiFarming] Error processing referral rewards from farming income for user ${userId}:`, referralError);
                }
              } catch (logError) {
                console.error(`[MultiFarming] Transaction Logging Error User ${userId}:`, logError);
              }
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
      } catch (error) {
        console.error(`[MultiFarming] Error in calculateAndUpdateUserFarming for user ${userId}:`, error);
        
        return {
          totalDepositAmount: '0',
          totalRatePerSecond: '0',
          earnedThisUpdate: '0',
          depositCount: 0
        };
      } finally {
        // Освобождаем блокировку гарантированно в любом случае
        globalThis._processingUsers.set(userId, false);
      }
    },

    /**
     * Создает новый UNI фарминг-депозит
     * @param userId ID пользователя
     * @param amount Сумма депозита
     * @returns Объект с данными о созданном депозите
     */
    async createUniFarmingDeposit(userId: number, amount: string): Promise<CreateMultiDepositResult> {
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
        
        // Проверяем, достаточно ли средств (с округлением для точного сравнения)
        const balanceUni = new BigNumber(user.balance_uni !== null ? user.balance_uni.toString() : '0');
        if (balanceUni.decimalPlaces(6).isLessThan(depositAmount)) {
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
        const ratePerSecond = depositAmount
          .multipliedBy(DAILY_RATE)
          .dividedBy(SECONDS_IN_DAY)
          .toString();

        // Создаем новый депозит (в отдельном блоке try-catch)
        let newDeposit;
        try {
          const currentTime = new Date();
          [newDeposit] = await db
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
            throw new Error('Ошибка при создании депозита');
          }
        } catch (err) {
          console.error('[createUniFarmingDeposit] Ошибка при вставке в БД:', err);
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
          
        // Логируем транзакцию создания депозита
        await TransactionService.logTransaction({
          userId,
          type: TransactionType.DEPOSIT,
          currency: Currency.UNI,
          amount: depositAmount.toString(),
          status: TransactionStatus.CONFIRMED,
          source: 'UNI Farming Deposit',
          category: 'deposit'
        });
        
        return {
          success: true,
          message: 'Депозит успешно создан',
          depositId: newDeposit.id,
          depositAmount: depositAmount.toString(),
          ratePerSecond
        };
      } catch (error) {
        console.error('[createUniFarmingDeposit] Неизвестная ошибка:', error);
        return {
          success: false,
          message: 'Неожиданная ошибка при создании депозита'
        };
      }
    },

    /**
     * Получает все активные депозиты пользователя
     * @param userId ID пользователя
     * @returns Массив активных депозитов
     */
    async getUserFarmingDeposits(userId: number) {
      return await db
        .select()
        .from(uniFarmingDeposits)
        .where(and(
          eq(uniFarmingDeposits.user_id, userId),
          eq(uniFarmingDeposits.is_active, true)
        ));
    },

    /**
     * Получает данные о всех фарминг-депозитах пользователя и общую статистику
     * @param userId ID пользователя
     * @returns Объект с данными о фарминге
     */
    async getUserFarmingInfo(userId: number): Promise<MultiFarmingInfo> {
      // Обновляем баланс для получения актуальных данных
      try {
        await this.calculateAndUpdateUserFarming(userId);
      } catch (err) {
        console.error('[getUserFarmingInfo] Ошибка при обновлении фарминга:', err);
      }
      
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
      const dailyIncomeUni = totalRatePerSecond.multipliedBy(SECONDS_IN_DAY).toString();

      return {
        isActive: deposits.length > 0,
        totalDepositAmount: totalDepositAmount.toString(),
        depositCount: deposits.length,
        totalRatePerSecond: totalRatePerSecond.toString(),
        dailyIncomeUni,
        deposits
      };
    }
  };
}