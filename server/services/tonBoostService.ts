/**
 * Сервис для работы с TON Boost-пакетами - файл-посредник
 * 
 * Этот файл экспортирует функциональность из инстанс-ориентированной реализации
 * для обеспечения совместимости импортов и перенаправляет статические вызовы на инстанс.
 */

// Импортируем все типы и интерфейсы напрямую для переопределения
import type { TonBoostDeposit } from '@shared/schema';

// Определяем и экспортируем типы здесь для совместимости с импортерами
export interface TonBoostPackage {
  id: number;
  name: string;
  priceTon: string;
  bonusUni: string;
  rateTon: string;
  rateUni: string;
}

export enum TonBoostPaymentMethod {
  INTERNAL_BALANCE = 'internal_balance',
  EXTERNAL_WALLET = 'external_wallet'
}

export enum TonBoostExternalPaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface PurchaseTonBoostResult {
  success: boolean;
  message: string;
  boostPackage?: TonBoostPackage;
  transactionId?: number;
  depositId?: number;
  paymentMethod?: TonBoostPaymentMethod;
  paymentStatus?: TonBoostExternalPaymentStatus;
  paymentLink?: string;
}

export interface TonFarmingUpdateResult {
  totalTonDepositAmount: string;
  totalTonRatePerSecond: string;
  totalUniRatePerSecond: string;
  earnedTonThisUpdate: string;
  earnedUniThisUpdate: string;
  depositCount: number;
}

export interface TonFarmingInfo {
  isActive: boolean;
  totalTonDepositAmount: string;
  depositCount: number;
  totalTonRatePerSecond: string;
  totalUniRatePerSecond: string;
  dailyIncomeTon: string;
  dailyIncomeUni: string;
  deposits: TonBoostDeposit[];
}

// Импортируем необходимые типы из схемы
import { type InsertTonBoostDeposit } from '@shared/schema';

// Импортируем инстанс сервиса TON Boost из центрального экспорта
import { tonBoostService } from './index';

// Переопределяем статический API для обеспечения обратной совместимости
export class TonBoostService {
  // Константы для расчетов (реэкспортируем для совместимости)
  private static readonly SECONDS_IN_DAY = 86400;
  private static readonly TON_MIN_CHANGE_THRESHOLD = 0.000001; // Минимальный порог для обновления баланса в БД
  
  // Адрес TON кошелька проекта для приема платежей
  private static readonly TON_WALLET_ADDRESS = "UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8";

  /**
   * Получает список всех доступных буст-пакетов
   * @returns Список буст-пакетов
   */
  static getBoostPackages(): TonBoostPackage[] {
    return tonBoostService.getBoostPackages();
  }

  /**
   * Получает буст-пакет по ID
   * @param boostId ID буст-пакета
   * @returns Буст-пакет или undefined, если не найден
   */
  static getBoostPackageById(boostId: number): TonBoostPackage | undefined {
    return tonBoostService.getBoostPackageById(boostId);
  }

  /**
   * Получает все активные TON Boost-депозиты пользователя
   * @param userId ID пользователя
   * @returns Список активных TON Boost-депозитов
   */
  static async getUserActiveBoosts(userId: number) {
    return tonBoostService.getUserActiveBoosts(userId);
  }

  /**
   * Создает запись о TON Boost-депозите
   * @param depositData Данные депозита
   * @returns Созданный депозит
   */
  static async createTonBoostDeposit(depositData: InsertTonBoostDeposit) {
    return tonBoostService.createTonBoostDeposit(depositData);
  }

  /**
   * Рассчитывает скорость начисления TON и UNI в секунду
   * @param amount Сумма депозита TON
   * @param rateTonPerDay Доходность TON в день (%)
   * @param rateUniPerDay Доходность UNI в день (%)
   * @returns Объект с двумя ставками - для TON и UNI
   */
  static calculateRatesPerSecond(amount: string, rateTonPerDay: string, rateUniPerDay: string) {
    return tonBoostService.calculateRatesPerSecond(amount, rateTonPerDay, rateUniPerDay);
  }

  /**
   * Покупает TON буст-пакет для пользователя
   * @param userId ID пользователя
   * @param boostId ID буст-пакета
   * @param paymentMethod Метод оплаты (по умолчанию - внутренний баланс)
   * @returns Результат покупки
   */
  static async purchaseTonBoost(
    userId: number, 
    boostId: number, 
    paymentMethod: TonBoostPaymentMethod = TonBoostPaymentMethod.INTERNAL_BALANCE
  ): Promise<PurchaseTonBoostResult> {
    return tonBoostService.purchaseTonBoost(userId, boostId, paymentMethod);
  }

  /**
   * Рассчитывает и обновляет баланс TON и UNI для всех активных TON Boost-депозитов пользователя
   * @param userId ID пользователя
   * @returns Результат обновления
   */
  static async calculateAndUpdateUserTonFarming(userId: number): Promise<TonFarmingUpdateResult> {
    return tonBoostService.calculateAndUpdateUserTonFarming(userId);
  }

  /**
   * Получает информацию о текущем TON фарминге пользователя
   * @param userId ID пользователя
   * @returns Информация о TON фарминге
   */
  static async getUserTonFarmingInfo(userId: number): Promise<TonFarmingInfo> {
    return tonBoostService.getUserTonFarmingInfo(userId);
  }

  /**
   * Позволяет собрать весь накопленный TON в фарминге
   * @param userId ID пользователя
   * @returns Результат операции сбора
   */
  static async harvestTonFarming(userId: number): Promise<{ 
    success: boolean; 
    message: string; 
    harvestedTon: string; 
    transactionId?: number; 
  }> {
    return tonBoostService.harvestTonFarming(userId);
  }
}