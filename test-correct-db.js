/**
 * Тест підключення до ПРАВИЛЬНОЇ бази даних з 13 користувачами
 */

import { Pool } from 'pg';

// ВАША ПРАВИЛЬНА БАЗА з 13 користувачами
const correctDbConfig = {
  connectionString: 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
};

async function testCorrectDatabase() {
  console.log('🔍 Тестую підключення до правильної бази з 13 користувачами...');
  
  const pool = new Pool(correctDbConfig);
  
  try {
    // Перевіряємо кількість користувачів
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(result.rows[0].count);
    
    console.log('✅ Підключення успішне!');
    console.log(`👥 Кількість користувачів: ${userCount}`);
    
    if (userCount === 13) {
      console.log('🎯 ПРАВИЛЬНА БАЗА ПІДТВЕРДЖЕНА!');
    } else {
      console.log('⚠️  Кількість користувачів не збігається з очікуваною (13)');
    }
    
    // Створюємо тестового користувача для підтвердження
    await pool.query(
      'INSERT INTO users (username, telegram_id, ref_code, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
      ['test_correct_db_connection', 777777777, 'CORRECT777']
    );
    
    console.log('✅ Тестовий користувач створений успішно!');
    
    // Перевіряємо нову кількість
    const newResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const newCount = parseInt(newResult.rows[0].count);
    console.log(`👥 Нова кількість користувачів: ${newCount}`);
    
  } catch (error) {
    console.error('❌ Помилка:', error.message);
  } finally {
    await pool.end();
  }
}

testCorrectDatabase();