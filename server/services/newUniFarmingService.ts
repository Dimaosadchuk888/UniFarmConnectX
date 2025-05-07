/**
 * Сервис для работы с множественным UNI фармингом - файл-посредник
 * 
 * Этот файл экспортирует функциональность из инстанс-ориентированной реализации
 * для обеспечения совместимости импортов и перенаправляет статические вызовы на инстанс.
 */

import {
  type MultiFarmingUpdateResult,
  type CreateMultiDepositResult,
  type MultiFarmingInfo
} from './newUniFarmingServiceInstance';

// Импортируем инстанс сервиса множественного UNI фарминга из центрального экспорта
import { newUniFarmingService } from './index';

// Реэкспортируем типы и интерфейсы
export type {
  MultiFarmingUpdateResult,
  CreateMultiDepositResult,
  MultiFarmingInfo
};

/**
 * Сервис для работы с множественным UNI фармингом
 */
export class NewUniFarmingService {
  private static readonly DAILY_RATE = 0.005; // 0.5% в день
  private static readonly SECONDS_IN_DAY = 86400;

  /**
   * Начисляет доход пользователю от UNI фарминга на основе всех активных депозитов
   * @param userId ID пользователя
   * @returns Объект с обновленными данными
   */
  static async calculateAndUpdateUserFarming(userId: number): Promise<MultiFarmingUpdateResult> {
    return newUniFarmingService.calculateAndUpdateUserFarming(userId);
  }

  /**
   * Создает новый UNI фарминг-депозит
   * @param userId ID пользователя
   * @param amount Сумма депозита
   * @returns Объект с данными о созданном депозите
   */
  static async createUniFarmingDeposit(userId: number, amount: string): Promise<CreateMultiDepositResult> {
    return newUniFarmingService.createUniFarmingDeposit(userId, amount);
  }

  /**
   * Получает все активные депозиты пользователя
   * @param userId ID пользователя
   * @returns Массив активных депозитов
   */
  static async getUserFarmingDeposits(userId: number) {
    return newUniFarmingService.getUserFarmingDeposits(userId);
  }

  /**
   * Получает данные о всех фарминг-депозитах пользователя и общую статистику
   * @param userId ID пользователя
   * @returns Объект с данными о фарминге
   */
  static async getUserFarmingInfo(userId: number): Promise<MultiFarmingInfo> {
    return newUniFarmingService.getUserFarmingInfo(userId);
  }
}