// Файл для динамического выбора драйвера базы данных
// Обновлено: основной драйвер (./db.ts) теперь использует Replit PostgreSQL

import * as dbDriver from './db'; // Основной драйвер теперь использует Replit PostgreSQL
import * as replitDb from './db-replit'; // Запасной импорт Replit PostgreSQL драйвера

// Тип подключения к базе данных - оставлен для обратной совместимости
export type DatabaseProvider = 'standard' | 'replit';

// По умолчанию используем стандартный драйвер
let selectedProvider: DatabaseProvider = 'standard';

// Функция для установки провайдера
export function setDatabaseProvider(provider: DatabaseProvider): void {
  console.log(`[DB-Selector] Переключение на провайдер базы данных: ${provider}`);
  selectedProvider = provider;
}

// Экспортируем выбранный драйвер базы данных
export const db = selectedProvider === 'standard' ? dbDriver.db : replitDb.db;
export const pool = selectedProvider === 'standard' ? dbDriver.pool : replitDb.pool;
export const testDatabaseConnection = selectedProvider === 'standard' ? dbDriver.testDatabaseConnection : replitDb.testDatabaseConnection;
export const queryWithRetry = selectedProvider === 'standard' ? dbDriver.queryWithRetry : replitDb.queryWithRetry;
export const query = selectedProvider === 'standard' ? dbDriver.query : replitDb.query;

// Функция для получения типа текущего провайдера
export function getCurrentProvider(): DatabaseProvider {
  return selectedProvider;
}