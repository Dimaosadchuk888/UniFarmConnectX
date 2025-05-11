/**
 * Скрипт для тестирования оптимизированного процессора реферальных бонусов
 * 
 * Проверяет работу пакетной обработки реферальных бонусов,
 * используя оптимизированную версию ReferralBonusProcessor.
 * 
 * Использование:
 * node test-bonus-processor.js <user_id> <amount> <currency>
 */

require('dotenv').config();
const { Pool } = require('pg');

// Подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Эмуляция структуры TransactionType
const TransactionType = {
  REFERRAL_BONUS: 'referral_bonus'
};

// Эмуляция структуры Currency
const Currency = {
  UNI: 'UNI',
  TON: 'TON'
};

/**
 * Проверка таблицы reward_distribution_logs
 */
async function checkRewardLogsTable() {
  try {
    console.log('Проверка таблицы reward_distribution_logs...');
    
    const { rows: tables } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'reward_distribution_logs'
    `);
    
    if (tables.length === 0) {
      console.log('🔨 Таблица reward_distribution_logs не найдена, создаем...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS reward_distribution_logs (
          id SERIAL PRIMARY KEY,
          source_user_id INTEGER NOT NULL,
          batch_id VARCHAR(100) NOT NULL,
          currency VARCHAR(10) NOT NULL,
          earned_amount VARCHAR(30) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          error_message TEXT
        )
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_reward_logs_status ON reward_distribution_logs(status)
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_reward_logs_batch ON reward_distribution_logs(batch_id)
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_reward_logs_source_user ON reward_distribution_logs(source_user_id)
      `);
      
      console.log('✅ Таблица reward_distribution_logs успешно создана');
      return true;
    }
    
    console.log('✅ Таблица reward_distribution_logs уже существует');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при проверке/создании таблицы reward_distribution_logs:', error);
    return false;
  }
}

/**
 * Получает реферальную структуру для пользователя
 */
