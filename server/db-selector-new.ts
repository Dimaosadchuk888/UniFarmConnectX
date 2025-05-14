/**
 * Селектор для выбора источника данных PostgreSQL в зависимости от настроек
 * 
 * Поддерживает:
 * - Neon DB (для продакшена) - ⚠️УСТАРЕВШИЙ РЕЖИМ⚠️
 * - PostgreSQL Replit (для разработки и продакшена) - РЕКОМЕНДУЕМЫЙ РЕЖИМ
 * 
 * ВАЖНО: При запуске через start-with-replit-db.js будет принудительно использоваться
 * Replit PostgreSQL, и попытки переключения на Neon DB будут заблокированы.
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

// Проверка принудительного использования локальной базы
const enforceLocalDbOnly = process.env.USE_LOCAL_DB_ONLY === 'true';

/**
 * Определяем, какой источник данных использовать,
 * с защитой от случайного подключения к Neon DB в production
 */
const getDatabaseProvider = (): DatabaseProvider => {
  // Получаем провайдер из переменной окружения
  const provider = process.env.DATABASE_PROVIDER || 'neon';
  
  // Проверяем, если установлен режим принудительного использования локальной БД
  if (enforceLocalDbOnly && provider !== 'replit') {
    console.error(`
⚠️ ВНИМАНИЕ: Обнаружена попытка подключения к Neon DB, когда USE_LOCAL_DB_ONLY=true ⚠️
Принудительно используем Replit PostgreSQL для предотвращения потери данных.
Для деактивации этой защиты, установите USE_LOCAL_DB_ONLY=false в .env.replit.
    `);
    return 'replit';
  }
  
  // Проверка наличия переменных окружения для Replit PostgreSQL
  const hasReplitPgEnv = process.env.PGHOST === 'localhost' && process.env.PGUSER === 'runner';
  
  // Если выбран провайдер replit, но не найдены переменные окружения, выдаем предупреждение
  if (provider === 'replit' && !hasReplitPgEnv) {
    console.warn(`
⚠️ ВНИМАНИЕ: Выбран провайдер 'replit', но переменные окружения PostgreSQL не настроены правильно.
Для корректной работы c Replit PostgreSQL необходимо:
1. Создать базу данных PostgreSQL на Replit
2. Загрузить правильные переменные окружения из .env.replit
Рекомендуется использовать скрипт start-with-replit-db.js для запуска.
    `);
  }
  
  // Логируем выбранный источник
  console.log(`[DB-Selector] Используется база данных: ${provider}`);
  
  return provider as DatabaseProvider;
};

// Инициализируем провайдер
currentDatabaseProvider = getDatabaseProvider();

// Если установлен флаг USE_LOCAL_DB_ONLY=true, принудительно используем Replit PostgreSQL
if (enforceLocalDbOnly && currentDatabaseProvider !== 'replit') {
  console.error(`[DB-Selector] ⚠️ Обнаружена попытка использования Neon DB при USE_LOCAL_DB_ONLY=true`);
  console.error(`[DB-Selector] Принудительно переключаемся на Replit PostgreSQL`);
  currentDatabaseProvider = 'replit';
}

// Функция для получения нужного модуля на основе текущего провайдера
const getSelectedModule = () => {
  // Добавляем защиту от случайного переключения на Neon DB
  if (enforceLocalDbOnly && currentDatabaseProvider !== 'replit') {
    console.error(`[DB-Selector] ⚠️ Попытка переключения на Neon DB заблокирована (USE_LOCAL_DB_ONLY=true)`);
    return replitDB;
  }
  return currentDatabaseProvider === 'replit' ? replitDB : neonDB;
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
 * С защитой от случайного переключения на Neon DB если USE_LOCAL_DB_ONLY=true
 */
export const setDatabaseProvider = (provider: DatabaseProvider): void => {
  // Проверка для предотвращения переключения на Neon DB, если установлен флаг USE_LOCAL_DB_ONLY
  if (enforceLocalDbOnly && provider !== 'replit') {
    console.error(`
⚠️ КРИТИЧЕСКАЯ ОШИБКА: Попытка переключения на Neon DB при USE_LOCAL_DB_ONLY=true ⚠️
База данных НЕ ПЕРЕКЛЮЧЕНА для предотвращения потери данных и конфликтов.
Сервер продолжит использовать Replit PostgreSQL.

Для отключения этой защиты установите USE_LOCAL_DB_ONLY=false в .env.replit.
    `);
    return;
  }
  
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