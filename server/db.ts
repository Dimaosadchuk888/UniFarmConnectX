/**
 * Модуль подключения к Neon DB
 * 
 * Этот модуль обеспечивает подключение к Neon DB через Drizzle ORM
 * Внимание: В этом режиме используется ТОЛЬКО Neon DB, независимо от настроек среды
 */

// Фикс для обеспечения подключения к Neon DB в любой среде
import '../db-connect-fix.js';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema';
import { format, addDays } from 'date-fns';

// Проверяем наличие строки подключения к Neon DB
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in the environment variables');
}

console.log('[DB-NEON] 🚀 Инициализация Neon DB соединения');

// Явно настраиваем переменные окружения (важно для корректной работы)
process.env.PGHOST = process.env.PGHOST || process.env.REPLIT_POSTGRES_HOST || 'localhost';
process.env.PGPORT = process.env.PGPORT || process.env.REPLIT_POSTGRES_PORT || '5432';
process.env.PGUSER = process.env.PGUSER || process.env.REPLIT_POSTGRES_USER || 'postgres';
process.env.PGPASSWORD = process.env.PGPASSWORD || process.env.REPLIT_POSTGRES_PASSWORD || 'postgres';
process.env.PGDATABASE = process.env.PGDATABASE || process.env.REPLIT_POSTGRES_DATABASE || 'postgres';

// Настройка SSL для разных окружений
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres.neon.tech')) {
  // Для Neon DB требуется SSL, но без верификации сертификатов
  process.env.PGSSLMODE = 'require';
  console.log('[DB] Обнаружена Neon DB, настройка SSL: PGSSLMODE=require');
} else if (process.env.REPL_ID || process.env.REPL_SLUG) {
  // Для Replit PostgreSQL предпочитаем SSL, но не требуем его
  process.env.PGSSLMODE = 'prefer';
  console.log('[DB] Обнаружена Replit среда, настройка SSL: PGSSLMODE=prefer');
} else {
  // Для других окружений (локальная разработка)
  process.env.PGSSLMODE = 'prefer';
  console.log('[DB] Обнаружена другая среда, настройка SSL: PGSSLMODE=prefer');
}

// Диагностическая информация перед созданием пула
console.log('[DB] Диагностика перед подключением:');
console.log(`[DB] DATABASE_URL: ${process.env.DATABASE_URL ? 'Установлен (скрыт)' : 'Не установлен'}`);
console.log(`[DB] PGHOST: ${process.env.PGHOST}`);
console.log(`[DB] PGPORT: ${process.env.PGPORT}`);
console.log(`[DB] PGUSER: ${process.env.PGUSER ? 'Установлен (скрыт)' : 'Не установлен'}`);
console.log(`[DB] PGDATABASE: ${process.env.PGDATABASE}`);
console.log(`[DB] PGSSLMODE: ${process.env.PGSSLMODE}`);

// Настраиваем опции SSL в зависимости от среды
const sslOptions = {
  // Для Neon DB и других облачных БД отключаем верификацию сертификатов
  rejectUnauthorized: false,
};

// Создаем пул соединений с расширенными настройками
let pool: Pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslOptions,
  
  // Оптимизация пула соединений
  max: 10, // максимальное количество клиентов в пуле (уменьшено для лучшей стабильности)
  idleTimeoutMillis: 60000, // увеличенное время ожидания перед закрытием неиспользуемых соединений
  connectionTimeoutMillis: 10000, // время ожидания при подключении нового клиента
  
  // Включаем keepAlive для предотвращения разрывов длительных соединений
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000, // 10 секунд
});

// Настройки для PostgreSQL уже применены в db-connect-fix.js
// Не требуется дополнительной установки здесь

console.log('[DB-NEON] Соединение с Neon DB инициализировано');

// Устанавливаем обработчики событий для пула соединений
pool.on('error', (err) => {
  console.error('[DB] Произошла ошибка пула:', err.message);
  console.error(err.stack);
  
  // Автоматическое переподключение при критических ошибках
  if (err.message.includes('connection terminated') || 
      err.message.includes('Connection terminated') ||
      err.message.includes('Connection timed out')) {
    console.log('[DB] Попытка автоматического переподключения...');
    tryReconnect();
  }
});

pool.on('connect', () => {
  console.log('[DB] Новое соединение установлено');
});

