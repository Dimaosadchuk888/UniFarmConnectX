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

// Выводим полный DATABASE_URL для диагностики
const dbUrl = process.env.DATABASE_URL;
console.log('🔍 [DB ДИАГНОСТИКА] DATABASE_URL полный:', dbUrl);

// Извлекаем имя базы данных из URL
const urlMatch = dbUrl.match(/ep-([^-]+)-([^-]+)-([^.]+)/);
if (urlMatch) {
  console.log('🔍 [DB ДИАГНОСТИКА] Извлеченная база:', urlMatch[0]);
} else {
  console.log('🔍 [DB ДИАГНОСТИКА] Не удалось извлечь имя базы из URL');
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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