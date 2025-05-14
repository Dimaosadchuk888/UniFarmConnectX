import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

// Проверяем наличие переменных окружения для подключения к PostgreSQL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL не установлен. Используйте start-postgres.sh для запуска PostgreSQL на Replit."
  );
}

// Создаем пул соединений с базой данных
const pool = new Pool({
  user: process.env.PGUSER || 'runner',
  host: process.env.PGSOCKET || process.env.HOME + '/.postgresql/sockets',
  database: process.env.PGDATABASE || 'postgres',
  password: process.env.PGPASSWORD || '',
  port: parseInt(process.env.PGPORT || '5432'),
  max: 10, // максимальное количество клиентов в пуле
  idleTimeoutMillis: 30000, // время ожидания перед закрытием неиспользуемых соединений
  connectionTimeoutMillis: 5000, // время ожидания при подключении нового клиента
});

// Устанавливаем обработчики событий для пула соединений
pool.on('error', (err) => {
  console.error('Произошла ошибка пула PostgreSQL:', err.message);
  console.error(err.stack);
});

pool.on('connect', () => {
  console.log('Новое соединение с PostgreSQL установлено');
});

// Создаем экземпляр Drizzle с нашей схемой
export const db = drizzle(pool, { schema });

// Экспортируем пул и состояние для совместимости с db-selector-new.ts
export { pool };
export const dbState = {
  pool: pool,
  db: db
};

// Функция для тестирования соединения с базой данных
export async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW() as time');
    return {
      success: true,
      timestamp: result.rows[0].time,
      message: 'Соединение с PostgreSQL успешно установлено'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Ошибка соединения с PostgreSQL: ${error.message}`
    };
  }
}

// Функция для выполнения SQL-запросов напрямую
export async function query(text: string, params?: any[]) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error: any) {
    console.error(`Ошибка выполнения запроса: ${text}`, error);
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
      console.error(`Попытка ${attempt + 1}/${retries} не удалась: ${error.message}`);
      
      if (attempt < retries - 1) {
        console.log(`Повторная попытка через ${delay}мс...`);
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
  
  // Обновляем статус соединения
  async update() {
    this.lastConnectionAttempt = new Date();
    try {
      await pool.query('SELECT 1');
      this.isConnected = true;
      this.error = null;
    } catch (error: any) {
      this.isConnected = false;
      this.error = error;
    }
    return this.isConnected;
  }
};

// Инициализируем статус соединения
dbConnectionStatus.update().then((isConnected) => {
  if (isConnected) {
    console.log('✅ Соединение с PostgreSQL успешно установлено при запуске');
  } else {
    console.error('❌ Не удалось установить соединение с PostgreSQL при запуске');
    console.error('Ошибка:', dbConnectionStatus.error?.message);
  }
});

export default db;