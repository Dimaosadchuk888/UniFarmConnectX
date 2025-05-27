/**
 * Перевіряю поточного користувача (ID 1) у правильній базі
 */

import { Pool } from 'pg';

const correctDbConfig = {
  connectionString: 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
};

async function checkCurrentUser() {
  console.log('🔍 Перевіряю користувача з ID 1 у правильній Neon DB...');
  
  const pool = new Pool(correctDbConfig);
  
  try {
    // Детальна інформація про користувача з ID 1
    const userInfo = await pool.query(`
      SELECT id, username, telegram_id, ref_code, created_at 
      FROM users 
      WHERE id = 1
    `);
    
    if (userInfo.rows.length > 0) {
      const user = userInfo.rows[0];
      console.log('✅ КОРИСТУВАЧ ЗНАЙДЕНИЙ У ПРАВИЛЬНІЙ БАЗІ:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Telegram ID: ${user.telegram_id}`);
      console.log(`   Реферальний код: ${user.ref_code}`);
      console.log(`   Створений: ${user.created_at}`);
      
      // Перевіряємо додаткові дані
      const additionalInfo = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM transactions WHERE user_id = 1) as transaction_count,
          (SELECT COUNT(*) FROM farming_deposits WHERE user_id = 1) as farming_count
      `);
      
      if (additionalInfo.rows.length > 0) {
        const info = additionalInfo.rows[0];
        console.log(`   Транзакцій: ${info.transaction_count}`);
        console.log(`   Фарминг депозитів: ${info.farming_count}`);
      }
      
    } else {
      console.log('❌ Користувач з ID 1 НЕ ЗНАЙДЕНИЙ');
    }
    
  } catch (error) {
    console.error('❌ Помилка:', error.message);
  } finally {
    await pool.end();
  }
}

checkCurrentUser();