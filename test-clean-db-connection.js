/**
 * Тест чистого подключения к базе данных
 * Проверяет работу с единственным DATABASE_URL
 */

import { pool, db, checkDatabaseConnection } from './core/db.js';

async function testDatabaseConnection() {
  console.log('🔌 Тестирование подключения к базе данных...');
  
  try {
    // Тест базового подключения
    const healthCheck = await checkDatabaseConnection();
    console.log('Статус подключения:', healthCheck.connected ? '✅ Подключено' : '❌ Ошибка');
    
    if (!healthCheck.connected) {
      console.error('Ошибка:', healthCheck.error);
      return;
    }

    // Получаем информацию о базе данных
    const dbInfo = await pool.query(`
      SELECT 
        current_database() as database_name,
        inet_server_addr() as server_address,
        version() as postgres_version,
        current_user as current_user
    `);

    const info = dbInfo.rows[0];
    console.log('\n📊 Информация о базе данных:');
    console.log('База данных:', info.database_name);
    console.log('Адрес сервера:', info.server_address || 'localhost');
    console.log('Пользователь:', info.current_user);
    console.log('Версия PostgreSQL:', info.postgres_version.split(',')[0]);

    // Проверяем наличие таблицы users
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);

    if (tablesCheck.rows.length > 0) {
      console.log('\n✅ Таблица users найдена');
      
      // Проверяем структуру таблицы users
      const usersStructure = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Структура таблицы users:');
      usersStructure.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
      
    } else {
      console.log('\n⚠️ Таблица users не найдена, создаем базовую структуру...');
      
      // Создаем основные таблицы
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          telegram_id BIGINT UNIQUE NOT NULL,
          username TEXT,
          first_name TEXT,
          last_name TEXT,
          language_code TEXT DEFAULT 'en',
          is_premium BOOLEAN DEFAULT FALSE,
          uni_balance DECIMAL(15,2) DEFAULT 0,
          ton_balance DECIMAL(15,8) DEFAULT 0,
          mining_power INTEGER DEFAULT 100,
          ref_code TEXT UNIQUE,
          parent_ref_code TEXT,
          referrals_count INTEGER DEFAULT 0,
          total_earned DECIMAL(15,2) DEFAULT 0,
          last_claim TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      console.log('✅ Таблица users создана');
    }

    // Тест простой записи и чтения
    console.log('\n🧪 Тест операций с базой данных...');
    
    const testResult = await pool.query('SELECT NOW() as current_time, 1 + 1 as test_calc');
    console.log('Текущее время:', testResult.rows[0].current_time);
    console.log('Тест вычислений:', testResult.rows[0].test_calc);
    
    console.log('\n✅ Все тесты пройдены успешно!');
    console.log('🎯 База данных готова к работе');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  } finally {
    await pool.end();
  }
}

testDatabaseConnection();