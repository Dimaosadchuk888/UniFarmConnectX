/**
 * Центральная точка для доступа к сервисам
 * 
 * Этот модуль предоставляет фабрику сервисов, которая инициализирует и предоставляет
 * доступ ко всем сервисам приложения. Это обеспечивает единую точку доступа
 * и возможность внедрения зависимостей для тестирования.
 */

import { IStorage, IExtendedStorage } from '../storage-interface';
import { storage } from '../storage-standard';

// Импорт сервисов
import { UserService, createUserService } from './UserService';
import { TransactionService, createTransactionService } from './TransactionService';
import { SessionService, createSessionService } from './SessionService';

/**
 * Интерфейс сервисов приложения
 */
export interface Services {
  userService: UserService;
  transactionService: TransactionService;
  sessionService: SessionService;
}

/**
 * Экземпляры сервисов
 */
let _services: Services | null = null;

/**
 * Создает экземпляры всех сервисов
 * @param storageInstance Экземпляр хранилища (по умолчанию используется основное хранилище)
 * @returns Объект с экземплярами сервисов
 */
export function createServices(storageInstance: IStorage = storage): Services {
  console.log('[ServiceFactory] Создание экземпляров сервисов');
  
  const extendedStorage = storageInstance as IExtendedStorage;
  
  return {
    userService: createUserService(storageInstance),
    transactionService: createTransactionService(extendedStorage),
    sessionService: createSessionService(storageInstance)
  };
}

/**
 * Возвращает экземпляры сервисов, создавая их при необходимости
 * @returns Объект с экземплярами сервисов
 */
export function getServices(): Services {
  if (!_services) {
    _services = createServices();
  }
  
  return _services;
}

/**
 * Устанавливает экземпляры сервисов (используется для тестирования)
 * @param services Объект с экземплярами сервисов
 */
export function setServices(services: Services): void {
  _services = services;
}

// Экспортируем экземпляры и типы
export * from './UserService';
export * from './TransactionService';
export * from './SessionService';

// Экспорт экземпляров сервисов по умолчанию
export const { userService, transactionService, sessionService } = getServices();