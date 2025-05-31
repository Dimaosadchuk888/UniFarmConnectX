/**
 * ТЕСТОВИЙ СКРИПТ ДЛЯ ПОВНОЇ ДІАГНОСТИКИ TELEGRAM РЕЄСТРАЦІЇ
 * 
 * Цей скрипт симулює процес реєстрації Telegram користувача і відстежує
 * весь ланцюжок збереження даних: API → Controller → Service → Neon DB
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Завантажуємо змінні середовища
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

console.log('🚀 [TELEGRAM DIAGNOSIS] Запуск повної діагностики системи реєстрації');

/**
 * Симулює реальні дані Telegram користувача
 */
function generateTestTelegramData() {
  const testUserId = Math.floor(Math.random() * 1000000) + 100000;
  const testUsername = `test_user_${Date.now()}`;
  
  return {
    initData: {
      user: {
        id: testUserId,
        username: testUsername,
        first_name: `TestUser`,
        last_name: `Telegram`,
        language_code: 'uk'
      }
    },
    telegram_id: testUserId,
    username: testUsername,
    first_name: 'TestUser',
    last_name: 'Telegram'
  };
}

/**
 * Тестує API endpoint реєстрації
 */
async function testRegistrationAPI() {
  console.log('\n📋 [API TEST] Тестуємо /api/register/telegram endpoint...');
  
  const testData = generateTestTelegramData();
  console.log('[API TEST] Генеровані тестові дані:', {
    telegramId: testData.telegram_id,
    username: testData.username,
    hasInitData: !!testData.initData
  });
  
  try {
    const response = await fetch('http://localhost:5000/api/register/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`[API TEST] Відповідь сервера: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('[API TEST] ✅ Успішна реєстрація через API:', {
        success: result.success,
        userId: result.user?.id,
        telegramId: result.user?.telegram_id,
        username: result.user?.username,
        refCode: result.user?.referralCode
      });
      return result.user;
    } else {
      const errorText = await response.text();
      console.error('[API TEST] ❌ Помилка API:', errorText);
      return null;
    }
  } catch (error) {
    console.error('[API TEST] ❌ Помилка мережі:', error.message);
    return null;
  }
}

/**
 * Перевіряє збереження в Neon DB
 */
async function verifyNeonDBStorage(userId, telegramId) {
  console.log('\n🗄️ [DB VERIFY] Перевіряємо збереження в Neon DB...');
  
  try {
    // Динамічний імпорт для роботи з БД
    const { execute_sql_query } = await import('./execute-sql-direct.js');
    
    const checkQuery = `
      SELECT id, username, telegram_id, ref_code, created_at, balance_uni, balance_ton
      FROM users 
      WHERE telegram_id = $1 OR id = $2
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await execute_sql_query(checkQuery, [telegramId, userId]);
    
    if (result && result.length > 0) {
      const user = result[0];
      console.log('[DB VERIFY] ✅ Користувач знайдений в Neon DB:', {
        id: user.id,
        username: user.username,
        telegramId: user.telegram_id,
        refCode: user.ref_code,
        createdAt: user.created_at,
        balanceUni: user.balance_uni,
        balanceTon: user.balance_ton
      });
      return true;
    } else {
      console.error('[DB VERIFY] ❌ Користувач НЕ знайдений в Neon DB');
      return false;
    }
  } catch (error) {
    console.error('[DB VERIFY] ❌ Помилка перевірки БД:', error.message);
    return false;
  }
}

/**
 * Перевіряє загальну статистику користувачів в Neon
 */
async function checkNeonStatistics() {
  console.log('\n📊 [DB STATS] Перевіряємо загальну статистику Neon DB...');
  
  try {
    const { execute_sql_query } = await import('./execute-sql-direct.js');
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN telegram_id IS NOT NULL THEN 1 END) as telegram_users,
        COUNT(CASE WHEN guest_id IS NOT NULL THEN 1 END) as guest_users,
        MAX(created_at) as last_registration
      FROM users
    `;
    
    const result = await execute_sql_query(statsQuery);
    
    if (result && result.length > 0) {
      const stats = result[0];
      console.log('[DB STATS] 📈 Статистика Neon DB:', {
        totalUsers: stats.total_users,
        telegramUsers: stats.telegram_users,
        guestUsers: stats.guest_users,
        lastRegistration: stats.last_registration
      });
      
      // Показуємо останніх 3 користувачів
      const recentQuery = `
        SELECT id, username, telegram_id, ref_code, created_at
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 3
      `;
      
      const recentUsers = await execute_sql_query(recentQuery);
      console.log('[DB STATS] 🕒 Останні зареєстровані користувачі:');
      recentUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user.id}, Username: ${user.username}, Telegram ID: ${user.telegram_id}, Created: ${user.created_at}`);
      });
      
      return true;
    }
  } catch (error) {
    console.error('[DB STATS] ❌ Помилка отримання статистики:', error.message);
    return false;
  }
}

/**
 * Основна функція діагностики
 */
async function runFullDiagnosis() {
  console.log('🎯 [TELEGRAM DIAGNOSIS] Початок повної діагностики системи реєстрації\n');
  
  try {
    // 1. Перевіряємо загальну статистику
    await checkNeonStatistics();
    
    // 2. Тестуємо API реєстрації
    const registeredUser = await testRegistrationAPI();
    
    if (registeredUser) {
      // 3. Перевіряємо збереження в БД
      const isStoredInDB = await verifyNeonDBStorage(
        registeredUser.id, 
        registeredUser.telegram_id
      );
      
      // 4. Фінальний звіт
      console.log('\n🎯 [FINAL REPORT] Результати діагностики:');
      console.log(`✅ API реєстрація: ${registeredUser ? 'ПРАЦЮЄ' : 'НЕ ПРАЦЮЄ'}`);
      console.log(`✅ Збереження в Neon DB: ${isStoredInDB ? 'ПРАЦЮЄ' : 'НЕ ПРАЦЮЄ'}`);
      
      if (registeredUser && isStoredInDB) {
        console.log('\n🎉 [SUCCESS] Система реєстрації Telegram користувачів працює коректно!');
        console.log('Користувачі успішно зберігаються в Neon DB з правильними telegram_id та іменами.');
      } else {
        console.log('\n⚠️ [WARNING] Виявлені проблеми в системі реєстрації.');
      }
    } else {
      console.log('\n❌ [ERROR] Не вдалося протестувати API реєстрації.');
    }
    
  } catch (error) {
    console.error('\n💥 [FATAL ERROR] Критична помилка під час діагностики:', error);
  }
}

// Створюємо простий SQL executor
async function createSQLExecutor() {
  const sqlExecutorContent = `
import pkg from 'pg';
const { Client } = pkg;

export async function execute_sql_query(query, params = []) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('SQL Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}
`;

  // Записуємо допоміжний файл
  const fs = await import('fs');
  fs.writeFileSync('./execute-sql-direct.js', sqlExecutorContent);
}

// Запускаємо діагностику
(async () => {
  try {
    await createSQLExecutor();
    await runFullDiagnosis();
  } catch (error) {
    console.error('Помилка запуску діагностики:', error);
  }
})();