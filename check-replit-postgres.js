/**
 * Проверка соединения с Replit PostgreSQL
 * 
 * Этот скрипт пытается обнаружить и подключиться к PostgreSQL на Replit,
 * используя новые переменные окружения, установленные create_postgresql_database_tool.
 */

import { execSync } from 'child_process';
import pg from 'pg';
const { Pool } = pg;

// Получаем переменные окружения для Replit PostgreSQL из файла
try {
  console.log('Проверка наличия файла .replit/data/postgresql.env...');
  
  // Пробуем выполнить команду шелла для чтения файла с переменными окружения
  const result = execSync('cat ~/.replit/data/postgresql.env 2>/dev/null || echo "File not found"', { encoding: 'utf-8' });
  
  if (result.includes('File not found')) {
    console.error('Не найден файл с настройками PostgreSQL. Возможно, база данных не создана.');
    process.exit(1);
  }
  
  console.log('Файл найден, чтение переменных окружения...');
  
  // Парсим переменные окружения из файла
  const envVars = {};
  const lines = result.split('\n').filter(line => line.trim() !== '');
  
  for (const line of lines) {
    if (line.includes('=')) {
      const [key, value] = line.split('=');
      envVars[key.trim()] = value.trim();
    }
  }
  
  console.log('Найденные переменные окружения:');
  for (const key in envVars) {
    const value = key === 'PGPASSWORD' ? '***' : envVars[key];
    console.log(`${key}: ${value}`);
  }
  
  // Проверяем, есть ли все необходимые переменные
  const required = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'DATABASE_URL'];
  const missing = required.filter(key => !envVars[key]);
  
  if (missing.length > 0) {
    console.error(`Отсутствуют переменные окружения: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  // Пытаемся подключиться к базе данных
  console.log('Попытка подключения к Replit PostgreSQL...');
  
  const pool = new Pool({
    host: envVars.PGHOST,
    port: envVars.PGPORT,
    user: envVars.PGUSER,
    password: envVars.PGPASSWORD,
    database: envVars.PGDATABASE,
    ssl: false
  });
  
  pool.query('SELECT current_database(), current_user, inet_server_addr(), inet_server_port()')
    .then(result => {
      const { current_database, current_user, inet_server_addr, inet_server_port } = result.rows[0];
      console.log('Успешное подключение к Replit PostgreSQL!');
      console.log(`База данных: ${current_database}`);
      console.log(`Пользователь: ${current_user}`);
      console.log(`Адрес сервера: ${inet_server_addr}`);
      console.log(`Порт сервера: ${inet_server_port}`);
      
      console.log('\nПроверка таблиц...');
      return pool.query('\dt');
    })
    .then(result => {
      if (result.rows.length === 0) {
        console.log('Таблицы отсутствуют. База данных пуста.');
      } else {
        console.log('Найденные таблицы:');
        for (const row of result.rows) {
          console.log(`- ${row.schema}.${row.name} (владелец: ${row.owner})`);
        }
      }
      
      // Завершение соединения
      return pool.end();
    })
    .catch(err => {
      console.error('Ошибка при подключении к базе данных:', err.message);
      process.exit(1);
    });
  
} catch (error) {
  console.error('Ошибка при выполнении скрипта:', error.message);
  process.exit(1);
}