/**
 * Сокращенный тест производительности Neon Database
 */

import { Pool } from 'pg';
import { performance } from 'perf_hooks';

// Создание пула соединений
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

// Измерение времени выполнения запроса
async function measureQuery(name, query, params = []) {
  const start = performance.now();
  try {
    const result = await pool.query(query, params);
    const end = performance.now();
    const duration = (end - start).toFixed(2);
    console.log(`✅ ${name}: ${duration} мс`);
    return { success: true, duration, rowCount: result.rowCount };
  } catch (error) {
    const end = performance.now();
    const duration = (end - start).toFixed(2);
    console.error(`❌ ${name}: ${duration} мс - Ошибка: ${error.message}`);
    return { success: false, duration, error };
  }
}

// Основная функция тестирования
async function runTests() {
  console.log('🚀 Сокращенный тест производительности Neon Database');
  console.log('=======================================================');
  
  try {
    // Тест 1: Простой запрос
    await measureQuery('Простой SELECT 1', 'SELECT 1 as value');
    
    // Тест 2: Подсчет пользователей
    await measureQuery('Подсчет пользователей', 'SELECT COUNT(*) FROM users');
    
    // Тест 3: Получение всех пользователей
    await measureQuery('Получение всех пользователей', 'SELECT * FROM users');
    
    // Тест 4: Поиск по ID (обычно быстрый)
    await measureQuery('Поиск по ID', 'SELECT * FROM users WHERE id = $1', [1]);
    
    // Тест 5: Поиск по другому полю
    await measureQuery('Поиск по username', "SELECT * FROM users WHERE username = $1", ['test_user']);
    
    // Тест 6: Сложный запрос
    await measureQuery('Сложный запрос с вычислениями', `
      SELECT 
        username, 
        balance_uni, 
        balance_ton,
        (balance_uni / 100) as average,
        created_at,
        EXTRACT(DAY FROM created_at) as day
      FROM users
      ORDER BY balance_uni DESC
    `);
    
    // Тест 7: Проверка времени параллельных запросов
    console.log('\n📊 Параллельные запросы (5 одновременно)');
    const parallelStart = performance.now();
    
    await Promise.all([
      pool.query('SELECT * FROM users WHERE id = $1', [1]),
      pool.query('SELECT * FROM users WHERE id = $1', [2]),
      pool.query('SELECT * FROM users WHERE id = $1', [3]),
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT current_timestamp')
    ]);
    
    const parallelEnd = performance.now();
    const parallelDuration = (parallelEnd - parallelStart).toFixed(2);
    console.log(`✅ 5 параллельных запросов: ${parallelDuration} мс`);
    
    // Получение размера базы данных
    console.log('\n📊 Размер базы данных');
    const dbSizeResult = await pool.query(`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as db_size
    `);
    
    console.log(`Размер базы данных: ${dbSizeResult.rows[0].db_size}`);
    
    // Получение статистики по таблицам
    console.log('\n📊 Статистика таблиц');
    const tableStats = await pool.query(`
      SELECT 
        relname as table_name, 
        n_live_tup as row_count,
        pg_size_pretty(pg_relation_size(quote_ident(relname))) as table_size
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 5
    `);
    
    console.log('Топ-5 таблиц по количеству строк:');
    tableStats.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.table_name}: ${row.row_count} строк, размер: ${row.table_size}`);
    });
    
  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error);
  } finally {
    await pool.end();
    console.log('\n✅ Тестирование завершено');
  }
}

runTests().catch(console.error);