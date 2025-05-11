/**
 * Скрипт для тестирования оптимизированной системы реферальных бонусов
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/pg-pool';
import { eq, sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Загрузить переменные окружения
dotenv.config();

// Определяем структуры таблиц вручную, так как TypeScript-схема не может быть импортирована напрямую в JavaScript
const users = {
  id: 'id',
  username: 'username',
  ref_code: 'ref_code',
  parent_ref_code: 'parent_ref_code',
  balance_uni: 'balance_uni',
  balance_ton: 'balance_ton'
};

const transactions = {
  id: 'id',
  user_id: 'user_id',
  type: 'type',
  currency: 'currency',
  amount: 'amount',
  status: 'status',
  created_at: 'created_at'
};

const reward_distribution_logs = {
  id: 'id',
  source_user_id: 'source_user_id',
  batch_id: 'batch_id',
  currency: 'currency',
  earned_amount: 'earned_amount',
  total_distributed: 'total_distributed',
  levels_processed: 'levels_processed',
  inviter_count: 'inviter_count',
  status: 'status',
  error_message: 'error_message',
  processed_at: 'processed_at',
  completed_at: 'completed_at'
};

// Создать подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Создать экземпляр Drizzle с нашей схемой
const db = drizzle(pool, { schema: { users, transactions, reward_distribution_logs } });

// Структура reward_distribution_logs уже определена выше
// Эмуляция типов транзакций
const TransactionType = {
  REFERRAL_BONUS: 'referral_bonus'
};

const Currency = {
  UNI: 'UNI',
  TON: 'TON'
};

const TransactionStatus = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  FAILED: 'failed'
};

// Измеряем производительность операций
console.time('Общее время выполнения');

/**
 * Создает тестовую запись в журнале распределения бонусов и выполняет пакетную обработку
 */
