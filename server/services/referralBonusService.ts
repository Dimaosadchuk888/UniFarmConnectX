import { db } from '../db';
import { ReferralService } from './referralService';
import { UserService } from './userService';
import { TransactionType, Currency, TransactionStatus } from './transactionService';
import { eq } from 'drizzle-orm';
import { users, referrals, transactions, insertTransactionSchema } from '@shared/schema';
import { z } from 'zod';

/**
 * Сервис для обработки реферальных вознаграждений
 * Поддерживает начисления:
 * 1. От пополнений (покупки бустов - processReferralBonus)
 * 2. От фарминга (доход от дохода - processFarmingReferralReward)
 */
export class ReferralBonusService {
  // Минимальный порог для начисления реферального вознаграждения (для избежания микротранзакций)
  private static readonly MIN_REWARD_THRESHOLD = 0.000001;
  // Максимальное количество уровней в партнерской программе
  static readonly MAX_LEVELS = 20;
  
  // Проценты для вознаграждений на каждом уровне (в %)
  static readonly LEVEL_PERCENTS: number[] = [
    15,  // Уровень 1 - 15%
    8,   // Уровень 2 - 8%
    5,   // Уровень 3 - 5%
    3,   // Уровень 4 - 3%
    2,   // Уровень 5 - 2%
    1,   // Уровень 6 - 1%
    0.9, // Уровень 7 - 0.9%
    0.8, // Уровень 8 - 0.8%
    0.7, // Уровень 9 - 0.7%
    0.6, // Уровень 10 - 0.6%
    0.5, // Уровень 11 - 0.5%
    0.4, // Уровень 12 - 0.4%
    0.3, // Уровень 13 - 0.3%
    0.2, // Уровень 14 - 0.2%
    0.1, // Уровень 15 - 0.1%
    0.1, // Уровень 16 - 0.1%
    0.1, // Уровень 17 - 0.1%
    0.1, // Уровень 18 - 0.1%
    0.1, // Уровень 19 - 0.1%
    0.1  // Уровень 20 - 0.1%
  ];
  
  /**
   * Создаёт реферальную цепочку до 20 уровней на основе приглашающего
   * @param userId ID пользователя
   * @param inviterId ID приглашающего пользователя
   */
  static async createReferralChain(userId: number, inviterId: number): Promise<void> {
    try {
      // Проверка существования пользователей
      const user = await UserService.getUserById(userId);
      const inviter = await UserService.getUserById(inviterId);
      
      if (!user || !inviter) {
        console.error('[ReferralBonusService] User or inviter not found:', { userId, inviterId });
        return;
      }
      
      // Записываем первый уровень - прямое приглашение
      await ReferralService.createReferral({
        user_id: userId,
        inviter_id: inviterId,
        level: 1
      });
      
      // Получаем все вышестоящие уровни для пригласителя
      const inviterReferrals = await db
        .select()
        .from(referrals)
        .where(eq(referrals.user_id, inviterId))
        .orderBy(referrals.level);
      
      // Создаем последующие уровни (до MAX_LEVELS)
      for (const ref of inviterReferrals) {
        // Проверяем, что уровень определен и не превышаем MAX_LEVELS
        if (ref.level !== null && ref.level >= this.MAX_LEVELS) {
          break;
        }
        
        // Записываем новый уровень, предварительно убедившись, что ref.level не null
        await ReferralService.createReferral({
          user_id: userId,
          inviter_id: ref.inviter_id,
          level: ref.level !== null ? ref.level + 1 : 1
        });
      }
      
      console.log(`[ReferralBonusService] Referral chain created for user ${userId} with inviter ${inviterId}`);
    } catch (error) {
      console.error('[ReferralBonusService] Error creating referral chain:', error);
    }
  }
  
