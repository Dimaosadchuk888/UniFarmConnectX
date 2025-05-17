/**
 * Скрипт для детальной проверки подключения к базе данных и таблиц
 */

import pg from 'pg';
const { Pool } = pg;

// Создание подключения к базе данных
async function createDbConnection() {
  console.log('🔄 Подключение к базе данных...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  return pool;
}

// Вывод информации о подключении
async function showConnectionInfo(pool) {
  console.log('\n📊 Информация о подключении к базе данных:');
  
  try {
    // Вывод текущей базы данных и схемы
    const dbInfoResult = await pool.query('SELECT current_database() as db, current_schema() as schema');
    console.log(`База данных: ${dbInfoResult.rows[0].db}`);
    console.log(`Схема: ${dbInfoResult.rows[0].schema}`);
    
    // Вывод информации о сервере и подключении
    const serverInfoResult = await pool.query('SELECT version()');
    console.log(`Версия PostgreSQL: ${serverInfoResult.rows[0].version}`);
    
    // Вывод параметров подключения
    console.log('\n📋 Параметры подключения:');
    console.log(`PGHOST: ${process.env.PGHOST || 'не указан'}`);
    console.log(`PGPORT: ${process.env.PGPORT || '5432 (по умолчанию)'}`);
    console.log(`PGDATABASE: ${process.env.PGDATABASE || 'не указан'}`);
    console.log(`PGUSER: ${process.env.PGUSER ? '✓ установлен' : 'не указан'}`);
    
    // Информация о DATABASE_URL без показа пароля
    if (process.env.DATABASE_URL) {
      const sanitizedUrl = process.env.DATABASE_URL.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@');
      console.log(`DATABASE_URL: ${sanitizedUrl}`);
    } else {
      console.log('DATABASE_URL: не указан');
    }
  } catch (error) {
    console.error('❌ Ошибка при получении информации о подключении:', error.message);
  }
}

// Список всех схем в базе данных
async function listSchemas(pool) {
  console.log('\n📋 Схемы в текущей базе данных:');
  
  try {
    const result = await pool.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema' ORDER BY schema_name"
    );
    
    if (result.rows.length === 0) {
      console.log('Нет доступных схем (кроме системных)');
    } else {
      result.rows.forEach((row, i) => {
        console.log(`${i+1}. ${row.schema_name}`);
      });
    }
  } catch (error) {
    console.error('❌ Ошибка при получении списка схем:', error.message);
  }
}

// Список всех таблиц в текущей схеме
async function listTables(pool) {
  console.log('\n📋 Таблицы в текущей схеме:');
  
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY table_name"
    );
    
    if (result.rows.length === 0) {
      console.log('Нет доступных таблиц в текущей схеме');
    } else {
      result.rows.forEach((row, i) => {
        console.log(`${i+1}. ${row.table_name}`);
      });
    }
  } catch (error) {
    console.error('❌ Ошибка при получении списка таблиц:', error.message);
  }
}

// Поиск всех таблиц с именем 'users' во всех схемах
async function findUsersTables(pool) {
  console.log('\n🔍 Поиск таблиц с именем "users" во всех схемах:');
  
  try {
    const result = await pool.query(
      "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'users' ORDER BY table_schema"
    );
    
    if (result.rows.length === 0) {
      console.log('Таблиц с именем "users" не найдено ни в одной схеме');
    } else {
      result.rows.forEach((row, i) => {
        console.log(`${i+1}. ${row.table_schema}.${row.table_name}`);
      });
    }
  } catch (error) {
    console.error('❌ Ошибка при поиске таблиц users:', error.message);
  }
}

// Проверка количества записей в таблице users
async function countUsersInAllTables(pool) {
  console.log('\n📊 Количество записей в таблицах users:');
  
  try {
    // Сначала получаем список всех таблиц users
    const tablesResult = await pool.query(
      "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'users' ORDER BY table_schema"
    );
    
    if (tablesResult.rows.length === 0) {
      console.log('Таблиц с именем "users" не найдено');
      return;
    }
    
    // Для каждой таблицы выполняем подсчет записей
    for (const table of tablesResult.rows) {
      const schema = table.table_schema;
      const tableName = table.table_name;
      
      try {
        // Используем параметризованный запрос для безопасного выполнения
        const countResult = await pool.query(
          'SELECT COUNT(*) FROM $1:name.$2:name',
          [schema, tableName]
        );
        console.log(`${schema}.${tableName}: ${countResult.rows[0].count} записей`);
        
        // Выводим первые несколько записей для проверки - также с параметризацией
        const recordsResult = await pool.query(
          'SELECT id, username, ref_code FROM $1:name.$2:name ORDER BY id LIMIT 5',
          [schema, tableName]
        );
        
        console.log(`  Примеры записей:`);
        recordsResult.rows.forEach(row => {
          console.log(`  ID: ${row.id}, Username: ${row.username}, RefCode: ${row.ref_code}`);
        });
      } catch (error) {
        console.error(`❌ Ошибка при подсчете записей в ${schema}.${tableName}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Ошибка при выполнении подсчета записей:', error.message);
  }
}

// Основная функция
async function main() {
  console.log('🚀 Запуск детальной проверки базы данных');
  
  let pool = null;
  try {
    // Подключаемся к базе данных
    pool = await createDbConnection();
    
    // Получаем информацию о подключении
    await showConnectionInfo(pool);
    
    // Выводим список схем
    await listSchemas(pool);
    
    // Выводим список таблиц
    await listTables(pool);
    
    // Ищем таблицы users во всех схемах
    await findUsersTables(pool);
    
    // Проверяем количество записей
    await countUsersInAllTables(pool);
    
    console.log('\n✨ Проверка завершена');
  } catch (error) {
    console.error('❌ Произошла ошибка:', error);
  } finally {
    // Закрываем соединение с базой данных
    if (pool) {
      await pool.end();
      console.log('🔄 Соединение с базой данных закрыто');
    }
  }
}

// Запускаем проверку
main().catch(console.error);