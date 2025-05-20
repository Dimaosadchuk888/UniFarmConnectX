/**
 * Селектор для выбора источника данных PostgreSQL в зависимости от настроек
 * 
 * Поддерживает:
 * - Neon DB (для продакшена) - PRODUCTION РЕЖИМ
 * - PostgreSQL Replit (для разработки) - DEVELOPMENT РЕЖИМ
 * 
 * Особенности:
 * - В production режиме (NODE_ENV=production) по умолчанию используется Neon DB
 * - При запуске через start-with-neon.sh, start-with-neon-db.js принудительно используется Neon DB
 * - При запуске через start-with-replit-db.js принудительно используется Replit PostgreSQL
 */

import * as neonDB from './db';
import * as replitDB from './db-replit';

// Тип источника данных
export type DatabaseProvider = 'neon' | 'replit';

// Тип возвращаемого значения для тестирования соединения
export type TestConnectionResult = boolean | { 
  success: boolean; 
  timestamp?: any; 
  message?: string; 
};

// Переменная, хранящая текущий провайдер
let currentDatabaseProvider: DatabaseProvider;

// Определяем, какую базу данных использовать

// ФОРСИРОВАННОЕ ИСПОЛЬЗОВАНИЕ NEON DB [OVERRIDE]
const determineProvider = (): DatabaseProvider => {
  console.log('[DB-Selector] 🚀 ФОРСИРОВАНИЕ NEON DB (override-db-provider.cjs)');
  return 'neon';
};

// Инициализируем провайдер
currentDatabaseProvider = determineProvider();

console.log(`[DB-Selector] Переключение на провайдер базы данных: ${currentDatabaseProvider}`);

// Функция для получения нужного модуля на основе текущего провайдера
const getSelectedModule = () => {
  if (currentDatabaseProvider === 'neon') {
    console.log(`[DB-Selector] Использование модуля Neon DB`);
    return neonDB;
  } else {
    console.log(`[DB-Selector] Использование модуля Replit PostgreSQL`);
    return replitDB;
  }
};

// Экспорты, обновляющиеся при изменении провайдера
export let pool = getSelectedModule().pool;
export let db = getSelectedModule().db;
export let query = getSelectedModule().query;
export let queryWithRetry = getSelectedModule().queryWithRetry;
export let dbConnectionStatus = getSelectedModule().dbConnectionStatus;
export let testDatabaseConnection: () => Promise<TestConnectionResult> = getSelectedModule().testDatabaseConnection;

// Переключение провайдера приведет к обновлению экспортов
const updateExports = () => {
  const module = getSelectedModule();
  pool = module.pool;
  db = module.db;
  query = module.query;
  queryWithRetry = module.queryWithRetry;
  dbConnectionStatus = module.dbConnectionStatus;
  testDatabaseConnection = module.testDatabaseConnection as () => Promise<TestConnectionResult>;
};

/**
 * Функция для динамического изменения провайдера базы данных
 * Обрабатывает принудительные флаги и приоритеты провайдеров
 */
export const setDatabaseProvider = (provider: DatabaseProvider): void => {
  // Проверяем флаги принудительного использования определенного провайдера
  const forceNeonDb = process.env.FORCE_NEON_DB === 'true';
  const useLocalDbOnly = process.env.USE_LOCAL_DB_ONLY === 'true';
  
  // Логика выбора провайдера с учетом принудительных флагов
  if (forceNeonDb && provider !== 'neon') {
    console.log(`[DB-Selector] Попытка переключения на ${provider} проигнорирована (FORCE_NEON_DB=true)`);
    currentDatabaseProvider = 'neon';
  } else if (useLocalDbOnly && provider !== 'replit') {
    console.log(`[DB-Selector] Попытка переключения на ${provider} проигнорирована (USE_LOCAL_DB_ONLY=true)`);
    currentDatabaseProvider = 'replit';
  } else {
    console.log(`[DB-Selector] Провайдер базы данных установлен на: ${provider}`);
    currentDatabaseProvider = provider;
  }
  
  // Обновляем экспорты
  updateExports();
};

// Функция для получения текущего провайдера базы данных
export const getCurrentProvider = (): DatabaseProvider => {
  return currentDatabaseProvider;
};

// Функция для тестирования соединения
export const testConnection = async (): Promise<boolean> => {
  try {
    const result: TestConnectionResult = await testDatabaseConnection();
    const connected = typeof result === 'boolean' ? result : result.success;
    
    if (connected) {
      console.log(`[DB-Selector] Соединение с базой данных ${currentDatabaseProvider} установлено`);
      if (typeof result !== 'boolean' && result.message) {
        console.log(`[DB-Selector] ${result.message}`);
      }
    } else {
      console.error(`[DB-Selector] Не удалось подключиться к базе данных ${currentDatabaseProvider}`);
      if (typeof result !== 'boolean' && result.message) {
        console.error(`[DB-Selector] ${result.message}`);
      }
    }
    return connected;
  } catch (error) {
    console.error(`[DB-Selector] Ошибка при проверке соединения:`, error);
    return false;
  }
};