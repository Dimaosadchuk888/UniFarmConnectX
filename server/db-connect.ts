/**
 * Модуль надежного подключения к базе данных PostgreSQL
 * 
 * Этот модуль обеспечивает подключение к PostgreSQL (Neon DB и Replit PostgreSQL)
 * с расширенными возможностями восстановления соединения и надежности
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';
// Импортируем функции мониторинга из упрощенного модуля db-health
import * as dbHealth from './db-health';

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

// Настраиваем параметры подключения с оптимизированными настройками для стабильности
const poolConfig = process.env.DATABASE_URL
  ? { 
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 15,                    // Увеличиваем максимальное количество соединений
      min: 2,                     // Поддерживаем минимум 2 соединения
      idleTimeoutMillis: 60000,   // Увеличиваем тайм-аут простоя соединения (1 минута)
      connectionTimeoutMillis: 10000, // Увеличиваем тайм-аут подключения (10 секунд)
      allowExitOnIdle: false,     // Не разрешаем выход при простое
      keepAlive: true,            // Включаем соединения keep-alive
      keepAliveInitialDelayMillis: 10000, // Начальная задержка для keep-alive (10 секунд) 
      statement_timeout: 30000    // Таймаут для запросов (30 секунд)
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432'),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      database: process.env.PGDATABASE || 'postgres',
      max: 15,
      min: 2,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: false,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      statement_timeout: 30000
    };

// Создаем пул соединений
let pool = new Pool(poolConfig);

// Настраиваем обработчик ошибок соединения
pool.on('error', (err: Error) => {
  console.error('[DB] ❌ Ошибка пула подключений PostgreSQL:', err.message);
  
  // Пытаемся переподключиться при ошибке
  console.log('[DB] 🔄 Попытка автоматического переподключения...');
  
  // Проверяем, связана ли ошибка с разрывом соединения
  if (err.message.includes('connection') || 
      err.message.includes('timeout') || 
      err.message.includes('terminated') ||
      err.message.includes('closed')) {
    
    // Немедленно инициируем проверку подключения и переподключение если нужно
    setTimeout(async () => {
      try {
        console.log('[DB] Проверка состояния подключения после ошибки...');
        const isConnected = await testConnection();
        
        if (!isConnected) {
          console.log('[DB] Соединение не восстановлено, запуск процедуры переподключения...');
          await reconnect();
        } else {
          console.log('[DB] Соединение восстановлено автоматически');
        }
      } catch (reconnectError) {
        console.error('[DB] Ошибка при попытке переподключения:', 
          reconnectError instanceof Error ? reconnectError.message : 'Неизвестная ошибка');
      }
    }, 1000); // Пауза 1 секунда перед повторной попыткой
  }
  
  // Не завершаем процесс, чтобы дать возможность восстановиться
});

// Создаем экземпляр Drizzle ORM
export const db = drizzle(pool, { schema });

// Создаем экземпляр монитора базы данных
const dbMonitor = new DatabaseMonitor(pool, db);

// Запускаем мониторинг подключения к базе данных
dbMonitor.start();

// Экспортируем пул подключений и монитор для использования в других модулях
export { pool, dbMonitor };

/**
 * Проверяет соединение с базой данных с улучшенной обработкой ошибок и таймаутами
 * @returns Promise<boolean> true, если соединение успешно
 */
export async function testConnection(): Promise<boolean> {
  let client = null;
  
  try {
    // Устанавливаем таймаут на получение подключения
    const connectPromise = pool.connect();
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Таймаут при получении соединения')), 5000);
    });
    
    // Используем Promise.race для ограничения времени ожидания
    client = await Promise.race([connectPromise, timeoutPromise]) as PoolClient;
    
    // Проверяем, что клиент получен
    if (!client) {
      throw new Error('Не удалось получить клиент соединения');
    }
    
    // Устанавливаем таймаут на выполнение запроса
    const queryPromise = client.query('SELECT NOW() as current_time');
    const queryTimeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Таймаут при выполнении запроса')), 5000);
    });
    
    // Используем Promise.race для ограничения времени выполнения запроса
    const result = await Promise.race([queryPromise, queryTimeoutPromise]);
    
    // Проверяем результат
    if (result && result.rows && result.rows.length > 0) {
      console.log(`[DB] ✅ Соединение с базой данных работает (время сервера: ${result.rows[0].current_time})`);
      return true;
    } else {
      console.warn('[DB] ⚠️ Соединение с базой данных вернуло пустой результат');
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[DB] ❌ Ошибка при проверке соединения:', errorMessage);
    return false;
  } finally {
    // Освобождаем клиент, если он был получен
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('[DB] Ошибка при освобождении клиента:', 
          releaseError instanceof Error ? releaseError.message : 'Неизвестная ошибка');
      }
    }
  }
}

/**
 * Пытается переподключиться к базе данных с улучшенной обработкой ошибок
 * и постепенным увеличением таймаута между попытками
 * @param attempts Максимальное количество попыток переподключения
 * @returns Promise<boolean> true, если переподключение успешно
 */
