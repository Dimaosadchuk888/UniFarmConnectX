/**
 * Логика глубокой реферальной системы
 */

import { ReferralStatus, ReferralEarningType } from '../model';

export class DeepReferralLogic {
  /**
   * Максимальная глубина реферальной сети
   */
  private static readonly MAX_REFERRAL_DEPTH = 20;

  /**
   * Проценты комиссии по уровням (от дохода с фарминга UNI и TON Boost пакетов)
   */
  private static readonly COMMISSION_RATES = {
    1: 1.00,   // 100% с первого уровня
    2: 0.02,   // 2% со второго уровня
    3: 0.03,   // 3% с третьего уровня
    4: 0.04,   // 4% с четвертого уровня
    5: 0.05,   // 5% с пятого уровня
    6: 0.06,   // 6% с шестого уровня
    7: 0.07,   // 7% с седьмого уровня
    8: 0.08,   // 8% с восьмого уровня
    9: 0.09,   // 9% с девятого уровня
    10: 0.10,  // 10% с десятого уровня
    11: 0.11,  // 11% с одиннадцатого уровня
    12: 0.12,  // 12% с двенадцатого уровня
    13: 0.13,  // 13% с тринадцатого уровня
    14: 0.14,  // 14% с четырнадцатого уровня
    15: 0.15,  // 15% с пятнадцатого уровня
    16: 0.16,  // 16% с шестнадцатого уровня
    17: 0.17,  // 17% с семнадцатого уровня
    18: 0.18,  // 18% с восемнадцатого уровня
    19: 0.19,  // 19% с девятнадцатого уровня
    20: 0.20   // 20% с двадцатого уровня
  };

  /**
   * Расчет комиссии для всех уровней реферальной сети
   */
  static calculateReferralCommissions(
    transactionAmount: string,
    referrerChain: string[]
  ): Array<{ userId: string; amount: string; level: number }> {
    try {
      const amount = parseFloat(transactionAmount);
      const commissions: Array<{ userId: string; amount: string; level: number }> = [];

      for (let i = 0; i < Math.min(referrerChain.length, this.MAX_REFERRAL_DEPTH); i++) {
        const level = i + 1;
        const rate = this.COMMISSION_RATES[level as keyof typeof this.COMMISSION_RATES];
        
        if (rate && referrerChain[i]) {
          const commission = amount * rate;
          commissions.push({
            userId: referrerChain[i],
            amount: commission.toFixed(8),
            level
          });
        }
      }

      return commissions;
    } catch (error) {
      console.error('[DeepReferral] Ошибка расчета комиссий:', error);
      return [];
    }
  }

  /**
   * Построение цепочки рефереров
   */
  static async buildReferrerChain(userId: string): Promise<string[]> {
    try {
      const { db } = await import('../../../server/db');
      const { users } = await import('../../../shared/schema');
      const { eq } = await import('drizzle-orm');

      const chain: string[] = [];
      let currentUserId = parseInt(userId);

      // Строим цепочку до максимальной глубины
      for (let level = 0; level < this.MAX_REFERRAL_DEPTH; level++) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, currentUserId))
          .limit(1);

        if (!user || !user.parent_ref_code) break;

        // Находим пользователя-пригласителя по реферальному коду
        const [inviter] = await db
          .select()
          .from(users)
          .where(eq(users.ref_code, user.parent_ref_code))
          .limit(1);

        if (!inviter) break;

        chain.push(inviter.id.toString());
        currentUserId = inviter.id;
      }

      return chain;
    } catch (error) {
      console.error('[DeepReferral] Ошибка построения цепочки рефереров:', error);
      return [];
    }
  }

  /**
   * Валидация реферального кода
   */
  static validateReferralCode(code: string): boolean {
    try {
      if (!code || code.length < 6 || code.length > 12) {
        return false;
      }

      // Проверка на допустимые символы
      const validPattern = /^[A-Z0-9]+$/;
      if (!validPattern.test(code)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('[DeepReferral] Ошибка валидации кода:', error);
      return false;
    }
  }

  /**
   * Генерация уникального реферального кода
   */
  static generateReferralCode(userId: string): string {
    try {
      const timestamp = Date.now().toString().slice(-6);
      const userSuffix = userId.slice(-2).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      return `${userSuffix}${random}${timestamp}`;
    } catch (error) {
      console.error('[DeepReferral] Ошибка генерации кода:', error);
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  }

  /**
   * Проверка активности реферальной связи
   */
  static isReferralActive(
    referralCreatedAt: Date,
    referredUserLastActivity: Date
  ): boolean {
    try {
      const daysSinceReferral = (Date.now() - referralCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
      const daysSinceActivity = (Date.now() - referredUserLastActivity.getTime()) / (1000 * 60 * 60 * 24);
      
      // Реферал считается активным, если:
      // 1. Прошло не более 90 дней с момента регистрации по рефералу
      // 2. Пользователь был активен в последние 30 дней
      return daysSinceReferral <= 90 && daysSinceActivity <= 30;
    } catch (error) {
      console.error('[DeepReferral] Ошибка проверки активности реферала:', error);
      return false;
    }
  }

  /**
   * Расчет бонуса за достижение целей по рефералам
   */
  static calculateMilestoneBonus(referralCount: number): string {
    try {
      const milestones = {
        10: '100',   // 100 UNI за 10 рефералов
        25: '300',   // 300 UNI за 25 рефералов
        50: '750',   // 750 UNI за 50 рефералов
        100: '2000', // 2000 UNI за 100 рефералов
        250: '6000', // 6000 UNI за 250 рефералов
        500: '15000' // 15000 UNI за 500 рефералов
      };

      for (const [milestone, bonus] of Object.entries(milestones).reverse()) {
        if (referralCount >= parseInt(milestone)) {
          return bonus;
        }
      }

      return '0';
    } catch (error) {
      console.error('[DeepReferral] Ошибка расчета milestone бонуса:', error);
      return '0';
    }
  }
}