// Функция для повторного подключения к базе данных
async function tryReconnect(attempts = 3, delay = 2000): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      console.log(`[DB] Попытка переподключения ${i + 1}/${attempts}...`);
      
      // Закрываем текущий пул, если он существует
      try {
        await pool.end();
      } catch (error) {
        const err = error as Error;
        console.warn('[DB] Ошибка при закрытии пула:', err.message);
      }
      
      // Пересоздаем переменные окружения для надежности
      console.log('[DB] Переустановка переменных окружения...');
      process.env.PGHOST = process.env.PGHOST || process.env.REPLIT_POSTGRES_HOST || 'localhost';
      process.env.PGPORT = process.env.PGPORT || process.env.REPLIT_POSTGRES_PORT || '5432';
      process.env.PGUSER = process.env.PGUSER || process.env.REPLIT_POSTGRES_USER || 'postgres';
      process.env.PGPASSWORD = process.env.PGPASSWORD || process.env.REPLIT_POSTGRES_PASSWORD || 'postgres';
      process.env.PGDATABASE = process.env.PGDATABASE || process.env.REPLIT_POSTGRES_DATABASE || 'postgres';
      
      // Создаем новый пул с теми же параметрами
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 8000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
      });
      
      // Проверяем соединение
      await pool.query('SELECT 1');
      console.log('[DB] ✅ Переподключение успешно выполнено');
      
      return true;
    } catch (error) {
      const err = error as Error;
      console.error(`[DB] Ошибка при переподключении (попытка ${i + 1}/${attempts}):`, err.message);
      
      if (i < attempts - 1) {
        console.log(`[DB] Следующая попытка через ${delay}мс...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('[DB] ❌ Все попытки переподключения завершились неудачно');
  return false;
}

// Создаем и экспортируем Drizzle ORM
export const db = drizzle(pool, { schema });

// Экспортируем пул соединений для случаев, где нужен прямой доступ
export { pool };

// Функция для выполнения SQL-запросов напрямую
export async function query(text: string, params?: any[]) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error: any) {
    console.error(`[DB] Ошибка выполнения запроса: ${text}`, error);
    throw error;
  }
}

// Функция для выполнения SQL-запросов с повторными попытками
export async function queryWithRetry(text: string, params?: any[], retries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`[DB] Попытка ${attempt + 1}/${retries} не удалась: ${error.message}`);
      
      if (attempt < retries - 1) {
        console.log(`[DB] Повторная попытка через ${delay}мс...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Текущий статус соединения с базой данных
export const dbConnectionStatus = {
  isConnected: false,
  lastConnectionAttempt: null as Date | null,
  error: null as Error | null,
  isPartitioned: false, // Флаг партиционирования
  
  // Обновляем статус соединения
  async update() {
    this.lastConnectionAttempt = new Date();
    try {
      await pool.query('SELECT 1');
      this.isConnected = true;
      this.error = null;
      
      // Проверяем статус партиционирования
      try {
        const partitionResult = await isTablePartitioned();
        this.isPartitioned = partitionResult;
      } catch (partitionError: any) {
        console.error('[DB] Ошибка при проверке партиционирования:', partitionError.message);
        this.isPartitioned = false;
      }
    } catch (error: any) {
      this.isConnected = false;
      this.error = error;
    }
    return this.isConnected;
  }
};

// Функция для проверки, является ли таблица партиционированной
export async function isTablePartitioned(tableName: string = 'transactions'): Promise<boolean> {
  try {
    const query = `
      SELECT pt.relname as parent_table, 
             c.relname as child_table,
             pg_get_expr(c.relpartbound, c.oid) as partition_expression
      FROM pg_inherits i
      JOIN pg_class pt ON pt.oid = i.inhparent
      JOIN pg_class c ON c.oid = i.inhrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pt.relname = $1 
      AND n.nspname = 'public'
      LIMIT 1;
    `;
    
    const result = await pool.query(query, [tableName]);
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('[DB] Ошибка при проверке партиционирования таблицы:', error);
    return false;
  }
}

// Функция для создания партиции для конкретной даты
export async function createPartitionForDate(date: Date): Promise<boolean> {
  try {
    const dateStr = format(date, 'yyyy_MM_dd');
    const partitionName = `transactions_${dateStr}`;
    
    const startDate = format(date, 'yyyy-MM-dd');
    const endDate = format(addDays(date, 1), 'yyyy-MM-dd');
    
    console.log(`[DB] Создание партиции ${partitionName} для даты ${startDate}`);
    
    // Проверяем существование партиции перед созданием
    const checkQuery = `
      SELECT relname 
      FROM pg_class 
      WHERE relname = $1
    `;
    const checkResult = await pool.query(checkQuery, [partitionName]);
    
    if (checkResult.rowCount && checkResult.rowCount > 0) {
      console.log(`[DB] Партиция ${partitionName} уже существует`);
      return true;
    }
    
    // Создаем партицию
    const createQuery = `
      CREATE TABLE IF NOT EXISTS ${partitionName}
      PARTITION OF transactions
      FOR VALUES FROM ('${startDate}') TO ('${endDate}');
    `;
    
    await pool.query(createQuery);
    
    // Создаем индексы для партиции
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS ${partitionName}_user_id_idx ON ${partitionName} (user_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS ${partitionName}_type_idx ON ${partitionName} (type)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS ${partitionName}_created_at_idx ON ${partitionName} (created_at)`);
    } catch (indexError: any) {
      console.warn(`[DB] Предупреждение при создании индексов для ${partitionName}:`, indexError.message);
      // Продолжаем выполнение, даже если индексы не удалось создать
    }
    
    console.log(`[DB] Партиция ${partitionName} успешно создана`);
    return true;
  } catch (error: any) {
    console.error(`[DB] Ошибка при создании партиции:`, error.message);
    return false;
  }
}

// Функция для создания партиций на будущие даты
export async function createFuturePartitions(daysAhead: number = 5): Promise<{
  success: boolean;
  createdCount: number;
  partitions: string[];
  errors: string[];
}> {
  const partitions: string[] = [];
  const errors: string[] = [];
  let createdCount = 0;
  
  try {
    // Проверяем, что таблица партиционирована
    const isPartitioned = await isTablePartitioned();
    
    if (!isPartitioned) {
      return {
        success: false,
        createdCount: 0,
        partitions: [],
        errors: ['Таблица transactions не партиционирована']
      };
    }
    
    // Создаем партиции на указанное количество дней вперед
    const today = new Date();
    
    for (let i = 0; i <= daysAhead; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy_MM_dd');
      const partitionName = `transactions_${dateStr}`;
      
      try {
        const success = await createPartitionForDate(date);
        
        if (success) {
          partitions.push(partitionName);
          createdCount++;
        }
      } catch (error: any) {
        errors.push(`Ошибка создания ${partitionName}: ${error.message}`);
      }
    }
    
    return {
      success: true,
      createdCount,
      partitions,
      errors
    };
  } catch (error: any) {
    console.error('[DB] Ошибка при создании будущих партиций:', error);
    
    return {
      success: false,
      createdCount,
      partitions,
      errors: [...errors, error.message]
    };
  }
}

// Функция для инициализации партиционирования при запуске
export async function initializePartitioning(): Promise<boolean> {
  try {
    // Проверяем партиционирование
    const isPartitioned = await isTablePartitioned();
    
    if (!isPartitioned) {
      console.log('[DB] Таблица transactions не партиционирована. Партиционирование пропущено.');
      return false;
    }
    
    // Если таблица партиционирована, создаем партиции на будущие даты
    console.log('[DB] Создание партиций на будущие даты...');
    const result = await createFuturePartitions(5);
    
    if (result.success) {
      console.log(`[DB] Успешно создано ${result.createdCount} партиций: ${result.partitions.join(', ')}`);
    } else {
      console.error('[DB] Ошибка при создании партиций:', result.errors.join('; '));
    }
    
    return result.success;
  } catch (error: any) {
    console.error('[DB] Ошибка при инициализации партиционирования:', error.message);
    return false;
  }
}

// Функция для тестирования соединения с базой данных
export async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW() as time');
    return {
      success: true,
      timestamp: result.rows[0].time,
      message: 'Соединение с базой данных успешно установлено'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Ошибка соединения с базой данных: ${error.message}`
    };
  }
}

// Инициализируем статус соединения
dbConnectionStatus.update().then(async (isConnected) => {
  if (isConnected) {
    console.log('✅ [DB] Соединение успешно установлено при запуске');
    
    // Проверяем, нужно ли инициализировать партиционирование
    if (process.env.SKIP_PARTITION_CREATION === 'true') {
      console.log('🔄 [DB] Инициализация партиционирования пропущена согласно настройкам SKIP_PARTITION_CREATION');
    } else {
      // Пытаемся инициализировать партиционирование
      try {
        await initializePartitioning();
      } catch (error: any) {
        console.error('⚠️ [DB] Ошибка при инициализации партиционирования:', error.message);
        
        if (process.env.IGNORE_PARTITION_ERRORS === 'true') {
          console.log('🔄 [DB] Ошибка партиционирования игнорируется согласно настройкам IGNORE_PARTITION_ERRORS');
        } else {
          console.error('Работа приложения будет продолжена без партиционирования');
        }
      }
    }
  } else {
    console.error('❌ [DB] Не удалось установить соединение при запуске');
    console.error('Ошибка:', dbConnectionStatus.error?.message);
  }
});