export async function reconnect(attempts = 5): Promise<boolean> {
  console.log(`[DB] 🔄 Инициирую процесс переподключения (максимум попыток: ${attempts})...`);
  
  let lastError = null;
  
  for (let i = 0; i < attempts; i++) {
    try {
      // Безопасно закрываем текущий пул соединений с таймаутом
      try {
        const endPromise = pool.end();
        const endTimeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            console.warn('[DB] Таймаут при закрытии пула подключений, продолжаем переподключение');
            resolve();
          }, 5000);
        });
        
        await Promise.race([endPromise, endTimeoutPromise]);
        console.log('[DB] Существующий пул соединений успешно закрыт');
      } catch (endError) {
        console.warn('[DB] Ошибка при закрытии пула соединений (продолжаем):', 
          endError instanceof Error ? endError.message : 'Неизвестная ошибка');
      }
      
      // Небольшая пауза после закрытия соединений
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Создаем новый пул с улучшенными настройками для восстановления
      const reconnectPoolConfig = {
        ...poolConfig,
        connectionTimeoutMillis: 15000, // Увеличиваем таймаут для переподключения
        max: 5,                        // Сначала создаем меньше соединений
        min: 1,                        // Минимум 1 соединение
      };
      
      console.log('[DB] Создание нового пула соединений...');
      const newPool = new Pool(reconnectPoolConfig);
      
      // Проверяем новое соединение с таймаутом
      console.log('[DB] Проверка нового соединения...');
      const connectPromise = newPool.connect();
      const connectTimeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Таймаут подключения к новому пулу')), 10000);
      });
      
      // Используем Promise.race для ограничения времени ожидания
      const client = await Promise.race([connectPromise, connectTimeoutPromise]);
      
      // Проверяем, что клиент получен
      if (!client) {
        throw new Error('Не удалось получить клиент соединения');
      }
      
      // Выполняем проверочный запрос с таймаутом
      const queryPromise = client.query('SELECT NOW() as current_time');
      const queryTimeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Таймаут выполнения проверочного запроса')), 5000);
      });
      
      const result = await Promise.race([queryPromise, queryTimeoutPromise]);
      
      if (client) {
        try {
          client.release();
        } catch (releaseError) {
          console.warn('[DB] Ошибка при освобождении тестового клиента:', 
            releaseError instanceof Error ? releaseError.message : 'Неизвестная ошибка');
        }
      }
      
      // Проверяем результат подключения
      if (result && result.rows && result.rows.length > 0) {
        console.log(`[DB] ✅ Соединение с базой данных успешно восстановлено (время сервера: ${result.rows[0].current_time})`);
        
        // Настраиваем обработчик ошибок для нового пула
        newPool.on('error', (err: Error) => {
          console.error('[DB] ❌ Ошибка пула подключений PostgreSQL:', err.message);
          
          // Обработчик автоматического переподключения при критических ошибках
          if (err.message.includes('connection') || 
              err.message.includes('timeout') || 
              err.message.includes('terminated') ||
              err.message.includes('closed')) {
            
            // Немедленно инициируем проверку
            setTimeout(async () => {
              try {
                console.log('[DB] Проверка состояния подключения после ошибки...');
                const isConnected = await testConnection();
                
                if (!isConnected) {
                  console.log('[DB] Соединение не восстановлено, запуск процедуры переподключения...');
                  await reconnect();
                } else {
                  console.log('[DB] Соединение восстановлено автоматически');
                }
              } catch (reconnectError) {
                console.error('[DB] Ошибка при попытке переподключения:', 
                  reconnectError instanceof Error ? reconnectError.message : 'Неизвестная ошибка');
              }
            }, 1000);
          }
        });
        
        // Обновляем глобальную переменную пула и зависимые объекты
        // @ts-ignore: Прямое присвоение пула
        pool = newPool;
        
        // Обновляем ORM с новым пулом
        // @ts-ignore: Прямое присвоение db
        db = drizzle(pool, { schema });
        
        // Перезапускаем мониторинг с новым подключением
        dbMonitor.stop();
        // @ts-ignore: Создаем новый монитор с новыми соединениями
        dbMonitor = new DatabaseMonitor(pool, db);
        dbMonitor.start();
        
        return true;
      } else {
        throw new Error('Новое соединение вернуло пустой результат');
      }
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error(`[DB] ❌ Ошибка при попытке переподключения ${i+1} из ${attempts}: ${errorMessage}`);
      
      // Ждем перед следующей попыткой с экспоненциальным увеличением таймаута
      if (i < attempts - 1) {
        const delay = 2000 * Math.pow(1.5, i); // Экспоненциальная задержка, начиная с 2 секунд
        const cappedDelay = Math.min(delay, 30000); // Не более 30 секунд
        
        console.log(`[DB] ⏱️ Ожидание ${Math.round(cappedDelay/1000)} секунд перед следующей попыткой...`);
        await new Promise(resolve => setTimeout(resolve, cappedDelay));
      }
    }
  }
  
  const errorMessage = lastError instanceof Error ? lastError.message : 'Неизвестная ошибка';
  console.error(`[DB] ❌ Не удалось переподключиться к базе данных после ${attempts} попыток. Последняя ошибка: ${errorMessage}`);
  
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
// Переименовываем функцию, чтобы избежать конфликта с экспортом
async function executeQueryWithRetry(
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

// Экспортируем функцию для использования в других модулях
export const queryWithRetry = executeQueryWithRetry;

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