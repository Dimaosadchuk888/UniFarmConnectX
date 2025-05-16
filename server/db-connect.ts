/**
 * Модуль надежного подключения к базе данных PostgreSQL
 * 
 * Этот модуль обеспечивает подключение к PostgreSQL (Neon DB и Replit PostgreSQL)
 * с расширенными возможностями восстановления соединения и надежности
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';
import { QueryResult } from 'pg';

// Настройка переменных окружения
function setupEnvironmentVariables() {
  // Устанавливаем SSL для подключения
  process.env.PGSSLMODE = 'require';
  
  // Проверяем наличие переменных окружения для Neon DB или Replit PostgreSQL
  const hasNeonUrl = !!process.env.DATABASE_URL && 
    process.env.DATABASE_URL.includes('neon.tech');
  
  const hasReplitPg = process.env.PGHOST === 'localhost' && 
    process.env.PGUSER === 'runner';

  // Если есть DATABASE_URL для Neon DB, используем его
  if (hasNeonUrl) {
    console.log('[DB Connect] Используем Neon DB (из DATABASE_URL)');
  } 
  // Иначе используем Replit PostgreSQL
  else if (hasReplitPg) {
    console.log('[DB Connect] Используем Replit PostgreSQL (из переменных окружения)');
  }
  // Если ничего не настроено, выводим предупреждение
  else {
    console.warn('[DB Connect] ⚠️ Не найдены настройки подключения к базе данных!');
  }
}

// Вызываем функцию настройки переменных окружения
setupEnvironmentVariables();

// Настраиваем параметры подключения
const poolConfig = process.env.DATABASE_URL
  ? { 
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,           // Максимальное количество соединений в пуле
      idleTimeoutMillis: 30000, // Тайм-аут простоя соединения (30 секунд)
      connectionTimeoutMillis: 5000 // Тайм-аут подключения (5 секунд)
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432'),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      database: process.env.PGDATABASE || 'postgres',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    };

// Создаем пул соединений
const pool = new Pool(poolConfig);

// Настраиваем обработчик ошибок соединения
pool.on('error', (err: Error) => {
  console.error('[DB] ❌ Ошибка пула подключений PostgreSQL:', err.message);
  
  // Пытаемся переподключиться при ошибке
  console.log('[DB] 🔄 Попытка автоматического переподключения...');
  
  // Не завершаем процесс, чтобы дать возможность восстановиться
});

// Создаем экземпляр Drizzle ORM
export const db = drizzle(pool, { schema });

/**
 * Проверяет соединение с базой данных
 * @returns Promise<boolean> true, если соединение успешно
 */
export async function testConnection(): Promise<boolean> {
  try {
    // Простой запрос для проверки соединения
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    return !!result.rows.length;
  } catch (error) {
    console.error('[DB] ❌ Ошибка при проверке соединения:', error);
    return false;
  }
}

/**
 * Пытается переподключиться к базе данных
 * @param attempts Максимальное количество попыток переподключения
 * @returns Promise<boolean> true, если переподключение успешно
 */
export async function reconnect(attempts = 3): Promise<boolean> {
  console.log(`[DB] 🔄 Попытка переподключения (осталось попыток: ${attempts})...`);
  
  for (let i = 0; i < attempts; i++) {
    try {
      // Закрываем текущий пул соединений
      await pool.end();
      
      // Создаем новый пул
      const newPool = new Pool(poolConfig);
      
      // Проверяем новое соединение
      const client = await newPool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      if (result.rows.length) {
        console.log('[DB] ✅ Соединение с базой данных успешно восстановлено');
        
        // Обновляем обработчик ошибок для нового пула
        newPool.on('error', (err: Error) => {
          console.error('[DB] ❌ Ошибка пула подключений PostgreSQL:', err.message);
        });
        
        // Обновляем глобальную переменную пула
        // @ts-ignore: Прямое присвоение
        pool = newPool;
        
        return true;
      }
    } catch (error) {
      console.error(`[DB] ❌ Ошибка при попытке ${i+1} из ${attempts}:`, error);
      
      // Ждем перед следующей попыткой
      if (i < attempts - 1) {
        const delay = 1000 * Math.pow(2, i); // Экспоненциальная задержка
        console.log(`[DB] ⏱️ Ожидание ${delay}ms перед следующей попыткой...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('[DB] ❌ Не удалось переподключиться к базе данных после нескольких попыток');
  return false;
}

/**
 * Выполняет SQL-запрос с автоматическим повторением при ошибках соединения
 * @param query SQL-запрос
 * @param params Параметры запроса
 * @param retries Количество попыток при ошибке
 * @param delayMs Задержка между попытками в мс
 * @returns Promise<QueryResult<any>> Результат запроса
 */
export async function queryWithRetry(
  query: string,
  params: any[] = [],
  retries = 3,
  delayMs = 1000
): Promise<QueryResult<any>> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(query, params);
        return result;
      } finally {
        client.release();
      }
    } catch (error: any) {
      // Проверка на ошибки соединения
      const isConnectionError = error.message.includes('connection') || 
                                error.message.includes('socket') ||
                                error.message.includes('timeout') ||
                                error.code === 'ECONNREFUSED' ||
                                error.code === 'ETIMEDOUT' ||
                                error.code === '57P01'; // SQL state code for admin shutdown
      
      if (isConnectionError && attempt < retries) {
        console.warn(`[DB] ⚠️ Ошибка соединения при выполнении запроса (попытка ${attempt + 1}/${retries}): ${error.message}`);
        
        // Пробуем переподключиться
        if (attempt === 0) {
          await reconnect(1);
        }
        
        // Ждем перед следующей попыткой (экспоненциальная задержка)
        const waitTime = delayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Другие ошибки или исчерпаны попытки
      throw error;
    }
  }
  
  throw new Error(`Не удалось выполнить запрос после ${retries} попыток`);
}

/**
 * Тестирует подключение к базе данных для использования при запуске сервера
 * @returns Promise<boolean> true, если подключение успешно
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() as current_time');
      console.log(`[DB Test] ✅ Подключение к БД успешно: ${result.rows[0].current_time}`);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[DB Test] ❌ Ошибка подключения к базе данных:', error);
    return false;
  }
}