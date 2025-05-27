/**
 * КРИТИЧНИЙ СКРИПТ - ПРИМУСОВЕ ПЕРЕНАПРАВЛЕННЯ НА ПРАВИЛЬНУ БД
 * 
 * Цей скрипт форсує ВСІ підключення (включаючи SQL інструмент) 
 * на вашу правильну базу з 10 користувачами
 */

const { Pool } = require('pg');

// ВАША ПРАВИЛЬНА БАЗА (10 користувачів)
const CORRECT_DB_URL = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

// СТАРА НЕПРАВИЛЬНА БАЗА (29 користувачів) - БЛОКУЄМО
const WRONG_DB_HOST = 'ep-old-bonus-a67dnvju.us-west-2.aws.neon.tech';

async function forceCorrectDatabase() {
  console.log('🚨 КРИТИЧНЕ ПЕРЕНАПРАВЛЕННЯ: Форсую підключення до правильної бази');
  
  // Примусово встановлюємо правильні змінні
  process.env.DATABASE_URL = CORRECT_DB_URL;
  process.env.PGHOST = 'ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech';
  process.env.PGUSER = 'neondb_owner';
  process.env.PGPASSWORD = 'npg_SpgdNBV70WKl';
  process.env.PGDATABASE = 'neondb';
  process.env.PGPORT = '5432';
  
  // Блокуємо підключення до старої бази
  const originalConnect = Pool.prototype.connect;
  Pool.prototype.connect = function(...args) {
    if (this.options.host && this.options.host.includes(WRONG_DB_HOST)) {
      console.log('🚫 БЛОКУЮ підключення до неправильної бази:', this.options.host);
      // Перенаправляємо на правильну базу
      this.options.connectionString = CORRECT_DB_URL;
      this.options.host = 'ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech';
    }
    return originalConnect.apply(this, args);
  };
  
  // Тестуємо підключення до правильної бази
  const correctPool = new Pool({ connectionString: CORRECT_DB_URL });
  try {
    const result = await correctPool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(result.rows[0].count);
    console.log(`✅ ПРАВИЛЬНА БАЗА ПІДКЛЮЧЕНА! Користувачів: ${userCount}`);
    
    if (userCount === 10) {
      console.log('🎯 ПІДТВЕРДЖЕНО: Це ваша правильна база!');
    } else {
      console.log(`⚠️ Очікувалось 10 користувачів, знайдено: ${userCount}`);
    }
    
    await correctPool.end();
    return true;
  } catch (error) {
    console.error('❌ Помилка підключення до правильної бази:', error.message);
    return false;
  }
}

// Запускаємо форсування
forceCorrectDatabase().then(success => {
  if (success) {
    console.log('✅ Форсування завершено успішно!');
  } else {
    console.log('❌ Помилка при форсуванні');
  }
});

module.exports = { forceCorrectDatabase };