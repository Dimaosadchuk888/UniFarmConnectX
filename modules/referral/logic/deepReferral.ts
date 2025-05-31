/**
 * Логика глубокой реферальной системы
 */

import { ReferralStatus, ReferralEarningType } from '../model';

export class DeepReferralLogic {
  /**
   * Максимальная глубина реферальной сети
   */
  private static readonly MAX_REFERRAL_DEPTH = 5;

  /**
   * Проценты комиссии по уровням
   */
  private static readonly COMMISSION_RATES = {
    1: 0.10, // 10% с первого уровня
    2: 0.05, // 5% со второго уровня
    3: 0.03, // 3% с третьего уровня
    4: 0.02, // 2% с четвертого уровня
    5: 0.01  // 1% с пятого уровня
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
      console.log(`[DeepReferral] Построение цепочки рефереров для пользователя ${userId}`);
      
      // Здесь будет рекурсивный запрос к базе данных для построения цепочки
      const chain: string[] = [];
      
      // Заглушка - в реальном приложении здесь будет запрос к БД
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