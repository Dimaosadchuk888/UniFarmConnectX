/**
 * Модуль расчета доходности TON Boost пакетов
 */

import { logger } from '../../../core/logger.js';

export class TonBoostCalculation {
  /**
   * Конфигурация TON Boost пакетов с правильными ставками
   */
  private static readonly TON_BOOST_PACKAGES = {
    1: {
      name: "Starter Boost",
      price_ton: 1,
      bonus_uni: 10000,
      daily_rate: 0.005 // 0.5% в день
    },
    2: {
      name: "Standard Boost", 
      price_ton: 5,
      bonus_uni: 75000,
      daily_rate: 0.01 // 1% в день
    },
    3: {
      name: "Advanced Boost",
      price_ton: 15,
      bonus_uni: 250000, 
      daily_rate: 0.02 // 2% в день
    },
    4: {
      name: "Premium Boost",
      price_ton: 25,
      bonus_uni: 500000,
      daily_rate: 0.025 // 2.5% в день
    }
  };

  /**
   * Получить конфигурацию пакета по ID
   */
  static getPackageConfig(packageId: number) {
    return this.TON_BOOST_PACKAGES[packageId as keyof typeof this.TON_BOOST_PACKAGES];
  }

  /**
   * Рассчитать скорость фарминга TON за секунду для конкретного депозита
   * @param tonAmount - Сумма TON в депозите
   * @param packageId - ID пакета (1-4)
   */
  static calculateTonRatePerSecond(tonAmount: string, packageId: number): string {
    try {
      const config = this.getPackageConfig(packageId);
      if (!config) {
        throw new Error(`Package ${packageId} not found`);
      }

      const amount = parseFloat(tonAmount);
      const dailyRate = config.daily_rate;
      
      // Расчет: дневная доходность / секунд в дне
      const secondsInDay = 24 * 60 * 60; // 86400
      const ratePerSecond = (amount * dailyRate) / secondsInDay;
      
      return ratePerSecond.toFixed(18);
    } catch (error) {
      logger.error('[TonBoostCalculation] Ошибка расчета скорости', { error: error instanceof Error ? error.message : String(error) });
      return "0";
    }
  }

  /**
   * Рассчитать доход за период времени
   * @param tonAmount - Сумма TON в депозите
   * @param packageId - ID пакета
   * @param timeInSeconds - Время в секундах
   */
  static calculateRewardForPeriod(tonAmount: string, packageId: number, timeInSeconds: number): string {
    try {
      const ratePerSecond = parseFloat(this.calculateTonRatePerSecond(tonAmount, packageId));
      const reward = ratePerSecond * timeInSeconds;
      
      return reward.toFixed(8);
    } catch (error) {
      logger.error('[TonBoostCalculation] Ошибка расчета награды', { error: error instanceof Error ? error.message : String(error) });
      return "0";
    }
  }

  /**
   * Рассчитать дневной доход для отображения в интерфейсе
   */
  static calculateDailyIncome(tonAmount: string, packageId: number): string {
    try {
      const config = this.getPackageConfig(packageId);
      if (!config) return "0";

      const amount = parseFloat(tonAmount);
      const dailyIncome = amount * config.daily_rate;
      
      return dailyIncome.toFixed(8);
    } catch (error) {
      logger.error('[TonBoostCalculation] Ошибка расчета дневного дохода', { error: error instanceof Error ? error.message : String(error) });
      return "0";
    }
  }

  /**
   * Получить все доступные пакеты
   */
  static getAllPackages() {
    return Object.entries(this.TON_BOOST_PACKAGES).map(([id, config]) => ({
      id: parseInt(id),
      ...config
    }));
  }

  /**
   * Проверить валидность пакета
   */
  static isValidPackage(packageId: number): boolean {
    return packageId >= 1 && packageId <= 4 && this.TON_BOOST_PACKAGES[packageId as keyof typeof this.TON_BOOST_PACKAGES] !== undefined;
  }

  /**
   * Рассчитать данные для создания депозита
   */
  static calculateDepositData(packageId: number) {
    try {
      const config = this.getPackageConfig(packageId);
      if (!config) {
        throw new Error(`Invalid package ID: ${packageId}`);
      }

      const tonAmount = config.price_ton.toString();
      const bonusUni = config.bonus_uni.toString();
      const ratePerSecond = this.calculateTonRatePerSecond(tonAmount, packageId);

      return {
        ton_amount: tonAmount,
        bonus_uni: bonusUni,
        rate_ton_per_second: ratePerSecond,
        rate_uni_per_second: "0", // UNI не фармится в TON Boost пакетах
        daily_rate: config.daily_rate,
        package_name: config.name
      };
    } catch (error) {
      logger.error('[TonBoostCalculation] Ошибка расчета данных депозита', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}