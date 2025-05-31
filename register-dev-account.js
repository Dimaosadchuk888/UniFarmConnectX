/**
 * Прямая регистрация аккаунта разработки в базе данных
 */

import { config } from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

config();

const DATABASE_URL = process.env.DATABASE_URL;

async function registerDevAccount() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Регистрация аккаунта разработки...');
    
    // Генерируем уникальные идентификаторы
    const replit_user_id = `replit_dev_${Date.now()}`;
    const guest_id = 'dev-' + Math.random().toString(36).substring(2, 15);
    
    // Создаем пользователя
    const insertUserQuery = `
      INSERT INTO users (
        telegram_id, 
        username, 
        first_name, 
        guest_id, 
        created_at, 
        updated_at,
        balance,
        last_login,
        is_premium
      ) VALUES ($1, $2, $3, $4, NOW(), NOW(), 1000, NOW(), false)
      ON CONFLICT (telegram_id) DO UPDATE SET
        last_login = NOW(),
        updated_at = NOW()
      RETURNING *;
    `;
    
    const userResult = await pool.query(insertUserQuery, [
      replit_user_id,
      'replit_developer',
      'Replit Developer',
      guest_id
    ]);
    
    const user = userResult.rows[0];
    console.log('✅ Пользователь зарегистрирован:', {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      guest_id: user.guest_id,
      balance: user.balance
    });
    
    // Создаем фарминг сессию
    const farmingQuery = `
      INSERT INTO farming_sessions (
        user_id, 
        start_time, 
        last_update, 
        uni_accumulated, 
        is_active,
        rate_per_hour
      ) VALUES ($1, NOW(), NOW(), 0, true, 100)
      ON CONFLICT (user_id) DO UPDATE SET
        last_update = NOW(),
        is_active = true
      RETURNING *;
    `;
    
    const farmingResult = await pool.query(farmingQuery, [user.id]);
    console.log('✅ Фарминг сессия создана');
    
    // Создаем записи для TON Boost
    const tonBoostQuery = `
      INSERT INTO ton_boost_sessions (
        user_id,
        boost_level,
        start_time,
        end_time,
        created_at
      ) VALUES ($1, 1, NOW(), NOW() + INTERVAL '24 hours', NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        start_time = NOW(),
        end_time = NOW() + INTERVAL '24 hours'
      RETURNING *;
    `;
    
    await pool.query(tonBoostQuery, [user.id]);
    console.log('✅ TON Boost активирован');
    
    // Проверяем миссии
    const missionsQuery = `SELECT * FROM missions LIMIT 3`;
    const missionsResult = await pool.query(missionsQuery);
    console.log('✅ Доступно миссий:', missionsResult.rows.length);
    
    console.log('\n🎉 Аккаунт разработки успешно зарегистрирован!');
    console.log('📋 Данные для входа в приложение:');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Telegram ID: ${replit_user_id}`);
    console.log(`   Guest ID: ${guest_id}`);
    console.log(`   Username: replit_developer`);
    console.log(`   Баланс: ${user.balance} UNI`);
    
    return {
      user_id: user.id,
      telegram_id: replit_user_id,
      guest_id: guest_id,
      username: 'replit_developer',
      balance: user.balance
    };
    
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Запуск
registerDevAccount()
  .then((userData) => {
    console.log('\n✅ Регистрация завершена успешно');
    console.log('🔗 Используйте guest_id для входа в приложение:', userData.guest_id);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка:', error.message);
  });