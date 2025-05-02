// Файл для динамического выбора драйвера базы данных

import * as neonDb from './db'; // Импорт Neon PostgreSQL драйвера
import * as replitDb from './db-replit'; // Импорт Replit PostgreSQL драйвера

// Тип подключения к базе данных
export type DatabaseProvider = 'neon' | 'replit';

// По умолчанию используем Replit PostgreSQL
let selectedProvider: DatabaseProvider = 'replit';

// Функция для установки провайдера
export function setDatabaseProvider(provider: DatabaseProvider): void {
  console.log(`[DB-Selector] Переключение на провайдер базы данных: ${provider}`);
  selectedProvider = provider;
}

// Экспортируем выбранный драйвер базы данных
export const db = selectedProvider === 'neon' ? neonDb.db : replitDb.db;
export const pool = selectedProvider === 'neon' ? neonDb.pool : replitDb.pool;
export const dbConnectionStatus = selectedProvider === 'neon' ? neonDb.dbConnectionStatus : replitDb.dbConnectionStatus;
export const testDatabaseConnection = selectedProvider === 'neon' ? neonDb.testDatabaseConnection : replitDb.testDatabaseConnection;
export const queryWithRetry = selectedProvider === 'neon' ? neonDb.queryWithRetry : replitDb.queryWithRetry;
export const query = selectedProvider === 'neon' ? neonDb.query : replitDb.query;

// Функция для получения типа текущего провайдера
export function getCurrentProvider(): DatabaseProvider {
  return selectedProvider;
}