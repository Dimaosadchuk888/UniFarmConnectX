/**
 * Временная конфигурация для запуска сервера без ошибок
 * 
 * Этот модуль будет замещен полной версией после отладки
 */

import { IStorage } from '../storage-interface';
import { storage } from '../storage-standard';

// Минимальный сервис для запуска приложения
export class UserService {
  constructor(private storage: IStorage) {}
}

export class TransactionService {
  constructor(private storage: IStorage) {}
}

export class SessionService {
  constructor(private storage: IStorage) {}
}

// Экспорт экземпляров сервисов
export const userService = new UserService(storage);
export const transactionService = new TransactionService(storage);
export const sessionService = new SessionService(storage);