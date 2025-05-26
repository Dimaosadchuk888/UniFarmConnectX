/**
 * Скрипт для примусового перемикання на правильну базу даних
 * Використовується коли DATABASE_URL в Secrets не оновлений
 */

// Встановлюємо правильний DATABASE_URL
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

console.log("✅ DATABASE_URL примусово встановлено на правильну базу");
console.log("🎯 Endpoint:", process.env.DATABASE_URL.match(/ep-[^.]*/)[0]);

// Перевіряємо підключення
import pkg from 'pg';
const { Pool } = pkg;

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query('SELECT COUNT(*) as users FROM public.users');
    console.log(`🎉 Підключено! Користувачів у базі: ${result.rows[0].users}`);
    
    if (result.rows[0].users == 4) {
      console.log("✅ УСПІХ! Підключена правильна база з 4 користувачами");
    } else {
      console.log("⚠️ Це досі неправильна база");
    }
  } catch (error) {
    console.error("❌ Помилка підключення:", error.message);
  } finally {
    await pool.end();
  }
}

testConnection();