  /**
   * Начисляет реферальное вознаграждение при пополнении баланса
   * @param userId ID пользователя, который совершил пополнение
   * @param amount Сумма пополнения
   * @param currency Валюта (UNI/TON)
   */
  /**
   * Начисляет реферальное вознаграждение от фарминга (доход от дохода)
   * @param userId ID пользователя, который получил фарминг-доход
   * @param earnedAmount Сумма заработка от фарминга
   * @param currency Валюта (UNI/TON)
   * @returns Объект с информацией о начисленных бонусах
   */
  static async processFarmingReferralReward(userId: number, earnedAmount: number, currency: Currency): Promise<{totalRewardsDistributed: number}> {
    try {
      // Общая сумма распределенных бонусов
      let totalRewardsDistributed = 0;
      
      // Если сумма слишком мала, не выполняем расчеты
      if (earnedAmount < this.MIN_REWARD_THRESHOLD) {
        return {totalRewardsDistributed: 0};
      }
      
      // Получаем всех пригласителей пользователя
      const userReferrals = await db
        .select()
        .from(referrals)
        .where(eq(referrals.user_id, userId))
        .orderBy(referrals.level);
      
      // Если нет реферальных связей, выходим
      if (userReferrals.length === 0) {
        return {totalRewardsDistributed: 0};
      }
      
      // Для каждого уровня начисляем вознаграждение
      for (const ref of userReferrals) {
        // Проверяем, что уровень определен
        if (ref.level === null) {
          continue;
        }
        
        const level = ref.level;
        
        // Проверяем, что уровень в пределах допустимых
        if (level <= 0 || level > this.MAX_LEVELS) {
          continue;
        }
        
        // Получаем процент для данного уровня
        const percent = this.LEVEL_PERCENTS[level - 1];
        
        // Вычисляем сумму вознаграждения
        const bonusAmount = earnedAmount * (percent / 100);
        
        // Пропускаем микро-начисления
        if (bonusAmount < this.MIN_REWARD_THRESHOLD) {
          continue;
        }
        
        // Начисляем вознаграждение пригласителю
        if (bonusAmount > 0 && ref.inviter_id !== null) {
          // Получаем пользователя-приглашателя
          const inviter = await UserService.getUserById(ref.inviter_id);
          if (!inviter) {
            continue;
          }
          
          // Проверяем значения баланса и обрабатываем null значения
          const uniBalance = inviter.balance_uni !== null ? inviter.balance_uni : "0";
          const tonBalance = inviter.balance_ton !== null ? inviter.balance_ton : "0";
          
          // Увеличиваем баланс пользователя
          const newBalance = currency === Currency.UNI 
            ? Number(uniBalance) + bonusAmount 
            : Number(tonBalance) + bonusAmount;
          
          // Обновляем баланс пользователя
          await UserService.updateUserBalance(ref.inviter_id, {
            balance_uni: currency === Currency.UNI ? newBalance.toString() : uniBalance,
            balance_ton: currency === Currency.TON ? newBalance.toString() : tonBalance
          });
          
          // Создаем и валидируем данные транзакции через схему
          const transactionData = insertTransactionSchema.parse({
            user_id: ref.inviter_id,
            type: TransactionType.REFERRAL,
            amount: bonusAmount.toString(),
            currency: currency,
            status: TransactionStatus.CONFIRMED,
            source: "Referral Income",
            description: `Referral reward from level ${level} farming`,
            source_user_id: userId, // ID реферала, чьи доходы стали источником
            category: "bonus"
          });
          
          // Вставляем данные в таблицу транзакций
          await db
            .insert(transactions)
            .values(transactionData);
          
          // Суммируем начисленные бонусы
          totalRewardsDistributed += bonusAmount;
          
          console.log(
            `[Farming ReferralBonus] Level ${level} (${percent}%) | Amount: ${bonusAmount.toFixed(8)} ${currency} | ` +
            `From: ${userId} | To: ${ref.inviter_id} | Processed`
          );
        }
      }
      
      return {totalRewardsDistributed};
    } catch (error) {
      console.error('[ReferralBonusService] Error processing farming referral reward:', error);
      return {totalRewardsDistributed: 0};
    }
  }
  
