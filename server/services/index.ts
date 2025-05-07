/**
 * Экспорт и инициализация сервисов приложения
 * 
 * Этот модуль создает и экспортирует все необходимые сервисы,
 * используя фабричные функции для каждого типа сервиса
 */

import { IExtendedStorage } from '../storage-interface';
import { storage } from '../storage-adapter';
import { createSessionService, SessionService } from './SessionService';
import { createUserService, UserService } from './UserService';
import { createTransactionService, TransactionService } from './TransactionService';

// Создаем экземпляры сервисов с помощью фабричных функций
const sessionServiceInstance = createSessionService(storage);
const userServiceInstance = createUserService(storage);
const transactionServiceInstance = createTransactionService(storage);

// Экспортируем типы сервисов
export { SessionService, UserService, TransactionService };

// Экспортируем экземпляры сервисов
export const sessionService = sessionServiceInstance;
export const userService = userServiceInstance;
export const transactionService = transactionServiceInstance;