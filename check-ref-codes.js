// Скрипт для проверки существующих ref_code в базе данных
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq, isNull, isNotNull } from 'drizzle-orm';

async function checkRefCodes() {
  try {
    console.log('=== Анализ ref_code в базе данных ===');
    
    // 1. Подсчитываем общее количество пользователей
    const allUsersCount = await db.select({ count: { value: users.id } }).from(users);
    console.log(`Всего пользователей в базе: ${allUsersCount[0]?.count?.value || 0}`);
    
    // 2. Подсчитываем пользователей с установленным ref_code
    const usersWithRefCode = await db
      .select({ count: { value: users.id } })
      .from(users)
      .where(isNotNull(users.ref_code));
    console.log(`Пользователей с установленным ref_code: ${usersWithRefCode[0]?.count?.value || 0}`);
    
    // 3. Подсчитываем пользователей без ref_code
    const usersWithoutRefCode = await db
      .select({ count: { value: users.id } })
      .from(users)
      .where(isNull(users.ref_code));
    console.log(`Пользователей без ref_code: ${usersWithoutRefCode[0]?.count?.value || 0}`);
    
    // 4. Проверяем дубликаты ref_code
    const duplicateRefCodesQuery = `
      SELECT ref_code, COUNT(*) as count
      FROM users
      WHERE ref_code IS NOT NULL
      GROUP BY ref_code
      HAVING COUNT(*) > 1
    `;
    
    const duplicateRefCodes = await db.client.query(duplicateRefCodesQuery);
    
    if (duplicateRefCodes.rows.length > 0) {
      console.log(`\n⚠️ Найдены дублирующиеся ref_code (${duplicateRefCodes.rows.length}):`);
      for (const row of duplicateRefCodes.rows) {
        console.log(`  - ${row.ref_code}: ${row.count} пользователей`);
      }
    } else {
      console.log('\n✅ Дублирующихся ref_code не найдено');
    }
    
    // 5. Выводим статистику по длине ref_code
    const refCodeLengthQuery = `
      SELECT LENGTH(ref_code) as length, COUNT(*) as count
      FROM users
      WHERE ref_code IS NOT NULL
      GROUP BY LENGTH(ref_code)
      ORDER BY length
    `;
    
    const refCodeLengths = await db.client.query(refCodeLengthQuery);
    
    console.log('\nСтатистика по длине ref_code:');
    for (const row of refCodeLengths.rows) {
      console.log(`  - ${row.length} символов: ${row.count} кодов`);
    }
    
    // 6. Выводим последние 5 сгенерированных ref_code
    const latestRefCodesQuery = `
      SELECT id, username, ref_code, created_at
      FROM users
      WHERE ref_code IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    const latestRefCodes = await db.client.query(latestRefCodesQuery);
    
    console.log('\nПоследние сгенерированные ref_code:');
    for (const row of latestRefCodes.rows) {
      console.log(`  - ID ${row.id}: ${row.ref_code} (${row.username}, создан ${row.created_at.toISOString()})`);
    }
    
  } catch (error) {
    console.error('Ошибка при анализе ref_code:', error);
  } finally {
    // Закрываем соединение с базой данных
    await db.client.end();
  }
}

// Запускаем анализ
checkRefCodes();