  /**
   * Начисляет реферальное вознаграждение при пополнении баланса или покупке буста
   * @param userId ID пользователя, который совершил пополнение
   * @param amount Сумма пополнения
   * @param currency Валюта (UNI/TON)
   * @returns Сумма начисленных бонусов
   */
  static async processReferralBonus(userId: number, amount: number, currency: Currency): Promise<number> {
    try {
      console.log(`[ReferralBonus] Processing bonus for user ${userId}, amount: ${amount} ${currency}`);
      
      let totalDistributed = 0;
      
      // Если сумма меньше порогового значения, не начисляем бонусы
      if (amount < this.MIN_REWARD_THRESHOLD) {
        console.log(`[ReferralBonus] Amount ${amount} is too small, skipping`);
        return 0;
      }
      
      // Получаем всех пригласителей пользователя
      const userReferrals = await db
        .select()
        .from(referrals)
        .where(eq(referrals.user_id, userId))
        .orderBy(referrals.level);
      
      // Если нет реферальных связей, выходим
      if (userReferrals.length === 0) {
        console.log(`[ReferralBonus] No referrals found for user ${userId}`);
        return 0;
      }
      
      console.log(`[ReferralBonus] Found ${userReferrals.length} referral links for user ${userId}`);
      
      // Для каждого уровня начисляем вознаграждение
      for (const ref of userReferrals) {
        // Проверяем, что уровень определен
        if (ref.level === null) {
          continue;
        }
        
        const level = ref.level;
        
        // Проверяем, что уровень в пределах допустимых
        if (level <= 0 || level > this.MAX_LEVELS) {
          continue;
        }
        
        // Получаем процент для данного уровня
        const percent = this.LEVEL_PERCENTS[level - 1];
        
        // Вычисляем сумму вознаграждения
        const bonusAmount = amount * (percent / 100);
        
        // Пропускаем микро-начисления
        if (bonusAmount < this.MIN_REWARD_THRESHOLD) {
          console.log(`[ReferralBonus] Bonus amount ${bonusAmount} for level ${level} is too small, skipping`);
          continue;
        }
        
        // Начисляем вознаграждение пригласителю
        if (bonusAmount > 0 && ref.inviter_id !== null) {
          // Получаем пользователя-приглашателя
          const inviter = await UserService.getUserById(ref.inviter_id);
          if (!inviter) {
            console.log(`[ReferralBonus] Inviter ID ${ref.inviter_id} not found, skipping`);
            continue;
          }
          
          // Проверяем значения баланса и обрабатываем null значения
          const uniBalance = inviter.balance_uni !== null ? inviter.balance_uni : "0";
          const tonBalance = inviter.balance_ton !== null ? inviter.balance_ton : "0";
          
          // Увеличиваем баланс пользователя
          const newBalance = currency === Currency.UNI 
            ? Number(uniBalance) + bonusAmount 
            : Number(tonBalance) + bonusAmount;
          
          // Обновляем баланс пользователя
          await UserService.updateUserBalance(ref.inviter_id, {
            balance_uni: currency === Currency.UNI ? newBalance.toString() : uniBalance,
            balance_ton: currency === Currency.TON ? newBalance.toString() : tonBalance
          });
          
          // Создаем и валидируем данные транзакции через схему с дополнительными метаданными
          const transactionData = insertTransactionSchema.parse({
            user_id: ref.inviter_id,
            type: TransactionType.REFERRAL,
            amount: bonusAmount.toString(),
            currency: currency,
            status: TransactionStatus.CONFIRMED,
            source: "Referral",
            description: `Referral reward from level ${level} (${percent}%)`,
            source_user_id: userId,
            category: "bonus",
            data: JSON.stringify({
              level: level,
              percent: percent,
              sourceFriend: userId,
              bonusType: 'purchase'
            })
          });
          
          // Вставляем данные в таблицу транзакций
          await db
            .insert(transactions)
            .values(transactionData);
          
          // Суммируем распределенные бонусы
          totalDistributed += bonusAmount;
          
          console.log(
            `[ReferralBonus] Level ${level} (${percent}%) | Amount: ${bonusAmount.toFixed(8)} ${currency} | ` +
            `From: ${userId} | To: ${ref.inviter_id} | Processed`
          );
        }
      }
      
      console.log(`[ReferralBonus] Total distributed: ${totalDistributed} ${currency}`);
      return totalDistributed;
    } catch (error) {
      console.error('[ReferralBonusService] Error processing referral bonus:', error);
      return 0;
    }
  }
}