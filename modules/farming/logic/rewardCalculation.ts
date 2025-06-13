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
      console.error('[RewardCalculation] Ошибка расчета базового вознаграждения:', error);
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
      console.error('[RewardCalculation] Ошибка расчета дохода с фарминга:', error);
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
      console.error('[RewardCalculation] Ошибка применения буста:', error);
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
      console.error('[RewardCalculation] Ошибка расчета реферального бонуса:', error);
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
      console.error('[RewardCalculation] Ошибка валидации лимитов:', error);
      return { valid: false, message: 'Ошибка валидации' };
    }
  }

  /**
   * Получение лимитов фарминга по типу и уровню пользователя
   */
  private static getFarmingLimits(farmingType: FarmingType, userLevel: number) {
    const baseLimits = {
      [FarmingType.UNI_FARMING]: { min: 100, max: 10000 },
      [FarmingType.TON_FARMING]: { min: 0.1, max: 10 },
      [FarmingType.BOOST_FARMING]: { min: 50, max: 5000 }
    };

    const limits = baseLimits[farmingType];
    const levelMultiplier = 1 + (userLevel - 1) * 0.5;
    
    return {
      min: limits.min,
      max: limits.max * levelMultiplier
    };
  }
}