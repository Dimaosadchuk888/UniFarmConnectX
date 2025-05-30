/**
 * Скрипт для выполнения полной синхронизации базы данных
 */

import { readFileSync } from 'fs';
import { Pool } from 'pg';

// Используем настройки подключения из переменных окружения
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log('🚀 Запуск синхронизации базы данных UniFarm...');

async function runDatabaseSync() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5
  });

  try {
    console.log('📝 Подключение к базе данных...');
    
    // Проверяем подключение
    const client = await pool.connect();
    const testResult = await client.query('SELECT current_database(), current_user');
    console.log(`✅ Подключено к базе: ${testResult.rows[0].current_database} как ${testResult.rows[0].current_user}`);
    client.release();

    // Читаем SQL файл
    console.log('📖 Чтение SQL скрипта синхронизации...');
    const sqlContent = readFileSync('./database-sync.sql', 'utf8');
    
    // Разбиваем на отдельные команды
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📊 Найдено ${commands.length} SQL команд для выполнения`);

    // Выполняем команды по одной
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      try {
        await pool.query(command + ';');
        successCount++;
        
        // Выводим прогресс каждые 10 команд
        if ((i + 1) % 10 === 0) {
          console.log(`⏳ Выполнено ${i + 1}/${commands.length} команд...`);
        }
      } catch (error) {
        errorCount++;
        console.warn(`⚠️ Ошибка в команде ${i + 1}: ${error.message.substring(0, 100)}...`);
        
        // Некоторые ошибки можно игнорировать (например, уже существующие таблицы)
        if (!error.message.includes('already exists') && 
            !error.message.includes('does not exist') &&
            !error.message.includes('duplicate key')) {
          console.error(`❌ Критическая ошибка: ${error.message}`);
        }
      }
    }

    console.log('\n📈 Результаты синхронизации:');
    console.log(`✅ Успешно выполнено: ${successCount} команд`);
    console.log(`⚠️ Ошибок: ${errorCount} команд`);

    // Проверяем созданные таблицы
    console.log('\n📋 Проверка созданных таблиц...');
    const tablesResult = await pool.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns 
              WHERE table_name = t.table_name AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('\n🗂️ Созданные таблицы:');
    tablesResult.rows.forEach(row => {
      console.log(`   📁 ${row.table_name} (${row.column_count} колонок)`);
    });

    // Проверяем количество пользователей
    try {
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log(`\n👥 Пользователей в базе: ${userCount.rows[0].count}`);
    } catch (error) {
      console.log('ℹ️ Таблица users пуста или недоступна');
    }

    console.log('\n🎉 Синхронизация базы данных завершена!');

  } catch (error) {
    console.error('❌ Ошибка синхронизации:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Запускаем синхронизацию
runDatabaseSync()
  .then(() => {
    console.log('✨ Процесс завершен успешно');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Фатальная ошибка:', error);
    process.exit(1);
  });