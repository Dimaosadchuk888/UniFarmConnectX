/**
 * Скрипт для тестирования производительности запросов к Neon Database
 */

import { Pool } from 'pg';
import { performance } from 'perf_hooks';

// Создание пула соединений с оптимальными настройками
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  max: 20 // Максимальное количество одновременных подключений
});

// Вспомогательные функции для тестирования

// Измерение времени выполнения запроса
async function measureQueryTime(name, queryFn) {
  const start = performance.now();
  try {
    const result = await queryFn();
    const end = performance.now();
    const duration = (end - start).toFixed(2);
    console.log(`✅ ${name}: ${duration} мс`);
    return { success: true, duration, result };
  } catch (error) {
    const end = performance.now();
    const duration = (end - start).toFixed(2);
    console.error(`❌ ${name}: ${duration} мс - Ошибка: ${error.message}`);
    return { success: false, duration, error };
  }
}

// Форматирование числа запросов в секунду
function formatQPS(count, durationMs) {
  const qps = (count / (durationMs / 1000)).toFixed(2);
  return `${qps} запросов/сек`;
}

// Тестовые запросы
async function runPerformanceTests() {
  console.log('🚀 Запуск тестирования производительности Neon Database');
  console.log('=======================================================');
  
  try {
    // Тест 1: Простой запрос SELECT 1
    await measureQueryTime('Простой SELECT 1', async () => {
      const result = await pool.query('SELECT 1 as value');
      return result.rows[0].value;
    });
    
    // Тест 2: Получение количества пользователей
    const countTest = await measureQueryTime('Подсчет пользователей', async () => {
      const result = await pool.query('SELECT COUNT(*) FROM users');
      return result.rows[0].count;
    });
    
    console.log(`📊 Всего пользователей: ${countTest.result}`);
    
    // Тест 3: Выборка всех пользователей
    const allUsersTest = await measureQueryTime('Получение всех пользователей', async () => {
      const result = await pool.query('SELECT * FROM users');
      return result.rows.length;
    });
    
    console.log(`📊 Получено ${allUsersTest.result} пользователей`);
    
    // Тест 4: Получение пользователя по ID
    await measureQueryTime('Поиск пользователя по ID', async () => {
      const result = await pool.query('SELECT * FROM users WHERE id = 1');
      return result.rows.length;
    });
    
    // Тест 5: Поиск пользователя по username (без индекса)
    await measureQueryTime('Поиск пользователя по username', async () => {
      const result = await pool.query("SELECT * FROM users WHERE username = 'test_user'");
      return result.rows.length;
    });
    
    // Тест 6: Поиск пользователя по ref_code (мог бы быть индекс)
    await measureQueryTime('Поиск пользователя по ref_code', async () => {
      const result = await pool.query("SELECT * FROM users WHERE ref_code = 'TEST1234'");
      return result.rows.length;
    });
    
    // Тест 7: Соединение таблиц (JOIN)
    await measureQueryTime('JOIN запрос (пользователи и рефералы)', async () => {
      const result = await pool.query(`
        SELECT u.id, u.username, u.ref_code, COUNT(r.id) as referral_count
        FROM users u
        LEFT JOIN referrals r ON u.ref_code = r.parent_ref_code
        GROUP BY u.id, u.username, u.ref_code
        LIMIT 10
      `);
      return result.rows.length;
    });
    
    // Тест 8: Тест производительности при последовательных запросах
    console.log('\n📊 Тест производительности последовательных запросов');
    const sequentialCount = 10;
    const sequentialStart = performance.now();
    
    for (let i = 0; i < sequentialCount; i++) {
      await pool.query('SELECT * FROM users WHERE id = $1', [1]);
    }
    
    const sequentialEnd = performance.now();
    const sequentialDuration = (sequentialEnd - sequentialStart).toFixed(2);
    console.log(`✅ ${sequentialCount} последовательных запросов: ${sequentialDuration} мс (${formatQPS(sequentialCount, sequentialDuration)})`);
    
    // Тест 9: Тест производительности при параллельных запросах
    console.log('\n📊 Тест производительности параллельных запросов');
    const parallelCount = 10;
    const parallelStart = performance.now();
    
    await Promise.all(
      Array.from({ length: parallelCount }).map((_, i) => 
        pool.query('SELECT * FROM users WHERE id = $1', [i % 8 + 1])
      )
    );
    
    const parallelEnd = performance.now();
    const parallelDuration = (parallelEnd - parallelStart).toFixed(2);
    console.log(`✅ ${parallelCount} параллельных запросов: ${parallelDuration} мс (${formatQPS(parallelCount, parallelDuration)})`);
    
    // Тест 10: Проверка индексов в базе данных
    console.log('\n📊 Проверка существующих индексов');
    const indexesResult = await pool.query(`
      SELECT 
        i.relname as index_name,
        t.relname as table_name,
        a.attname as column_name
      FROM
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_attribute a
      WHERE
        t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND t.relname IN ('users', 'referrals', 'transactions')
      ORDER BY
        t.relname,
        i.relname
    `);
    
    console.log('Найденные индексы:');
    if (indexesResult.rows.length === 0) {
      console.log('Индексы не найдены');
    } else {
      const indexesByTable = {};
      
      indexesResult.rows.forEach(row => {
        if (!indexesByTable[row.table_name]) {
          indexesByTable[row.table_name] = {};
        }
        
        if (!indexesByTable[row.table_name][row.index_name]) {
          indexesByTable[row.table_name][row.index_name] = [];
        }
        
        indexesByTable[row.table_name][row.index_name].push(row.column_name);
      });
      
      for (const tableName in indexesByTable) {
        console.log(`\nТаблица: ${tableName}`);
        
        for (const indexName in indexesByTable[tableName]) {
          const columns = indexesByTable[tableName][indexName].join(', ');
          console.log(`  ${indexName}: ${columns}`);
        }
      }
    }
    
    // Тест 11: Проверка размера таблиц
    console.log('\n📊 Размер таблиц');
    const tableSizesResult = await pool.query(`
      SELECT
        table_name,
        pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as total_size,
        pg_size_pretty(pg_relation_size(quote_ident(table_name))) as table_size,
        pg_size_pretty(pg_total_relation_size(quote_ident(table_name)) - pg_relation_size(quote_ident(table_name))) as index_size
      FROM
        information_schema.tables
      WHERE
        table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY
        pg_total_relation_size(quote_ident(table_name)) DESC
      LIMIT 10
    `);
    
    console.log('Топ-10 таблиц по размеру:');
    tableSizesResult.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.table_name}: общий размер = ${row.total_size}, данные = ${row.table_size}, индексы = ${row.index_size}`);
    });
    
    console.log('\n✅ Тестирование производительности завершено!');
    
  } catch (error) {
    console.error('\n❌ Ошибка при тестировании производительности:', error.message);
  } finally {
    await pool.end();
    console.log('🔄 Соединение с базой данных закрыто');
  }
}

// Запуск тестирования
runPerformanceTests().catch(err => {
  console.error('Неперехваченная ошибка:', err);
});