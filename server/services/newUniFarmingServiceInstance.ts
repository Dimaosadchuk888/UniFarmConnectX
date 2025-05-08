/**
 * Инстанс-ориентированная имплементация сервиса множественного UNI Farming
 * 
 * Этот файл содержит реализацию сервиса множественного UNI Farming,
 * который работает с таблицей uni_farming_deposits и поддерживает множественные депозиты
 */

import { db } from '../db';
import { and, eq } from 'drizzle-orm';
import { users, uniFarmingDeposits } from '@shared/schema';
import BigNumber from 'bignumber.js';
import { transactionService as TransactionService } from './index';
import { referralBonusService } from './index';

import { 
  MultiFarmingUpdateResult, 
  CreateMultiDepositResult, 
  MultiFarmingInfo,
  Currency,
  TransactionStatus,
  TransactionType
} from './newUniFarmingService';

/**
 * Интерфейс для сервиса множественного UNI Farming
 */
export interface INewUniFarmingService {
  calculateAndUpdateUserFarming(userId: number): Promise<MultiFarmingUpdateResult>;
  createUniFarmingDeposit(userId: number, amount: string): Promise<CreateMultiDepositResult>;
  getUserFarmingDeposits(userId: number): Promise<any[]>;
  getUserFarmingInfo(userId: number): Promise<MultiFarmingInfo>;
}

// Константы для расчетов
const DAILY_RATE = 0.005; // 0.5% в день
const SECONDS_IN_DAY = 86400;
const MIN_CHANGE_THRESHOLD = 0.000001; // Минимальный порог изменения для обновления баланса в БД

// Объявляем глобальные переменные для TypeScript
declare global {
  var _processingUsers: Map<number, boolean>;
}

