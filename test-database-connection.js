/**
 * Финальный тест подключения к базе данных
 * Проверяет реальное подключение и определяет используемую базу
 */

import { pool } from './core/db.ts';

async function testDatabaseConnection() {
  console.log('🔍 Проверка подключения к базе данных...');
  
  try {
    // Проверка основного подключения
    const basicTest = await pool.query('SELECT 1 as test');
    console.log('✅ Базовое подключение работает');
    
    // Получение информации о базе данных
    const dbInfo = await pool.query(`
      SELECT 
        current_database() as database_name,
        current_schema() as schema_name,
        inet_server_addr() as server_ip,
        version() as pg_version
    `);
    
    const info = dbInfo.rows[0];
    console.log('\n📊 Информация о базе данных:');
    console.log(`   База данных: ${info.database_name}`);
    console.log(`   Схема: ${info.schema_name}`);
    console.log(`   IP сервера: ${info.server_ip}`);
    console.log(`   Версия PostgreSQL: ${info.pg_version.split(' ')[0]} ${info.pg_version.split(' ')[1]}`);
    
    // Проверка переменных окружения
    console.log('\n🔧 Переменные окружения:');
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'установлена' : 'НЕ УСТАНОВЛЕНА'}`);
    console.log(`   PGHOST: ${process.env.PGHOST || 'не установлена'}`);
    console.log(`   PGUSER: ${process.env.PGUSER || 'не установлена'}`);
    console.log(`   PGDATABASE: ${process.env.PGDATABASE || 'не установлена'}`);
    
    // Проверка таблиц
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Таблицы в базе данных:');
    if (tables.rows.length > 0) {
      tables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('   Таблицы не найдены');
    }
    
    // Анализ подключения
    console.log('\n🎯 АНАЛИЗ ПОДКЛЮЧЕНИЯ:');
    
    if (info.database_name === 'neondb') {
      console.log('❌ ПРОБЛЕМА: Система подключается к Neon вместо Supabase!');
      console.log('   Это означает, что переменные PGHOST/PGUSER/PGDATABASE переопределяют DATABASE_URL');
    } else if (info.database_name === 'postgres') {
      console.log('✅ КОРРЕКТНО: Подключение к Supabase PostgreSQL');
    } else {
      console.log(`⚠️  НЕИЗВЕСТНО: Неопознанная база данных "${info.database_name}"`);
    }
    
    return {
      success: true,
      database: info.database_name,
      schema: info.schema_name,
      server_ip: info.server_ip,
      tables_count: tables.rows.length,
      is_neon: info.database_name === 'neondb',
      is_supabase: info.database_name === 'postgres'
    };
    
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await pool.end();
  }
}

// Запуск теста
testDatabaseConnection()
  .then(result => {
    console.log('\n📄 ИТОГОВЫЙ РЕЗУЛЬТАТ:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });