/**
 * Тест подключения к production базе данных ep-lucky-boat-a463bggt
 * Проверяет фактическое подключение и регистрацию пользователя
 */

const { Client } = require('pg');

// Прямое подключение к production базе
const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function testProductionDatabase() {
  const client = new Client({ connectionString: PRODUCTION_DB_URL });
  
  try {
    console.log('🔌 Подключение к production базе ep-lucky-boat-a463bggt...');
    await client.connect();
    
    // 1. Проверяем общее количество пользователей
    const countResult = await client.query('SELECT COUNT(*) FROM users;');
    console.log('📊 Общее количество пользователей в production базе:', countResult.rows[0].count);
    
    // 2. Регистрируем тестового пользователя
    const testTelegramId = 777000999;
    const testUsername = 'prod_test_check';
    const testRefCode = generateRefCode(testTelegramId);
    
    console.log('🧪 Регистрируем тестового пользователя:', {
      telegram_id: testTelegramId,
      username: testUsername,
      ref_code: testRefCode
    });
    
    const insertResult = await client.query(
      `INSERT INTO users (telegram_id, username, ref_code, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING id, telegram_id, username, ref_code, created_at`,
      [testTelegramId, testUsername, testRefCode]
    );
    
    const newUser = insertResult.rows[0];
    console.log('✅ Пользователь успешно создан в production базе:', {
      id: newUser.id,
      telegram_id: newUser.telegram_id,
      username: newUser.username,
      ref_code: newUser.ref_code,
      created_at: newUser.created_at
    });
    
    // 3. Проверяем ID - должен быть >= 18 для production базы
    if (newUser.id < 18) {
      console.log('⚠️ ВНИМАНИЕ: ID пользователя < 18, возможно это не production база!');
    } else {
      console.log('✅ ID пользователя >= 18, подтверждена работа с production базой');
    }
    
    // 4. Удаляем тестовую запись
    await client.query('DELETE FROM users WHERE telegram_id = $1', [testTelegramId]);
    console.log('🗑️ Тестовая запись удалена');
    
    // 5. Финальная проверка количества
    const finalCountResult = await client.query('SELECT COUNT(*) FROM users;');
    console.log('📊 Финальное количество пользователей:', finalCountResult.rows[0].count);
    
    console.log('🎉 Тест завершен успешно - работаем с production базой ep-lucky-boat-a463bggt');
    
  } catch (error) {
    console.error('❌ Ошибка подключения к production базе:', error.message);
  } finally {
    await client.end();
  }
}

function generateRefCode(telegramId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const seed = telegramId.toString();
  
  for (let i = 0; i < 8; i++) {
    const index = (seed.charCodeAt(i % seed.length) + i) % chars.length;
    result += chars[index];
  }
  
  return result;
}

// Запускаем тест
testProductionDatabase().catch(console.error);