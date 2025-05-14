/**
 * Скрипт для проверки соединения с базой данных Replit PostgreSQL
 * Позволяет убедиться, что все настройки указаны правильно
 * Поддерживает ESM формат package.json с "type": "module"
 */

// Настраиваем переменные окружения
process.env.DATABASE_PROVIDER = 'replit';

// Пытаемся определить, в каком формате запущен скрипт (ESM или CommonJS)
let pg;
try {
  // Сначала пробуем ESM импорт
  pg = await import('pg').then(module => module.default || module);
} catch(e) {
  try {
    // Если не удалось, используем CommonJS
    pg = require('pg');
  } catch(err) {
    console.error('❌ Не удалось импортировать модуль pg');
    console.error(err);
    process.exit(1);
  }
}

// Используем деструктуризацию после определения модуля
const { Pool } = pg;

// Создаем пул соединений для Replit PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Для Replit эти параметры обычно уже установлены в переменных окружения:
  // PGUSER, PGHOST, PGPASSWORD, PGDATABASE, PGPORT
});

async function checkDatabaseConnection() {
  console.log('🔍 Проверка соединения с базой данных Replit PostgreSQL...');
  
  try {
    // Устанавливаем соединение
    const client = await pool.connect();
    
    console.log('✅ Соединение с базой данных успешно установлено');
    console.log('📋 Данные соединения:');
    console.log(`- Хост: ${process.env.PGHOST || 'не указан'}`);
    console.log(`- Порт: ${process.env.PGPORT || 'не указан'}`);
    console.log(`- База данных: ${process.env.PGDATABASE || 'не указана'}`);
    console.log(`- Пользователь: ${process.env.PGUSER || 'не указан'}`);
    console.log(`- URL соединения: ${process.env.DATABASE_URL ? 'настроен' : 'не настроен'}`);
    
    // Получаем информацию о базе данных
    const { rows } = await client.query('SELECT current_database(), current_user, version()');
    console.log('\n📊 Информация о базе данных:');
    console.log(`- Текущая БД: ${rows[0].current_database}`);
    console.log(`- Текущий пользователь: ${rows[0].current_user}`);
    console.log(`- Версия PostgreSQL: ${rows[0].version.split(' ')[1]}`);
    
    // Проверяем наличие таблиц
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📑 Список таблиц в базе данных:');
    if (tables.length === 0) {
      console.log('⚠️ Таблицы не найдены. Необходимо запустить миграцию (npm run db:push)');
    } else {
      tables.forEach((table, index) => {
        console.log(`${index + 1}. ${table.table_name}`);
      });
    }
    
    // Закрываем соединение
    client.release();
  } catch (error) {
    console.error('❌ Ошибка соединения с базой данных:', error.message);
    console.error('📋 Проверьте следующие параметры:');
    console.error('1. DATABASE_URL содержит правильный URL для подключения');
    console.error('2. Переменные PGHOST, PGPORT, PGDATABASE, PGUSER настроены');
    console.error('3. PostgreSQL запущен и доступен');
    console.error('4. Файл server/db.ts содержит правильную конфигурацию для Replit');
    process.exit(1);
  } finally {
    // Закрываем пул соединений
    await pool.end();
  }
}

// Запускаем проверку
checkDatabaseConnection()
  .then(() => {
    console.log('\n✅ Проверка завершена успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Проверка завершена с ошибкой:', error.message);
    process.exit(1);
  });