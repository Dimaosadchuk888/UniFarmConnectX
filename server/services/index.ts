/**
 * Центральный модуль для экспорта сервисов
 * 
 * Этот файл создает и экспортирует экземпляры всех сервисов приложения,
 * настраивая их с правильными зависимостями.
 * 
 * Используется для централизованного управления доступом к сервисам и
 * упрощения процесса внедрения зависимостей.
 */

import { extendedStorage } from '../storage-adapter-extended';
import { createUserService, type UserService } from './userService';
import { createReferralService, type IReferralService } from './referralServiceInstance';
import { createReferralBonusService, type IReferralBonusService } from './referralBonusServiceInstance';
import { createTransactionService, type ITransactionService } from './transactionServiceInstance';
import { createTonBoostService, type ITonBoostService } from './tonBoostServiceInstance';
import { createFarmingService, type IFarmingService } from './farmingServiceInstance';
import { createUniFarmingService, type IUniFarmingService } from './uniFarmingServiceInstance';
import { createNewUniFarmingService, type INewUniFarmingService } from './newUniFarmingServiceInstance';
import { createLaunchLogService, type ILaunchLogService } from './launchLogServiceInstance';
import { createDailyBonusService, type IDailyBonusService, type DailyBonusStatusResponse, type DailyBonusClaimResponse } from './dailyBonusServiceInstance';
import { createPartitionService, type IPartitionService } from './partitionServiceInstance';
import { createAuthService, type IAuthService } from './authServiceInstance';
import { databaseServiceInstance, type IDatabaseService } from './databaseServiceInstance';

// Создаем экземпляры сервисов с подключением расширенного хранилища
const userService = createUserService(extendedStorage);
const referralService = createReferralService(extendedStorage);
const referralBonusService = createReferralBonusService(userService, referralService);
const transactionService = createTransactionService(extendedStorage);
const tonBoostService = createTonBoostService(referralBonusService);
const farmingService = createFarmingService();
const uniFarmingService = createUniFarmingService();
const newUniFarmingService = createNewUniFarmingService();
const launchLogService = createLaunchLogService();
const dailyBonusService = createDailyBonusService();
const partitionService = createPartitionService();
const authService = createAuthService();

// Экспортируем экземпляры сервисов для использования в контроллерах
export {
  userService,
  referralService,
  referralBonusService,
  transactionService,
  tonBoostService,
  farmingService,
  uniFarmingService,
  newUniFarmingService,
  launchLogService,
  dailyBonusService,
  partitionService,
  authService,
  databaseServiceInstance as databaseService
};

// Экспортируем типы для использования в пользовательском коде
export type {
  UserService,
  IReferralService as ReferralService,
  IReferralBonusService as ReferralBonusService,
  ITransactionService as TransactionService,
  ITonBoostService as TonBoostService,
  IFarmingService as FarmingService,
  IUniFarmingService as UniFarmingService,
  INewUniFarmingService as NewUniFarmingService,
  ILaunchLogService as LaunchLogService,
  IDailyBonusService as DailyBonusService,
  IPartitionService as PartitionService,
  IAuthService as AuthService,
  // Экспортируем дополнительные типы для использования в контроллерах
  DailyBonusStatusResponse,
  DailyBonusClaimResponse
};

// Реэкспортируем типы интерфейсов для использования в тестах и моках
export type { IUserService } from './userService';
export type { IReferralService } from './referralServiceInstance';
export type { IReferralBonusService } from './referralBonusServiceInstance';
export type { ITransactionService } from './transactionServiceInstance';
export type { ITonBoostService } from './tonBoostServiceInstance';
export type { IFarmingService } from './farmingServiceInstance';
export type { IUniFarmingService } from './uniFarmingServiceInstance';
export type { INewUniFarmingService } from './newUniFarmingServiceInstance';
export type { ILaunchLogService } from './launchLogServiceInstance';
export type { IDailyBonusService } from './dailyBonusServiceInstance';
export type { IPartitionService } from './partitionServiceInstance';
export type { IAuthService } from './authServiceInstance';

/**
 * Повторно экспортируем фабричные функции для создания сервисов
 * Это позволяет создавать новые экземпляры сервисов с альтернативными реализациями хранилища,
 * например, для тестирования или для использования с разными экземплярами хранилища.
 */
export {
  createUserService,
  createReferralService,
  createReferralBonusService,
  createTransactionService,
  createTonBoostService,
  createFarmingService,
  createUniFarmingService,
  createNewUniFarmingService,
  createLaunchLogService,
  createDailyBonusService,
  createPartitionService,
  createAuthService
};