async function testReferralBonusDistribution(userId, amount, currency) {
  console.log(`\n=== Тест пакетной обработки реферальных бонусов ===`);
  console.log(`Пользователь: ${userId}, Сумма: ${amount}, Валюта: ${currency}`);
  
  // Создаем уникальный batch ID
  const batchId = crypto.randomUUID();
  
  try {
    // Проверяем наличие таблицы reward_distribution_logs
    console.log('\n1. Проверка таблицы reward_distribution_logs...');
    try {
      // Используем сырой SQL запрос вместо ORM для проверки существования таблицы
      const { rows } = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'reward_distribution_logs'
        )
      `);
      
      if (rows[0].exists) {
        console.log('✓ Таблица reward_distribution_logs существует');
      } else {
        console.log('✗ Таблица reward_distribution_logs не найдена');
        return false;
      }
    } catch (error) {
      console.error('✗ Ошибка при проверке таблицы reward_distribution_logs:', error);
      return false;
    }
    
    // Проверяем наличие пользователя
    console.log(`\n2. Проверка пользователя с ID ${userId}...`);
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      console.error(`✗ Пользователь с ID ${userId} не найден`);
      return false;
    }
    console.log(`✓ Пользователь найден: ${user.username} (${user.ref_code})`);
    
    // Получаем информацию о реферальной структуре
    console.log('\n3. Анализ реферальной структуры...');
    console.time('Запрос структуры');
    const { results: structure } = await db.execute(sql`
      WITH RECURSIVE ref_tree AS (
        SELECT id, parent_id, username, ref_code, 0 AS level
        FROM users
        WHERE id = ${userId}
        
        UNION ALL
        
        SELECT u.id, u.parent_id, u.username, u.ref_code, rt.level + 1
        FROM users u
        JOIN ref_tree rt ON u.parent_id = rt.id
        WHERE rt.level < 20
      )
      SELECT level, COUNT(*) as users_count
      FROM ref_tree
      GROUP BY level
      ORDER BY level
    `);
    console.timeEnd('Запрос структуры');
    
    console.log('Реферальная структура по уровням:');
    let totalReferrals = 0;
    
    if (structure && structure.length > 0) {
      structure.forEach(row => {
        if (row.level > 0) {
          totalReferrals += parseInt(row.users_count);
        }
        console.log(`  Уровень ${row.level}: ${row.users_count} пользователей`);
      });
      console.log(`Всего рефералов: ${totalReferrals}`);
    } else {
      console.log('Реферальная структура отсутствует или пуста');
    }
    
    // Создаем запись в журнале распределения
    console.log(`\n4. Создание записи в журнале распределения (batch_id: ${batchId})...`);
    console.time('Создание записи');
    await db.insert(reward_distribution_logs).values({
      source_user_id: userId,
      batch_id: batchId,
      currency: currency,
      earned_amount: amount.toString(),
      status: 'queued',
      created_at: new Date()
    });
    console.timeEnd('Создание записи');
    console.log('✓ Запись создана');
    
    // Имитируем пакетное обновление балансов
    console.log('\n5. Тестирование пакетного обновления балансов...');
    console.time('Пакетное обновление');
    
    // Создаем тестовый набор пользователей для обновления
    const testUserIds = [userId];
    if (totalReferrals > 0) {
      // Получаем до 5 рефералов для тестирования
      const { results: referrals } = await db.execute(sql`
        WITH RECURSIVE ref_tree AS (
          SELECT id, parent_id, username, level
          FROM users
          WHERE id = ${userId}
          
          UNION ALL
          
          SELECT u.id, u.parent_id, u.username, rt.level + 1
          FROM users u
          JOIN ref_tree rt ON u.parent_id = rt.id
          WHERE rt.level < 2 -- Только первые два уровня для теста
        )
        SELECT id FROM ref_tree WHERE level > 0 LIMIT 5
      `);
      
      if (referrals && referrals.length > 0) {
        referrals.forEach(ref => {
          testUserIds.push(ref.id);
        });
      }
    }
    
    // Имитируем CASE выражение для пакетного обновления
    if (testUserIds.length > 1) {
      const testBonus = 0.01; // Тестовая маленькая сумма для демонстрации
      const caseExpressions = testUserIds.map(id => 
        sql`WHEN ${id} THEN ${currency === 'UNI' ? 'balance_uni' : 'balance_ton'}::numeric + ${testBonus}`
      );
      
      const userIdsStr = testUserIds.join(',');
      
      // Строим SQL запрос с CASE выражением (без реального выполнения)
      console.log(`Тестовый SQL запрос для пакетного обновления ${testUserIds.length} пользователей:`);
      console.log(`UPDATE users
SET ${currency === 'UNI' ? 'balance_uni' : 'balance_ton'} = CASE id 
  ${caseExpressions.join('\n  ')}
  ELSE ${currency === 'UNI' ? 'balance_uni' : 'balance_ton'} 
END
WHERE id IN (${userIdsStr})`);
    } else {
      console.log('Недостаточно пользователей для демонстрации пакетного обновления');
    }
    console.timeEnd('Пакетное обновление');
    
    // Обновляем статус в журнале
    console.log('\n6. Обновление статуса в журнале...');
    console.time('Обновление статуса');
    await db.update(reward_distribution_logs)
      .set({ 
        status: 'completed',
        completed_at: new Date(),
        levels_processed: structure ? structure.length - 1 : 0,
        inviter_count: totalReferrals
      })
      .where(eq(reward_distribution_logs.batch_id, batchId));
    console.timeEnd('Обновление статуса');
    console.log('✓ Статус обновлен');
    
    // Проверяем результаты
    console.log('\n7. Проверка записи в журнале...');
    const [logRecord] = await db.select().from(reward_distribution_logs)
      .where(eq(reward_distribution_logs.batch_id, batchId));
    
    if (logRecord) {
      console.log('✓ Запись найдена в журнале:');
      console.log(`  ID: ${logRecord.id}`);
      console.log(`  Status: ${logRecord.status}`);
      console.log(`  Created: ${logRecord.created_at}`);
      console.log(`  Completed: ${logRecord.completed_at}`);
    } else {
      console.error('✗ Запись не найдена в журнале');
    }
    
    console.log('\n=== Тест успешно завершен ===');
    return true;
  } catch (error) {
    console.error(`✗ Ошибка при тестировании:`, error);
    return false;
  }
}

// Получаем аргументы командной строки
const userId = parseInt(process.argv[2] || '1');
const amount = parseFloat(process.argv[3] || '100');
const currency = (process.argv[4] || 'UNI').toUpperCase();

// Запускаем тест
try {
  await testReferralBonusDistribution(userId, amount, currency);
} catch (error) {
  console.error('Ошибка при выполнении теста:', error);
} finally {
  // Закрываем соединение с БД
  await pool.end();
  console.timeEnd('Общее время выполнения');
}