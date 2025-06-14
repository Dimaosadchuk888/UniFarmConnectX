import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

// ДИАГНОСТИКА: Выводим реальный DATABASE_URL для проверки
console.log('🔍 [DB ДИАГНОСТИКА] Запуск core/db.ts');
console.log('🔍 [DB ДИАГНОСТИКА] NODE_ENV:', process.env.NODE_ENV);
console.log('🔍 [DB ДИАГНОСТИКА] REPL_ID:', process.env.REPL_ID);
console.log('🔍 [DB ДИАГНОСТИКА] REPL_SLUG:', process.env.REPL_SLUG);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Используем DATABASE_URL из переменных окружения (правильную базу из Neon Console)
const DATABASE_URL = process.env.DATABASE_URL;

// Выводим диагностику подключения
console.log('🔍 [DB ДИАГНОСТИКА] DATABASE_URL из окружения:', process.env.DATABASE_URL);
console.log('🔍 [DB ДИАГНОСТИКА] Используем базу из переменных окружения:', DATABASE_URL?.substring(0, 60) + '...');

// Извлекаем имя базы данных для подтверждения
const urlMatch = DATABASE_URL?.match(/ep-([^-]+)-([^-]+)-([^.]+)/);
if (urlMatch) {
  console.log('🔍 [DB ДИАГНОСТИКА] Подключаемся к базе:', urlMatch[0]);
} else {
  console.log('🔍 [DB ДИАГНОСТИКА] Ошибка извлечения имени базы');
}

export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Проверяем подключение при старте
async function verifyConnection() {
  try {
    console.log('🔍 [DB ДИАГНОСТИКА] Проверка подключения...');
    const result = await pool.query('SELECT current_user, current_database(), inet_server_addr(), version()');
    console.log('🔍 [DB ДИАГНОСТИКА] Подключение успешно:');
    console.log('  - Пользователь:', result.rows[0].current_user);
    console.log('  - База данных:', result.rows[0].current_database);
    console.log('  - Сервер:', result.rows[0].inet_server_addr);
    console.log('  - Версия PostgreSQL:', result.rows[0].version?.substring(0, 50) + '...');
    
    // Считаем пользователей
    const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log('🔍 [DB ДИАГНОСТИКА] Количество пользователей в таблице users:', countResult.rows[0].count);
  } catch (error) {
    console.error('❌ [DB ДИАГНОСТИКА] Ошибка подключения:', error.message);
  }
}

// Запускаем проверку через 2 секунды после инициализации
setTimeout(verifyConnection, 2000);