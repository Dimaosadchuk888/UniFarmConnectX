/**
 * Скрипт для создания тестового пользователя и проверки записи в Neon DB
 */

import pg from 'pg';
import crypto from 'crypto';
const { Pool } = pg;

// Генерация уникального имени пользователя
function generateUsername() {
  const timestamp = Date.now().toString().slice(-6);
  return `test_user_${timestamp}`;
}

// Генерация уникального реферального кода
function generateRefCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Создание подключения к базе данных
async function createDbConnection() {
  console.log('🔄 Подключение к Neon DB...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  return pool;
}

// Создание тестового пользователя
async function createTestUser(pool) {
  console.log('🔄 Создание тестового пользователя...');
  
  const username = generateUsername();
  const refCode = generateRefCode();
  const now = new Date().toISOString();
  
  try {
    // Создаем пользователя
    const userResult = await pool.query(`
      INSERT INTO users (
        username, 
        telegram_id, 
        ref_code, 
        balance, 
        created_at, 
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [
      username,
      Math.floor(Math.random() * 1000000) + 100000, // случайный telegram_id
      refCode,
      1000, // начальный баланс
      now,
      true
    ]);
    
    const user = userResult.rows[0];
    console.log('✅ Пользователь успешно создан:');
    console.log(`ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Ref Code: ${user.ref_code}`);
    console.log(`Balance: ${user.balance}`);
    console.log(`Created At: ${user.created_at}`);
    
    return user;
  } catch (error) {
    console.error('❌ Ошибка при создании пользователя:', error.message);
    throw error;
  }
}

// Проверка существования пользователя
async function verifyUserExists(pool, userId) {
  console.log(`🔄 Проверка существования пользователя с ID ${userId}...`);
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length > 0) {
      console.log('✅ Пользователь найден в базе данных!');
      return true;
    } else {
      console.log('❌ Пользователь не найден в базе данных!');
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при проверке пользователя:', error.message);
    return false;
  }
}

// Основная функция
async function main() {
  console.log('🚀 Запуск теста создания пользователя в Neon DB');
  
  let pool = null;
  try {
    // Подключаемся к базе данных
    pool = await createDbConnection();
    
    // Проверяем подключение
    const connectionResult = await pool.query('SELECT NOW() as time');
    console.log(`✅ Подключение к базе данных успешно установлено: ${connectionResult.rows[0].time}`);
    
    // Создаем тестового пользователя
    const user = await createTestUser(pool);
    
    // Проверяем, что пользователь создан
    await verifyUserExists(pool, user.id);
    
    console.log('\n✨ Тест успешно завершен! Пользователь создан и подтвержден в Neon DB.');
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

// Запускаем тест
main().catch(console.error);