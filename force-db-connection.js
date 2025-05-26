/**
 * Примусове встановлення правильних змінних підключення до вашої бази даних
 */

// Встановлюємо правильні змінні для вашої production бази
process.env.PGHOST = "ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech";
process.env.PGUSER = "neondb_owner";
process.env.PGPASSWORD = "npg_SpgdNBV70WKl";
process.env.PGDATABASE = "neondb";
process.env.PGPORT = "5432";
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

console.log("✅ Встановлено правильні змінні для вашої production бази");
console.log("🎯 PGHOST:", process.env.PGHOST);

// Тестуємо підключення
import pkg from 'pg';
const { Pool } = pkg;

async function testConnection() {
  console.log("🔄 Тестуємо підключення до вашої бази...");
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query('SELECT COUNT(*) as users FROM public.users');
    const userCount = result.rows[0].users;
    
    console.log(`🎉 Підключено успішно! Користувачів у базі: ${userCount}`);
    
    if (userCount == 4) {
      console.log("✅ ВІДМІННО! Це ваша правильна production база з 4 користувачами!");
    } else {
      console.log(`⚠️ Це неправильна база. Очікувалося 4 користувачі, а знайдено ${userCount}`);
    }
    
    // Перевіряємо останніх користувачів
    const users = await pool.query('SELECT id, telegram_id, username, created_at FROM public.users ORDER BY id DESC LIMIT 5');
    console.log("\n📋 Останні користувачі в базі:");
    users.rows.forEach(user => {
      console.log(`ID: ${user.id}, Telegram ID: ${user.telegram_id}, Username: ${user.username}`);
    });
    
  } catch (error) {
    console.error("❌ Помилка підключення:", error.message);
  } finally {
    await pool.end();
  }
}

testConnection();