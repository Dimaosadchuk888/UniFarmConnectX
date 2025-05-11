/**
 * Скрипт для тестирования оптимизированной системы реферальных бонусов
 */

// Используем CommonJS синтаксис
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { eq, sql } = require('drizzle-orm');
const dotenv = require('dotenv');
const crypto = require('crypto');

// Загрузить переменные окружения
dotenv.config();

// Проверяем наличие DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error("❌ Ошибка: переменная окружения DATABASE_URL не установлена");
  process.exit(1);
}

// Определяем структуры таблиц вручную, так как TypeScript-схема не может быть импортирована напрямую в JavaScript
const users = {
  id: 'id',
  username: 'username',
  ref_code: 'ref_code',
  parent_ref_code: 'parent_ref_code',
  parent_id: 'parent_id', // добавлено поле parent_id для запросов с рекурсией
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
  completed_at: 'completed_at',
  created_at: 'created_at' // Добавлено поле created_at, которое используется в INSERT
};

// Создать подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Вывод информации о соединении для отладки
console.log(`\nПодключение к PostgreSQL используя строку подключения в DATABASE_URL`);
console.log(`(Реальная строка подключения скрыта для безопасности)\n`);

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
    try {
      // Используем сырой SQL-запрос вместо drizzle-orm для отладки проблемы
      const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId]);
      const user = result.rows[0];
      
      if (!user) {
        console.error(`✗ Пользователь с ID ${userId} не найден`);
        return false;
      }
      console.log(`✓ Пользователь найден: ${user.username} (${user.ref_code})`);
    } catch (error) {
      console.error(`✗ Ошибка при поиске пользователя:`, error);
      return false;
    }
    
    // Получаем информацию о реферальной структуре
    console.log('\n3. Анализ реферальной структуры...');
    console.time('Запрос структуры');
    
    // Используем сырой SQL запрос для получения реферальной структуры
    let structure = [];
    try {
      // Проверим структуру таблицы users
      console.log('Проверка структуры таблицы users...');
      const columnsResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `);
      
      console.log('Колонки в таблице users:');
      columnsResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}`);
      });
      
      // Попробуем использовать parent_ref_code вместо parent_id
      const result = await pool.query(`
        WITH RECURSIVE ref_tree AS (
          SELECT 
            id, 
            ref_code, 
            parent_ref_code,
            username, 
            0 AS level
          FROM users
          WHERE id = $1
          
          UNION ALL
          
          SELECT 
            u.id, 
            u.ref_code, 
            u.parent_ref_code,
            u.username, 
            rt.level + 1
          FROM users u
          JOIN ref_tree rt ON u.parent_ref_code = rt.ref_code
          WHERE rt.level < 20
        )
        SELECT level, COUNT(*) as users_count
        FROM ref_tree
        GROUP BY level
        ORDER BY level
      `, [userId]);
      
      structure = result.rows;
    } catch (error) {
      console.error('✗ Ошибка при получении реферальной структуры:', error);
    }
    
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
    
    try {
      await pool.query(`
        INSERT INTO reward_distribution_logs (
          source_user_id, batch_id, currency, earned_amount, 
          status, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId, 
        batchId, 
        currency, 
        amount.toString(), 
        'queued',
        new Date()
      ]);
      console.log('✓ Запись создана');
    } catch (error) {
      console.error('✗ Ошибка при создании записи:', error);
      return false;
    }
    
    console.timeEnd('Создание записи');
    
    // Имитируем пакетное обновление балансов
    console.log('\n5. Тестирование пакетного обновления балансов...');
    console.time('Пакетное обновление');
    
    // Создаем тестовый набор пользователей для обновления
    const testUserIds = [userId];
    if (totalReferrals > 0) {
      try {
        // Получаем до 5 рефералов для тестирования
        const result = await pool.query(`
          WITH RECURSIVE ref_tree AS (
            SELECT id, parent_id, username, 0 AS level
            FROM users
            WHERE id = $1
            
            UNION ALL
            
            SELECT u.id, u.parent_id, u.username, rt.level + 1
            FROM users u
            JOIN ref_tree rt ON u.parent_id = rt.id
            WHERE rt.level < 2 -- Только первые два уровня для теста
          )
          SELECT id FROM ref_tree WHERE level > 0 LIMIT 5
        `, [userId]);
        
        const referrals = result.rows;
        
        if (referrals && referrals.length > 0) {
          referrals.forEach(ref => {
            testUserIds.push(ref.id);
          });
        }
      } catch (error) {
        console.error('✗ Ошибка при получении тестовых рефералов:', error);
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
    
    try {
      await pool.query(`
        UPDATE reward_distribution_logs
        SET 
          status = $1,
          completed_at = $2,
          levels_processed = $3,
          inviter_count = $4
        WHERE batch_id = $5
      `, [
        'completed',
        new Date(),
        structure ? structure.length - 1 : 0,
        totalReferrals,
        batchId
      ]);
      console.log('✓ Статус обновлен');
    } catch (error) {
      console.error('✗ Ошибка при обновлении статуса:', error);
      return false;
    }
    
    console.timeEnd('Обновление статуса');
    
    // Проверяем результаты
    console.log('\n7. Проверка записи в журнале...');
    let logRecord = null;
    
    try {
      const result = await pool.query(
        `SELECT * FROM reward_distribution_logs WHERE batch_id = $1`, 
        [batchId]
      );
      logRecord = result.rows[0];
    } catch (error) {
      console.error('✗ Ошибка при проверке записи в журнале:', error);
      return false;
    }
    
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
(async function runTest() {
  try {
    await testReferralBonusDistribution(userId, amount, currency);
  } catch (error) {
    console.error('Ошибка при выполнении теста:', error);
  } finally {
    // Закрываем соединение с БД
    await pool.end();
    console.timeEnd('Общее время выполнения');
  }
})();