import { logger } from '../../core/logger.js';

interface BoostPackageData {
  id: number;
  name: string;
  description: string;
  daily_rate: number;
  duration_days: number;
  min_amount: number;
  max_amount: number;
  is_active: boolean;
}

interface UserBoostData {
  id: number;
  package_id: number;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
}

export class BoostService {
  async getAvailableBoosts(): Promise<BoostPackageData[]> {
    try {
      return [
        {
          id: 1,
          name: "Speed Boost",
          description: "Increases farming speed by 50%",
          daily_rate: 1.5,
          duration_days: 7,
          min_amount: 100,
          max_amount: 1000,
          is_active: true
        },
        {
          id: 2,
          name: "Power Boost", 
          description: "Doubles farming rewards",
          daily_rate: 2.0,
          duration_days: 3,
          min_amount: 200,
          max_amount: 2000,
          is_active: true
        },
        {
          id: 3,
          name: "Premium Boost",
          description: "Triple rewards for advanced users",
          daily_rate: 3.0,
          duration_days: 1,
          min_amount: 500,
          max_amount: 5000,
          is_active: true
        }
      ];
    } catch (error) {
      logger.error('[BoostService] Ошибка получения доступных бустов:', error);
      return [];
    }
  }

  async getBoostPackages(): Promise<BoostPackageData[]> {
    return this.getAvailableBoosts();
  }

  async getUserActiveBoosts(userId: string): Promise<UserBoostData[]> {
    try {
      logger.info(`[BoostService] Получение активных бустов для пользователя ${userId}`);
      
      return [
        {
          id: 1,
          package_id: 1,
          start_date: new Date(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          is_active: true
        }
      ];
    } catch (error) {
      logger.error('[BoostService] Ошибка получения активных бустов:', error);
      return [];
    }
  }
}