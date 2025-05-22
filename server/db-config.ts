/**
 * Модуль конфигурации подключения к базе данных
 * 
 * Этот модуль обеспечивает настройки для подключения к PostgreSQL и 
 * определяет тип БД (Neon или Replit PostgreSQL) на основе переменных окружения.
 * Модуль не содержит активного подключения к БД, что предотвращает циклические зависимости.
 */

import { PoolConfig, PoolClient } from 'pg';

// Определяем тип для SSL конфигурации
export type SSLConfig = {
  rejectUnauthorized?: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

// Определяем собственный тип для настроек пула соединений
export interface DbPoolConfig extends Omit<PoolConfig, 'statement_timeout'> {
  // Добавляем дополнительные настройки, которые могут отсутствовать в стандартном типе
  keepAliveInitialDelayMillis?: number;
  statement_timeout?: number;
}

// Определяет тип базы данных
export enum DatabaseType {
  REPLIT = 'replit',
  NEON = 'neon'
}

// Типы сетевых режимов SSL
export enum SSLMode {
  REQUIRE = 'require',
  PREFER = 'prefer',
  ALLOW = 'allow',
  DISABLE = 'disable'
}

/**
 * Получает тип базы данных на основе переменных окружения
 * @returns DatabaseType - тип базы данных
 */
export function getDatabaseType(): DatabaseType {
  // Явное указание типа БД
  const dbType = process.env.DB_TYPE?.toLowerCase();
  if (dbType === 'neon') {
    return DatabaseType.NEON;
  }
  if (dbType === 'replit') {
    return DatabaseType.REPLIT;
  }

  // Определение по URL
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.includes('neon.tech')) {
    return DatabaseType.NEON;
  }

  // По умолчанию
  return DatabaseType.REPLIT;
}

/**
 * Получает объект настроек SSL для базы данных
 * @param mode - режим SSL
 * @returns SSL конфигурация
 */
export function getSSLConfig(mode: SSLMode = SSLMode.REQUIRE): false | SSLConfig {
  if (mode === SSLMode.DISABLE) {
    return false;
  }
  
  return { 
    rejectUnauthorized: mode === SSLMode.REQUIRE 
  };
}

/**
 * Получает оптимальные настройки пула подключений для указанного типа БД
 * @param type - тип базы данных
 * @returns Оптимальные настройки пула
 */
export function getPoolOptions(type: DatabaseType): Partial<DbPoolConfig> {
  // Базовые опции для любого типа БД
  const baseOptions: Partial<DbPoolConfig> = {
    max: 15,                    // Максимальное количество соединений
    idleTimeoutMillis: 60000,   // Таймаут простоя (1 минута)
    connectionTimeoutMillis: 10000, // Таймаут подключения (10 секунд)
    allowExitOnIdle: false,     // Не выходить при простое
    keepAlive: true,            // Поддерживать соединение активным
    statement_timeout: 30000    // Таймаут запроса (30 секунд)
  };
  
  // Специфичные настройки для Neon
  if (type === DatabaseType.NEON) {
    return {
      ...baseOptions,
      // С Neon эффективнее меньший пул из-за ограничений пула соединений
      max: 10,
      // Больший таймаут для Neon из-за возможных задержек
      connectionTimeoutMillis: 15000,
    };
  }
  
  // Настройки для Replit PostgreSQL
  return baseOptions;
}

/**
 * Получает полную конфигурацию для подключения к БД
 * @param alternateNumber - номер альтернативной строки подключения (0 - основная, >0 - альтернативные)
 * @returns Конфигурация пула подключений
 */
export function getDbConfig(alternateNumber: number = 0): PoolConfig {
  const dbType = getDatabaseType();
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Выбираем строку подключения на основе номера альтернативы
  let connectionString: string | undefined;
  
  if (alternateNumber === 0) {
    // Основная строка подключения
    connectionString = process.env.DATABASE_URL;
  } else if (alternateNumber === 1) {
    // Первая альтернатива - обычно основной Neon URL
    connectionString = process.env.NEON_DB_URL || process.env.ALTERNATE_DB_URL;
  } else if (alternateNumber === 2) {
    // Вторая альтернатива - ALTERNATE_DB_URL_1 если есть
    connectionString = process.env.ALTERNATE_DB_URL_1 || process.env.ALTERNATE_DB_URL;
  } else if (alternateNumber === 3) {
    // Третья альтернатива - ALTERNATE_DB_URL_2 если есть
    connectionString = process.env.ALTERNATE_DB_URL_2 || process.env.ALTERNATE_DB_URL;
  } else if (alternateNumber === 4) {
    // Четвертая альтернатива - ALTERNATE_DB_URL_3 если есть
    connectionString = process.env.ALTERNATE_DB_URL_3 || process.env.ALTERNATE_DB_URL;
  } else {
    // Основная альтернатива - ALTERNATE_DB_URL
    connectionString = process.env.ALTERNATE_DB_URL;
  }
  
  // Если ничего не нашли, возвращаемся к основной строке
  if (!connectionString) {
    connectionString = process.env.DATABASE_URL;
  }
  
  // Базовая проверка строки подключения
  if (!connectionString) {
    throw new Error(
      "Строка подключения к БД не задана. Возможно, база данных не настроена."
    );
  }
  
  console.log(`[DB Config] Используем строку подключения #${alternateNumber}`);
  
  // Основные настройки подключения
  const baseConfig = {
    connectionString,
    ssl: (dbType === DatabaseType.NEON || isProduction) 
      ? getSSLConfig(SSLMode.REQUIRE)
      : false
  };
  
  // Объединяем с настройками пула
  return {
    ...baseConfig,
    ...getPoolOptions(dbType)
  };
}

/**
 * Определяет SSL режим на основе переменных окружения
 * @returns Режим SSL
 */
export function determineSSLMode(): SSLMode {
  const sslMode = process.env.PGSSLMODE?.toLowerCase();
  
  switch (sslMode) {
    case 'require':
      return SSLMode.REQUIRE;
    case 'prefer':
      return SSLMode.PREFER;
    case 'allow':
      return SSLMode.ALLOW;
    case 'disable':
      return SSLMode.DISABLE;
    default:
      return process.env.NODE_ENV === 'production' 
        ? SSLMode.REQUIRE 
        : SSLMode.PREFER;
  }
}

// Установка переменных окружения для SSL
export function setupEnvironmentVariables(): void {
  // Устанавливаем режим SSL
  if (!process.env.PGSSLMODE) {
    process.env.PGSSLMODE = 'require';
  }
  
  // Логирование настроек
  const dbType = getDatabaseType();
  console.log(`[DB Config] Тип базы данных: ${dbType}`);
  console.log(`[DB Config] SSL режим: ${process.env.PGSSLMODE}`);
}

// Автоматически настраиваем переменные окружения
setupEnvironmentVariables();