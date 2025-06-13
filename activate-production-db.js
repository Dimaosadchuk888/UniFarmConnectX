/**
 * Production Database Activation Script
 * Активирует подключение к production базе данных ep-lucky-boat-a463bggt
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Production database connection string
const PRODUCTION_DATABASE_URL = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function testProductionDatabase() {
  console.log('🔍 Тестирование подключения к production базе данных...');
  console.log('📍 Endpoint: ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech');
  
  const pool = new Pool({ 
    connectionString: PRODUCTION_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    console.log('🔌 Подключение к базе данных...');
    const client = await pool.connect();
    
    // Test basic query
    console.log('📊 Выполнение тестового запроса...');
    const result = await client.query('SELECT version()');
    console.log('✅ PostgreSQL версия:', result.rows[0].version.substring(0, 50) + '...');
    
    // Test users table
    console.log('👥 Проверка таблицы users...');
    const usersCount = await client.query('SELECT COUNT(*) as total FROM users');
    console.log('✅ Количество пользователей в базе:', usersCount.rows[0].total);
    
    // Test sample user data
    console.log('🔍 Получение образца данных пользователей...');
    const sampleUsers = await client.query('SELECT id, telegram_id, username FROM users LIMIT 3');
    console.log('✅ Образец пользователей:', sampleUsers.rows);
    
    client.release();
    await pool.end();
    
    console.log('✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    console.log('🎯 Production база данных ep-lucky-boat-a463bggt активна и работает!');
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к production базе:', error.message);
    await pool.end();
    return false;
  }
}

// Set environment variables
process.env.DATABASE_URL = PRODUCTION_DATABASE_URL;
process.env.PGHOST = 'ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech';
process.env.PGUSER = 'neondb_owner';
process.env.PGPASSWORD = 'npg_SpgdNBV70WKl';
process.env.PGDATABASE = 'neondb';
process.env.PGPORT = '5432';

console.log('🚀 Активация production базы данных UniFarm');
console.log('🔄 Установка переменных окружения...');
console.log('DATABASE_URL:', process.env.DATABASE_URL.substring(0, 60) + '...');

testProductionDatabase().then(success => {
  if (success) {
    console.log('\n🎉 ЗАДАЧА T7 ВЫПОЛНЕНА УСПЕШНО!');
    console.log('✅ Production база данных ep-lucky-boat-a463bggt подключена');
    console.log('✅ Тестовые запросы выполнены успешно');
    console.log('✅ Переменные окружения обновлены');
    process.exit(0);
  } else {
    console.log('\n❌ Не удалось подключиться к production базе');
    process.exit(1);
  }
});