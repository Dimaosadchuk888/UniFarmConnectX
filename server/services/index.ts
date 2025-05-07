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
// Импортируйте другие сервисы по мере их создания и реорганизации
// import { createTransactionService, type TransactionService } from './transactionService';
// import { createReferralService, type ReferralService } from './referralService';

// Создаем экземпляры сервисов с подключением расширенного хранилища
const userService = createUserService(extendedStorage);
// const transactionService = createTransactionService(extendedStorage);
// const referralService = createReferralService(extendedStorage);

// Экспортируем экземпляры сервисов для использования в контроллерах
export {
  userService,
  // transactionService,
  // referralService
};

// Экспортируем типы для использования в пользовательском коде
export type {
  UserService,
  // TransactionService,
  // ReferralService
};

// Реэкспортируем типы интерфейсов для использования в тестах и моках
export type { IUserService } from './userService';
// export type { ITransactionService } from './transactionService';
// export type { IReferralService } from './referralService';

/**
 * Повторно экспортируем фабричные функции для создания сервисов
 * Это позволяет создавать новые экземпляры сервисов с альтернативными реализациями хранилища,
 * например, для тестирования или для использования с разными экземплярами хранилища.
 */
export {
  createUserService,
  // createTransactionService,
  // createReferralService
};