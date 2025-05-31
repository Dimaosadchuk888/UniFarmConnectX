import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from '../config';
import * as schema from '../../shared/schema';

let db: any = null;

export async function initDatabase() {
  try {
    if (!config.database.url) {
      throw new Error('DATABASE_URL не найден в переменных окружения');
    }

    const sql = neon(config.database.url);
    db = drizzle(sql, { schema });

    console.log('✅ База данных подключена успешно');
    return db;
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error);
    throw error;
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('База данных не инициализирована. Вызовите initDatabase() сначала.');
  }
  return db;
}

export { db };
export default db;