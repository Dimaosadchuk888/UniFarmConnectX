/**
 * Селектор для выбора источника данных PostgreSQL в зависимости от настроек
 * 
 * Поддерживает:
 * - Neon DB (для продакшена)
 * - PostgreSQL Replit (для разработки)
 */

import * as neonDB from './db';
import * as replitDB from './db-replit';

// Тип источника данных
export type DatabaseProvider = 'neon' | 'replit';

// Переменная, хранящая текущий провайдер
let currentDatabaseProvider: DatabaseProvider;

// Определяем, какой источник данных использовать
const getDatabaseProvider = (): DatabaseProvider => {
  // Проверяем переменную окружения
  const provider = process.env.DATABASE_PROVIDER || 'neon';
  
  // Логируем выбранный источник
  console.log(`[DB-Selector] Используется база данных: ${provider}`);
  
  return provider as DatabaseProvider;
};

// Инициализируем провайдер
currentDatabaseProvider = getDatabaseProvider();

// Функция для получения нужного модуля на основе текущего провайдера
const getSelectedModule = () => {
  return currentDatabaseProvider === 'replit' ? replitDB : neonDB;
};

// Экспорты, обновляющиеся при изменении провайдера
export let pool = getSelectedModule().pool;
export let db = getSelectedModule().db;
export let query = getSelectedModule().query;
export let queryWithRetry = getSelectedModule().queryWithRetry;
export let dbConnectionStatus = getSelectedModule().dbConnectionStatus;
export let testDatabaseConnection = getSelectedModule().testDatabaseConnection;

// Переключение провайдера приведет к обновлению экспортов
const updateExports = () => {
  const module = getSelectedModule();
  pool = module.pool;
  db = module.db;
  query = module.query;
  queryWithRetry = module.queryWithRetry;
  dbConnectionStatus = module.dbConnectionStatus;
  testDatabaseConnection = module.testDatabaseConnection;
};

// Функция для динамического изменения провайдера базы данных
export const setDatabaseProvider = (provider: DatabaseProvider): void => {
  console.log(`[DB-Selector] Провайдер базы данных изменен на: ${provider}`);
  currentDatabaseProvider = provider;
  // Обновляем экспорты при изменении провайдера
  updateExports();
};

// Функция для получения текущего провайдера базы данных
export const getCurrentProvider = (): DatabaseProvider => {
  return currentDatabaseProvider;
};

// Функция для тестирования соединения
export const testConnection = async (): Promise<boolean> => {
  try {
    const connected = await testDatabaseConnection();
    if (connected) {
      console.log(`[DB-Selector] Соединение с базой данных ${currentDatabaseProvider} установлено`);
    } else {
      console.error(`[DB-Selector] Не удалось подключиться к базе данных ${currentDatabaseProvider}`);
    }
    return connected;
  } catch (error) {
    console.error(`[DB-Selector] Ошибка при проверке соединения:`, error);
    return false;
  }
};