async function getReferralStructure(userId, maxLevels = 20) {
  try {
    console.log(`Получение реферальной структуры для пользователя ${userId} (максимум ${maxLevels} уровней)...`);
    
    const { rows } = await pool.query(`
      WITH RECURSIVE ref_tree AS (
        SELECT id, parent_id, username, ref_code, 0 AS level
        FROM users
        WHERE id = $1
        
        UNION ALL
        
        SELECT u.id, u.parent_id, u.username, u.ref_code, rt.level + 1
        FROM users u
        JOIN ref_tree rt ON u.parent_id = rt.id
        WHERE rt.level < $2
      )
      SELECT id, parent_id, username, ref_code, level
      FROM ref_tree
      ORDER BY level, id
    `, [userId, maxLevels]);
    
    if (rows.length <= 1) {
      console.log('⚠️ У пользователя нет рефералов в структуре');
    } else {
      console.log(`✅ Найдено ${rows.length} пользователей в структуре`);
      
      // Группируем по уровням для статистики
      const levelCounts = rows.reduce((acc, user) => {
        acc[user.level] = (acc[user.level] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📊 Распределение по уровням:');
      Object.keys(levelCounts).sort((a, b) => a - b).forEach(level => {
        console.log(`   Уровень ${level}: ${levelCounts[level]} пользователей`);
      });
    }
    
    return rows;
  } catch (error) {
    console.error('❌ Ошибка при получении реферальной структуры:', error);
    throw error;
  }
}

/**
 * Имитирует функционал ReferralBonusProcessor
 * для тестирования пакетной обработки
 */
async function processReferralBonus(userId, earnedAmount, currency) {
  try {
    console.log(`\n🔄 Обработка реферального бонуса от пользователя ${userId}`);
    console.log(`💰 Заработано: ${earnedAmount} ${currency}`);
    
    // Создаем идентификатор пакета
    const batchId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Получаем реферальную структуру
    const structure = await getReferralStructure(userId);
    
    // Если нет рефералов, завершаем
    if (structure.length <= 1) {
      console.log('⚠️ Нет рефералов для начисления бонусов');
      return {
        batchId,
        updatedUsers: 0,
        totalBonus: 0
      };
    }
    
    // Записываем информацию о начале обработки
    await pool.query(
      'INSERT INTO reward_distribution_logs (source_user_id, batch_id, currency, earned_amount, status, started_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [userId, batchId, currency, earnedAmount.toString(), 'processing']
    );
    
    // Вычисляем проценты для каждого уровня (эмуляция)
    const levelPercents = Array(20).fill(0).map((_, i) => {
      if (i === 0) return 0.05; // 5% для первого уровня
      if (i === 1) return 0.03; // 3% для второго уровня
      if (i <= 5) return 0.01; // 1% для 3-5 уровней
      return 0.005; // 0.5% для остальных уровней
    });
    
    // Исключаем корневого пользователя (самого себя)
    const referrals = structure.filter(user => user.id !== userId);
    
    // Группируем пользователей по родителям для пакетной обработки
    const referralsByParent = referrals.reduce((acc, user) => {
      // Пропускаем пользователей с уровнем >= 20
      if (user.level >= 20) return acc;
      
      const parentId = user.parent_id;
      if (!acc[parentId]) {
        acc[parentId] = [];
      }
      acc[parentId].push(user);
      return acc;
    }, {});
    
    console.log(`👥 Группировка: пользователи сгруппированы по ${Object.keys(referralsByParent).length} инвайтерам`);
    
    // Создаем массивы для пакетного обновления
    const balanceUpdates = [];
    const transactionInserts = [];
    
    // Список идентификаторов пользователей для обновления (для оптимизации запросов)
    const userIds = [];
    
    // Для каждого родителя обрабатываем его рефералов
    for (const parentId in referralsByParent) {
      const percent = levelPercents[referralsByParent[parentId][0].level - 1] || 0;
      const bonusAmount = earnedAmount * percent;
      
      if (bonusAmount <= 0) continue;
      
      const formattedAmount = bonusAmount.toFixed(6);
      balanceUpdates.push({
        id: parseInt(parentId),
        amount: formattedAmount
      });
      
      userIds.push(parseInt(parentId));
      
      transactionInserts.push({
        user_id: parseInt(parentId),
        type: TransactionType.REFERRAL_BONUS,
        currency: currency,
        amount: formattedAmount,
        status: 'confirmed',
        source: `Реферальный бонус уровня ${referralsByParent[parentId][0].level}`,
        meta: JSON.stringify({
          source_user_id: userId,
          level: referralsByParent[parentId][0].level,
          batch_id: batchId
        })
      });
    }
    
    console.log(`💳 Подготовлено ${balanceUpdates.length} обновлений баланса`);
    console.log(`📝 Подготовлено ${transactionInserts.length} транзакций`);
    
    // Начинаем транзакцию для атомарности всех операций
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Оптимизированное обновление балансов одним запросом с помощью CASE
      if (balanceUpdates.length > 0) {
        // Создаем CASE выражение для обновления нескольких строк одним запросом
        const caseExpressions = balanceUpdates.map(update => 
          `WHEN id = ${update.id} THEN balance_${currency.toLowerCase()} + ${update.amount}`
        ).join('\n');
        
        const userIdsStr = userIds.join(',');
        
        // Формируем и выполняем оптимизированный SQL запрос
        const updateQuery = `
          UPDATE users
          SET balance_${currency.toLowerCase()} = CASE
            ${caseExpressions}
            ELSE balance_${currency.toLowerCase()}
          END
          WHERE id IN (${userIdsStr})
        `;
        
        await client.query(updateQuery);
        console.log(`✅ Выполнено пакетное обновление балансов для ${balanceUpdates.length} пользователей`);
      }
      
      // Пакетная вставка транзакций (если есть)
      if (transactionInserts.length > 0) {
        // Создаем параметризированный запрос для множественной вставки
        const values = transactionInserts.map((tx, i) => 
          `($${i*6+1}, $${i*6+2}, $${i*6+3}, $${i*6+4}, $${i*6+5}, $${i*6+6})`
        ).join(', ');
        
        const params = transactionInserts.flatMap(tx => [
          tx.user_id,
          tx.type,
          tx.currency,
          tx.amount,
          tx.status,
          tx.source
        ]);
        
        const insertQuery = `
          INSERT INTO transactions 
          (user_id, type, currency, amount, status, source)
          VALUES ${values}
        `;
        
        await client.query(insertQuery, params);
        console.log(`✅ Выполнена пакетная вставка ${transactionInserts.length} транзакций`);
      }
      
      // Обновляем статус в журнале распределения
      await client.query(
        'UPDATE reward_distribution_logs SET status = $1, completed_at = NOW() WHERE batch_id = $2',
        ['completed', batchId]
      );
      
      await client.query('COMMIT');
      console.log('✅ Транзакция успешно завершена');
      
      return {
        batchId,
        updatedUsers: balanceUpdates.length,
        totalBonus: balanceUpdates.reduce((sum, update) => sum + parseFloat(update.amount), 0)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Ошибка при обработке реферальных бонусов:', error);
      
      // Записываем информацию об ошибке
      await pool.query(
        'UPDATE reward_distribution_logs SET status = $1, error_message = $2, completed_at = NOW() WHERE batch_id = $3',
        ['failed', error.message, batchId]
      );
      
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Ошибка в processReferralBonus:', error);
    throw error;
  }
}

/**
 * Выполняет тест процессора реферальных бонусов
 */
async function runTest(userId, amount, currency) {
  console.log(`\n============================================`);
  console.log(`🚀 ТЕСТ ПРОЦЕССОРА РЕФЕРАЛЬНЫХ БОНУСОВ`);
  console.log(`============================================\n`);
  console.log(`Параметры теста:`);
  console.log(`👤 Пользователь: ${userId}`);
  console.log(`💰 Сумма: ${amount}`);
  console.log(`💵 Валюта: ${currency}`);
  
  try {
    // Проверяем/создаем таблицу журнала распределения
    const tableExists = await checkRewardLogsTable();
    if (!tableExists) {
      console.error('❌ Не удалось проверить/создать таблицу reward_distribution_logs');
      return;
    }
    
    // Запускаем обработку реферального бонуса
    console.time('⏱️ Время выполнения');
    const result = await processReferralBonus(userId, amount, currency);
    console.timeEnd('⏱️ Время выполнения');
    
    console.log(`\n📊 РЕЗУЛЬТАТ ТЕСТА:`);
    console.log(`🆔 Batch ID: ${result.batchId}`);
    console.log(`👥 Обновлено пользователей: ${result.updatedUsers}`);
    console.log(`💰 Общая сумма бонусов: ${result.totalBonus.toFixed(6)} ${currency}`);
    
    // Проверяем журнал распределения
    const { rows: logs } = await pool.query(
      'SELECT * FROM reward_distribution_logs WHERE batch_id = $1',
      [result.batchId]
    );
    
    if (logs.length > 0) {
      console.log(`\n📝 Запись в журнале распределения:`);
      console.log(`🆔 ID: ${logs[0].id}`);
      console.log(`👤 Source User ID: ${logs[0].source_user_id}`);
      console.log(`💰 Earned Amount: ${logs[0].earned_amount} ${logs[0].currency}`);
      console.log(`🔄 Статус: ${logs[0].status}`);
      console.log(`⏰ Создано: ${logs[0].created_at}`);
      console.log(`🚀 Начато: ${logs[0].started_at}`);
      console.log(`✅ Завершено: ${logs[0].completed_at}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Ошибка при выполнении теста:', error);
  }
}

/**
 * Точка входа скрипта
 */
async function main() {
  try {
    // Получаем параметры командной строки
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
      console.error('❌ Недостаточно параметров! Использование:');
      console.error('node test-bonus-processor.js <user_id> <amount> <currency>');
      console.error('Пример: node test-bonus-processor.js 1 100 UNI');
      process.exit(1);
    }
    
    const userId = parseInt(args[0]);
    const amount = parseFloat(args[1]);
    const currency = args[2].toUpperCase();
    
    // Валидация параметров
    if (isNaN(userId) || userId <= 0) {
      console.error('❌ ID пользователя должен быть положительным числом');
      process.exit(1);
    }
    
    if (isNaN(amount) || amount <= 0) {
      console.error('❌ Сумма должна быть положительным числом');
      process.exit(1);
    }
    
    if (currency !== 'UNI' && currency !== 'TON') {
      console.error('❌ Валюта должна быть UNI или TON');
      process.exit(1);
    }
    
    // Запускаем тест
    await runTest(userId, amount, currency);
    
    // Закрываем соединение с БД
    await pool.end();
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
main();