// Создаем и экспортируем экземпляр сервиса
export const newUniFarmingServiceInstance: INewUniFarmingService = {
  async calculateAndUpdateUserFarming(userId: number): Promise<MultiFarmingUpdateResult> {
    // Защита от одновременных вызовов для одного пользователя
    if (!globalThis._processingUsers) {
      globalThis._processingUsers = new Map<number, boolean>();
    }

    if (globalThis._processingUsers.get(userId)) {
      return {
        totalDepositAmount: '0',
        totalRatePerSecond: '0',
        earnedThisUpdate: '0',
        depositCount: 0
      };
    }

    globalThis._processingUsers.set(userId, true);

    try {
      const [user] = await db
        .select({
          balance_uni: users.balance_uni,
          uni_farming_balance: users.uni_farming_balance
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return {
          totalDepositAmount: '0',
          totalRatePerSecond: '0',
          earnedThisUpdate: '0',
          depositCount: 0
        };
      }

      const currentBalance = new BigNumber(user.balance_uni !== null ? user.balance_uni.toString() : '0');
      
      const activeDeposits = await db
        .select()
        .from(uniFarmingDeposits)
        .where(and(
          eq(uniFarmingDeposits.user_id, userId),
          eq(uniFarmingDeposits.is_active, true)
        ));

      if (activeDeposits.length === 0) {
        return {
          totalDepositAmount: '0',
          totalRatePerSecond: '0',
          earnedThisUpdate: '0',
          depositCount: 0
        };
      }

      let totalDepositAmount = new BigNumber(0);
      let totalRatePerSecond = new BigNumber(0);
      let totalEarnedAmount = new BigNumber(0);
      const now = new Date();

      // Обрабатываем каждый депозит
      for (const deposit of activeDeposits) {
        const depositAmount = new BigNumber(deposit.amount.toString());
        totalDepositAmount = totalDepositAmount.plus(depositAmount);

        const lastUpdate = deposit.last_updated_at;
        const secondsSinceLastUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
        
        const MAX_SECONDS_BETWEEN_UPDATES = 10;
        
        const effectiveSeconds = Math.min(
          MAX_SECONDS_BETWEEN_UPDATES,
          Math.max(0.1, secondsSinceLastUpdate)
        );

        const ratePerSecond = new BigNumber(deposit.rate_per_second.toString());
        const earnedAmount = ratePerSecond.multipliedBy(effectiveSeconds);

        console.log(`[MultiFarming] User ${userId} Deposit #${deposit.id}: Amount=${depositAmount.toString()}, Rate=${ratePerSecond.toString()}/sec, Time=${effectiveSeconds}s, Earned=${earnedAmount.toString()}`);

        totalEarnedAmount = totalEarnedAmount.plus(earnedAmount);
        totalRatePerSecond = totalRatePerSecond.plus(ratePerSecond);

        await db
          .update(uniFarmingDeposits)
          .set({
            last_updated_at: now
          })
          .where(eq(uniFarmingDeposits.id, deposit.id));
      }

      const currentAccumulatedBalance = new BigNumber(user.uni_farming_balance !== null ? user.uni_farming_balance.toString() : '0');
      const newAccumulatedBalance = currentAccumulatedBalance.plus(totalEarnedAmount);

      const readyToUpdate = newAccumulatedBalance.isGreaterThanOrEqualTo(MIN_CHANGE_THRESHOLD);
      
      const newBalance = currentBalance.plus(totalEarnedAmount);
      const formattedNewBalance = newBalance.toFixed(6);

      if (readyToUpdate) {
        console.log(`[MultiFarming] Balance Updated User ${userId} | Balance: ${currentBalance.toFixed(6)} => ${formattedNewBalance}`);
        console.log(`[MultiFarming] Accumulated Balance User ${userId} | ${currentAccumulatedBalance.toFixed(8)} => 0 (Transferring to main balance)`);
        
        try {
          const updateResult = await db
            .update(users)
            .set({
              balance_uni: formattedNewBalance,
              uni_farming_balance: '0'
            })
            .where(eq(users.id, userId))
            .returning({ balance_uni: users.balance_uni });
          
          if (updateResult && updateResult.length > 0) {
            console.log(`[MultiFarming] Balance Updated OK User ${userId} new balance confirmed: ${updateResult[0].balance_uni}`);
            
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
              
              try {
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
        try {
          const updateResult = await db
            .update(users)
            .set({
              uni_farming_balance: newAccumulatedBalance.toFixed(8)
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
      globalThis._processingUsers.set(userId, false);
    }
  },

  async createUniFarmingDeposit(userId: number, amount: string): Promise<CreateMultiDepositResult> {
    try {
      const depositAmount = new BigNumber(amount);
      if (depositAmount.isNaN() || depositAmount.isLessThanOrEqualTo(0)) {
        return {
          success: false,
          message: 'Сумма депозита должна быть положительной'
        };
      }
      
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
      
      const balanceUni = new BigNumber(user.balance_uni !== null ? user.balance_uni.toString() : '0');
      if (balanceUni.decimalPlaces(6).isLessThan(depositAmount)) {
        return {
          success: false,
          message: 'Недостаточно средств на балансе'
        };
      }
      
      if (depositAmount.isLessThan(0.001)) {
        return {
          success: false,
          message: 'Минимальная сумма пополнения - 0.001 UNI'
        };
      }
      
      const ratePerSecond = depositAmount
        .multipliedBy(DAILY_RATE)
        .dividedBy(SECONDS_IN_DAY)
        .toString();

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

      await db
        .update(users)
        .set({
          balance_uni: balanceUni.minus(depositAmount).toFixed(6)
        })
        .where(eq(users.id, userId));
        
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

  async getUserFarmingDeposits(userId: number) {
    return await db
      .select()
      .from(uniFarmingDeposits)
      .where(and(
        eq(uniFarmingDeposits.user_id, userId),
        eq(uniFarmingDeposits.is_active, true)
      ));
  },

  async getUserFarmingInfo(userId: number): Promise<MultiFarmingInfo> {
    try {
      await this.calculateAndUpdateUserFarming(userId);
    } catch (err) {
      console.error('[getUserFarmingInfo] Ошибка при обновлении фарминга:', err);
    }
    
    const deposits = await this.getUserFarmingDeposits(userId);
    
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

    let totalDepositAmount = new BigNumber(0);
    let totalRatePerSecond = new BigNumber(0);

    for (const deposit of deposits) {
      totalDepositAmount = totalDepositAmount.plus(new BigNumber(deposit.amount.toString()));
      totalRatePerSecond = totalRatePerSecond.plus(new BigNumber(deposit.rate_per_second.toString()));
    }

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

/**
 * Функция для получения экземпляра сервиса множественного UNI Farming
 * @returns Экземпляр сервиса
 */
export function createNewUniFarmingService(): INewUniFarmingService {
  return newUniFarmingServiceInstance;
}