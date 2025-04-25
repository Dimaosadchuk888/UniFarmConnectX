// Скрипт для анализа ref_code в базе данных
// Использует прямой SQL-запрос через пул соединений из Postgres

import { Pool, neonConfig } from '@neondatabase/serverless';
import crypto from 'crypto';
import ws from 'ws';

// Настраиваем WebSocket для Neon DB
neonConfig.webSocketConstructor = ws;

// Функция для генерации тестового ref_code (для сравнения с алгоритмом в storage.ts)
function generateRefCode() {
  // Набор символов, из которых будет формироваться реферальный код
  // Исключаем символы, которые могут быть неоднозначно восприняты: 0, O, 1, I, l
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  
  // Генерируем 8 символов - компромисс между длиной и надежностью
  const length = 8;
  
  // Используем crypto.randomBytes для криптографически стойкой генерации
  const randomBytes = crypto.randomBytes(length);
  
  // Преобразуем байты в символы из нашего набора
  let refCode = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % chars.length;
    refCode += chars[randomIndex];
  }
  
  return refCode;
}

// Основная функция анализа
async function analyzeRefCodes() {
  try {
    console.log('=== Анализ ref_code в базе данных ===');
    
    // Создаем пул соединений
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // 1. Общее количество пользователей
    const totalUsersResult = await pool.query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(totalUsersResult.rows[0].count);
    console.log(`Всего пользователей в базе: ${totalUsers}`);
    
    // 2. Пользователи с ref_code
    const usersWithRefCodeResult = await pool.query('SELECT COUNT(*) FROM users WHERE ref_code IS NOT NULL');
    const usersWithRefCode = parseInt(usersWithRefCodeResult.rows[0].count);
    console.log(`Пользователей с установленным ref_code: ${usersWithRefCode}`);
    
    // 3. Пользователи без ref_code
    const usersWithoutRefCodeResult = await pool.query('SELECT COUNT(*) FROM users WHERE ref_code IS NULL');
    const usersWithoutRefCode = parseInt(usersWithoutRefCodeResult.rows[0].count);
    console.log(`Пользователей без ref_code: ${usersWithoutRefCode}`);
    
    // 4. Дубликаты ref_code
    const duplicateRefCodesQuery = `
      SELECT ref_code, COUNT(*) as count
      FROM users
      WHERE ref_code IS NOT NULL
      GROUP BY ref_code
      HAVING COUNT(*) > 1
    `;
    
    const duplicateRefCodesResult = await pool.query(duplicateRefCodesQuery);
    
    if (duplicateRefCodesResult.rowCount > 0) {
      console.log(`\n⚠️ Найдены дублирующиеся ref_code (${duplicateRefCodesResult.rowCount}):`);
      for (const row of duplicateRefCodesResult.rows) {
        console.log(`  - ${row.ref_code}: ${row.count} пользователей`);
      }
    } else {
      console.log('\n✅ Дублирующихся ref_code не найдено');
    }
    
    // 5. Статистика по длине ref_code
    const refCodeLengthQuery = `
      SELECT LENGTH(ref_code) as length, COUNT(*) as count
      FROM users
      WHERE ref_code IS NOT NULL
      GROUP BY LENGTH(ref_code)
      ORDER BY length
    `;
    
    const refCodeLengthsResult = await pool.query(refCodeLengthQuery);
    
    console.log('\nСтатистика по длине ref_code:');
    for (const row of refCodeLengthsResult.rows) {
      console.log(`  - ${row.length} символов: ${row.count} кодов`);
    }
    
    // 6. Последние 5 сгенерированных ref_code
    const latestRefCodesQuery = `
      SELECT id, username, ref_code, created_at
      FROM users
      WHERE ref_code IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    const latestRefCodesResult = await pool.query(latestRefCodesQuery);
    
    console.log('\nПоследние сгенерированные ref_code:');
    for (const row of latestRefCodesResult.rows) {
      console.log(`  - ID ${row.id}: ${row.ref_code} (${row.username}, создан ${new Date(row.created_at).toISOString()})`);
    }
    
    // 7. Примеры сгенерированных кодов
    console.log('\nПримеры кодов, сгенерированных алгоритмом:');
    for (let i = 0; i < 5; i++) {
      console.log(`  - ${generateRefCode()}`);
    }
    
    // Закрываем соединение с базой
    await pool.end();
    
  } catch (error) {
    console.error('Ошибка при анализе ref_code:', error);
  }
}

// Запускаем анализ
analyzeRefCodes();