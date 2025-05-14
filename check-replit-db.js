/**
 * Скрипт для проверки соединения с Replit PostgreSQL
 * 
 * Выполняет проверку соединения с базой данных и возвращает статус
 */

const { Pool } = require('pg');

async function checkDatabaseConnection() {
  console.log('Проверка соединения с Replit PostgreSQL...');
  
  // Получаем значения переменных окружения
  const socketDir = process.env.PGHOST || `${process.env.HOME}/.postgresql/sockets`;
  const database = process.env.PGDATABASE || 'postgres';
  const user = process.env.PGUSER || 'runner';
  const port = process.env.PGPORT || '5432';
  
  // Отображаем информацию о подключении
  console.log('Параметры подключения:');
  console.log(`  PGHOST: ${socketDir}`);
  console.log(`  PGDATABASE: ${database}`);
  console.log(`  PGUSER: ${user}`);
  console.log(`  PGPORT: ${port}`);
  
  // Создаем объект подключения
  const pool = new Pool({
    host: socketDir,
    database,
    user,
    port: parseInt(port),
    // Устанавливаем разумные таймауты для тестирования соединения
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 5000,
  });
  
  try {
    // Попытка подключения
    const client = await pool.connect();
    
    try {
      // Проверяем соединение с помощью простого запроса
      const result = await client.query('SELECT NOW() as time');
      const time = result.rows[0].time;
      
      console.log('Соединение успешно установлено');
      console.log(`Текущее время сервера: ${time}`);
      
      // Проверяем доступные таблицы
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log(`\nДоступные таблицы (${tablesResult.rows.length}):`);
      
      if (tablesResult.rows.length === 0) {
        console.log('  Таблицы не найдены. База данных пустая.');
      } else {
        tablesResult.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. ${row.table_name}`);
        });
      }
      
      return true;
    } finally {
      // Освобождаем соединение
      client.release();
    }
  } catch (error) {
    console.error(`Ошибка подключения к PostgreSQL: ${error.message}`);
    
    // Печатаем расширенную информацию об ошибке
    if (error.code) {
      console.error(`Код ошибки: ${error.code}`);
    }
    
    if (error.stack) {
      console.error('Стек ошибки:');
      console.error(error.stack);
    }
    
    console.log('\nРекомендации по устранению ошибки:');
    console.log('1. Убедитесь, что PostgreSQL запущен (запустите bash ./start-postgres.sh)');
    console.log('2. Проверьте соответствие переменных окружения (PGUSER, PGDATABASE, PGHOST)');
    console.log('3. Проверьте доступность директории сокетов и права доступа');
    
    return false;
  } finally {
    // Закрываем пул соединений
    await pool.end();
  }
}

// Запускаем проверку соединения
checkDatabaseConnection()
  .then((success) => {
    if (success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Непредвиденная ошибка:', error);
    process.exit(1);
  });