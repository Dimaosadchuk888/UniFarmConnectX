/**
 * Единая точка входа для расчета farming income
 * Централизованный контроль и логирование всех расчетов
 */

import { logger } from '../logger';

export interface FarmingIncome {
  userId: number;
  amount: number;
  currency: 'UNI' | 'TON';
  periods: number;
  depositAmount: number;
  rate: number;
  lastUpdate: Date;
  currentTime: Date;
}

export class UnifiedFarmingCalculator {
  private static MAX_ALLOWED_PERIODS = 288; // Максимум 24 часа (288 * 5 минут)
  private static MAX_SINGLE_TRANSACTION = 10000; // Максимум 10k UNI за раз
  
  /**
   * ЕДИНСТВЕННОЕ место расчета farming income
   * Все расчеты должны проходить через этот метод
   */
  static async calculateIncome(farmer: any): Promise<FarmingIncome | null> {
    const callSource = new Error().stack;
    logger.info('[UnifiedFarmingCalculator] calculateIncome called', {
      userId: farmer.user_id || farmer.id,
      callSource: callSource?.split('\n')[2]?.trim()
    });
    
    // Валидация: депозит должен быть больше 0
    const depositAmount = parseFloat(farmer.uni_deposit_amount || farmer.deposit_amount || '0');
    if (depositAmount <= 0) {
      logger.warn('[UnifiedFarmingCalculator] REJECTED: No deposit', {
        userId: farmer.user_id || farmer.id,
        depositAmount
      });
      return null;
    }
    
    // Расчет времени
    const now = new Date();
    const lastUpdate = farmer.uni_farming_last_update 
      ? new Date(farmer.uni_farming_last_update) 
      : new Date(farmer.uni_farming_start || farmer.created_at);
    
    const minutesSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    const periods = Math.floor(minutesSinceLastUpdate / 5); // Периоды по 5 минут
    
    // Защита от накопления: максимум 24 часа
    const effectivePeriods = Math.min(periods, this.MAX_ALLOWED_PERIODS);
    if (periods > effectivePeriods) {
      logger.warn('[UnifiedFarmingCalculator] CAPPED: Too many periods', {
        userId: farmer.user_id || farmer.id,
        originalPeriods: periods,
        cappedTo: effectivePeriods,
        minutesSinceLastUpdate
      });
    }
    
    // Расчет дохода
    const rate = parseFloat(farmer.uni_farming_rate || '0.01'); // 1% в день по умолчанию
    const dailyIncome = depositAmount * rate;
    const incomePerPeriod = dailyIncome / 288; // 288 периодов в сутках (24*60/5)
    const totalIncome = incomePerPeriod * effectivePeriods;
    
    // Защита от слишком больших транзакций
    const finalAmount = Math.min(totalIncome, this.MAX_SINGLE_TRANSACTION);
    if (totalIncome > finalAmount) {
      logger.error('[UnifiedFarmingCalculator] ALERT: Transaction limit exceeded', {
        userId: farmer.user_id || farmer.id,
        calculatedAmount: totalIncome,
        limitedTo: finalAmount,
        depositAmount,
        periods: effectivePeriods
      });
    }
    
    // Логирование всех расчетов
    logger.info('[UnifiedFarmingCalculator] Income calculated', {
      userId: farmer.user_id || farmer.id,
      depositAmount,
      rate,
      periods: effectivePeriods,
      amount: finalAmount,
      lastUpdate: lastUpdate.toISOString(),
      now: now.toISOString()
    });
    
    return {
      userId: farmer.user_id || farmer.id,
      amount: finalAmount,
      currency: 'UNI',
      periods: effectivePeriods,
      depositAmount,
      rate,
      lastUpdate,
      currentTime: now
    };
  }
  
  /**
   * Метод для валидации расчетов
   */
  static validateCalculation(income: FarmingIncome): boolean {
    // Проверка на разумность суммы
    const maxDailyIncome = income.depositAmount * income.rate;
    if (income.amount > maxDailyIncome) {
      logger.error('[UnifiedFarmingCalculator] VALIDATION FAILED: Income exceeds daily limit', {
        income,
        maxDailyIncome
      });
      return false;
    }
    
    // Проверка периодов
    if (income.periods > this.MAX_ALLOWED_PERIODS) {
      logger.error('[UnifiedFarmingCalculator] VALIDATION FAILED: Too many periods', {
        income,
        maxPeriods: this.MAX_ALLOWED_PERIODS
      });
      return false;
    }
    
    return true;
  }
}