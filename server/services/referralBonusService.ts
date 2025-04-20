import { db } from '../db';
import { ReferralService } from './referralService';
import { UserService } from './userService';
import { TransactionService, TransactionType, Currency } from './transactionService';
import { eq } from 'drizzle-orm';
import { users, referrals } from '@shared/schema';

/**
 * Сервис для обработки реферальных вознаграждений
 */
export class ReferralBonusService {
  // Максимальное количество уровней в партнерской программе
  static readonly MAX_LEVELS = 20;
  
  // Проценты для вознаграждений на каждом уровне (в %)
  static readonly LEVEL_PERCENTS: number[] = [
    100, // Уровень 1
    5,   // Уровень 2
    4,   // Уровень 3
    3,   // Уровень 4
    2,   // Уровень 5
    6,   // Уровень 6
    7,   // Уровень 7
    8,   // Уровень 8
    9,   // Уровень 9
    10,  // Уровень 10
    11,  // Уровень 11
    12,  // Уровень 12
    13,  // Уровень 13
    14,  // Уровень 14
    15,  // Уровень 15
    16,  // Уровень 16
    17,  // Уровень 17
    18,  // Уровень 18
    19,  // Уровень 19
    20   // Уровень 20
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
        // Проверяем, что не превышаем MAX_LEVELS
        if (ref.level >= this.MAX_LEVELS) {
          break;
        }
        
        // Записываем новый уровень
        await ReferralService.createReferral({
          user_id: userId,
          inviter_id: ref.inviter_id,
          level: ref.level + 1
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
  static async processReferralBonus(userId: number, amount: number, currency: Currency): Promise<void> {
    try {
      // Получаем всех пригласителей пользователя
      const userReferrals = await db
        .select()
        .from(referrals)
        .where(eq(referrals.user_id, userId))
        .orderBy(referrals.level);
      
      // Для каждого уровня начисляем вознаграждение
      for (const ref of userReferrals) {
        const level = ref.level;
        
        // Проверяем, что уровень в пределах допустимых
        if (level <= 0 || level > this.MAX_LEVELS) {
          continue;
        }
        
        // Получаем процент для данного уровня
        const percent = this.LEVEL_PERCENTS[level - 1];
        
        // Вычисляем сумму вознаграждения
        const bonusAmount = amount * (percent / 100);
        
        // Начисляем вознаграждение пригласителю
        if (bonusAmount > 0) {
          // Получаем пользователя-приглашателя
          const inviter = await UserService.getUserById(ref.inviter_id);
          if (!inviter) {
            continue;
          }
          
          // Увеличиваем баланс пользователя
          const newBalance = currency === Currency.UNI 
            ? Number(inviter.balance_uni) + bonusAmount 
            : Number(inviter.balance_ton) + bonusAmount;
          
          // Обновляем баланс
          await UserService.updateUser(ref.inviter_id, {
            balance_uni: currency === Currency.UNI ? newBalance.toString() : inviter.balance_uni,
            balance_ton: currency === Currency.TON ? newBalance.toString() : inviter.balance_ton
          });
          
          // Создаем транзакцию
          await TransactionService.createTransaction({
            userId: ref.inviter_id,
            type: TransactionType.REFERRAL,
            amount: bonusAmount.toString(),
            currency,
            status: 'confirmed',
            description: `Реферальное вознаграждение ${percent}% (уровень ${level})`
          });
          
          console.log(
            `[ReferralBonus] Level ${level} (${percent}%) | Amount: ${bonusAmount} ${currency} | ` +
            `From: ${userId} | To: ${ref.inviter_id} | Processed`
          );
        }
      }
    } catch (error) {
      console.error('[ReferralBonusService] Error processing referral bonus:', error);
    }
  }
}