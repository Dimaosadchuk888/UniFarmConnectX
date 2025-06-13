/**
 * Логика расчета вознаграждений для фарминга
 */

import { FarmingType, RewardType } from '../model';
import { logger } from '../../../core/logger.js';

export class RewardCalculationLogic {
  /**
   * Базовая суточная доходность (0.5% в день)
   */
  private static readonly DAILY_RATE = 0.005; // 0.5%

  /**
   * Расчет базового вознаграждения (только от дохода с фарминга)
   */
  static calculateBaseReward(
    amount: string,
    farmingDays: number = 1
  ): string {
    try {
      const amountNum = parseFloat(amount);
      const reward = amountNum * this.DAILY_RATE * farmingDays;
      return reward.toFixed(8);
    } catch (error) {
      logger.error('[RewardCalculation] Ошибка расчета базового вознаграждения', { error: error instanceof Error ? error.message : String(error) });
      return '0';
    }
  }

  /**
   * Расчет дохода с фарминга по часам
   */
  static calculateFarmingReward(
    depositAmount: string,
    farmingHours: number
  ): string {
    try {
      const days = farmingHours / 24;
      return this.calculateBaseReward(depositAmount, days);
    } catch (error) {
      logger.error('[RewardCalculation] Ошибка расчета дохода с фарминга', { error: error instanceof Error ? error.message : String(error) });
      return '0';
    }
  }

  /**
   * Применение множителей бустов
   */
  static applyBoostMultiplier(baseReward: string, multiplier: number): string {
    try {
      const baseNum = parseFloat(baseReward);
      const boostedReward = baseNum * multiplier;
      return boostedReward.toFixed(8);
    } catch (error) {
      logger.error('[RewardCalculation] Ошибка применения буста', { error: error instanceof Error ? error.message : String(error) });
      return baseReward;
    }
  }

  /**
   * Расчет реферального бонуса
   */
  static calculateReferralBonus(
    baseReward: string,
    referralLevel: number,
    bonusPercentage: number
  ): string {
    try {
      const baseNum = parseFloat(baseReward);
      const levelMultiplier = Math.max(1 - (referralLevel - 1) * 0.1, 0.1);
      const bonus = (baseNum * bonusPercentage * levelMultiplier) / 100;
      return bonus.toFixed(8);
    } catch (error) {
      logger.error('[RewardCalculation] Ошибка расчета реферального бонуса', { error: error instanceof Error ? error.message : String(error) });
      return '0';
    }
  }

  /**
   * Проверка лимитов фарминга
   */
  static validateFarmingLimits(
    amount: string,
    farmingType: FarmingType,
    userLevel: number
  ): { valid: boolean; message?: string } {
    try {
      const amountNum = parseFloat(amount);
      
      const limits = this.getFarmingLimits(farmingType, userLevel);
      
      if (amountNum < limits.min) {
        return {
          valid: false,
          message: `Минимальная сумма для фарминга: ${limits.min}`
        };
      }
      
      if (amountNum > limits.max) {
        return {
          valid: false,
          message: `Максимальная сумма для фарминга: ${limits.max}`
        };
      }
      
      return { valid: true };
    } catch (error) {
      logger.error('[RewardCalculation] Ошибка валидации лимитов', { error: error instanceof Error ? error.message : String(error) });
      return { valid: false, message: 'Ошибка валидации' };
    }
  }

  /**
   * Получение лимитов фарминга по типу и уровню пользователя
   */
  private static getFarmingLimits(farmingType: FarmingType, userLevel: number) {
    const baseLimits = {
      'UNI_FARMING': { min: 100, max: 10000 },
      'TON_FARMING': { min: 0.1, max: 10 },
      'BOOST_FARMING': { min: 50, max: 5000 }
    };

    const limits = baseLimits[farmingType as unknown as keyof typeof baseLimits] || { min: 0, max: 0 };
    const levelMultiplier = 1 + (userLevel - 1) * 0.5;
    
    return {
      min: limits.min,
      max: limits.max * levelMultiplier
    };
  }
}