/**
 * Тест исправленного подключения к базе данных
 */

import { pool } from './core/db.ts';

async function testFixedDatabase() {
  try {
    console.log('Тестирование исправленного подключения...');
    
    const result = await pool.query(`
      SELECT 
        current_database() as db_name,
        current_schema() as schema_name,
        count(*) as table_count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const info = result.rows[0];
    console.log(`База данных: ${info.db_name}`);
    console.log(`Схема: ${info.schema_name}`);
    console.log(`Таблиц: ${info.table_count}`);
    
    // Список таблиц
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Таблицы:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    return { success: true, database: info.db_name, tables: info.table_count };
    
  } catch (error) {
    console.log(`Ошибка: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

testFixedDatabase()
  .then(result => {
    if (result.success) {
      console.log('\nПодключение к базе данных работает корректно');
    } else {
      console.log('\nТребуется дополнительная настройка');
    }
    process.exit(result.success ? 0 : 1);
  });