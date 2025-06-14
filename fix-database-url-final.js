/**
 * Формирование правильного DATABASE_URL для рабочей базы данных
 */

console.log('🔧 Создание правильного DATABASE_URL...');

// Используем рабочие параметры подключения
const dbParams = {
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT || 5432
};

console.log(`Хост: ${dbParams.host}`);
console.log(`Пользователь: ${dbParams.user}`);
console.log(`База данных: ${dbParams.database}`);
console.log(`Порт: ${dbParams.port}`);

// Формируем правильный DATABASE_URL
const correctDatabaseUrl = `postgresql://${dbParams.user}:${dbParams.password}@${dbParams.host}:${dbParams.port}/${dbParams.database}?sslmode=require`;

console.log(`\nТекущий DATABASE_URL: ${process.env.DATABASE_URL}`);
console.log(`Правильный DATABASE_URL: ${correctDatabaseUrl}`);

// Устанавливаем правильный URL
process.env.DATABASE_URL = correctDatabaseUrl;

// Тестируем новое подключение
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: correctDatabaseUrl
});

async function testCorrectUrl() {
  try {
    console.log('\n🔍 Тестирование обновленного DATABASE_URL...');
    
    const result = await pool.query(`
      SELECT 
        current_database() as db_name,
        count(*) as table_count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const info = result.rows[0];
    console.log(`✅ Подключение через DATABASE_URL работает!`);
    console.log(`База данных: ${info.db_name}`);
    console.log(`Количество таблиц: ${info.table_count}`);
    
    return {
      success: true,
      database: info.db_name,
      tables: info.table_count,
      url: correctDatabaseUrl
    };
    
  } catch (error) {
    console.log(`❌ Ошибка с DATABASE_URL: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

testCorrectUrl()
  .then(result => {
    console.log('\n📊 РЕЗУЛЬТАТ ИСПРАВЛЕНИЯ DATABASE_URL:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ DATABASE_URL исправлен и работает корректно!');
      console.log('Система готова к использованию единого подключения');
    } else {
      console.log('\n❌ Проблема с новым DATABASE_URL');
    }
    
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Критическая ошибка:', error.message);
    process.exit(1);
  });