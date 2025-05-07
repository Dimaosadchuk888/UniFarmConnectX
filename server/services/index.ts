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

// Создаем экземпляры сервисов с подключением расширенного хранилища
const userService = createUserService(extendedStorage);
const referralService = createReferralService(extendedStorage);
const referralBonusService = createReferralBonusService(userService, referralService);
const transactionService = createTransactionService(extendedStorage);

// Экспортируем экземпляры сервисов для использования в контроллерах
export {
  userService,
  referralService,
  referralBonusService,
  transactionService
};

// Экспортируем типы для использования в пользовательском коде
export type {
  UserService,
  IReferralService as ReferralService,
  IReferralBonusService as ReferralBonusService,
  ITransactionService as TransactionService
};

// Реэкспортируем типы интерфейсов для использования в тестах и моках
export type { IUserService } from './userService';
export type { IReferralService } from './referralServiceInstance';
export type { IReferralBonusService } from './referralBonusServiceInstance';
export type { ITransactionService } from './transactionServiceInstance';

/**
 * Повторно экспортируем фабричные функции для создания сервисов
 * Это позволяет создавать новые экземпляры сервисов с альтернативными реализациями хранилища,
 * например, для тестирования или для использования с разными экземплярами хранилища.
 */
export {
  createUserService,
  createReferralService,
  createReferralBonusService,
  createTransactionService
};