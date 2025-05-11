/**
 * Тестовый скрипт для оптимизированной реферальной системы
 * 
 * Проверяет работу оптимизированной реферальной системы с использованием
 * рекурсивных CTE и атомарных транзакций.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');

// Конфигурация подключения к базе данных
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
};

// Создаем подключение к базе данных
const pool = new Pool(dbConfig);

/**
 * Выполняет SQL-запрос к базе данных
 */
async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(query, params);
  } finally {
    client.release();
  }
}

/**
 * Создает тестовую реферальную структуру для проверки
 */
async function createTestReferralStructure(depth = 5, branchingFactor = 2) {
  console.log(`\n🔄 Создание тестовой реферальной структуры глубиной ${depth} с коэффициентом ветвления ${branchingFactor}...`);
  
  // Очищаем тестовых пользователей, если они существуют
  await executeQuery(`
    DELETE FROM users 
    WHERE username LIKE 'test_ref_%'
  `);
  
  // Создаем корневого пользователя
  const rootInsertResult = await executeQuery(`
    INSERT INTO users (username, ref_code, parent_ref_code, balance_uni, balance_ton)
    VALUES ('test_ref_root', 'ROOT123', NULL, '1000.0', '10.0')
    RETURNING id, ref_code
  `);
  
  const rootId = rootInsertResult.rows[0].id;
  const rootRefCode = rootInsertResult.rows[0].ref_code;
  
  console.log(`✅ Создан корневой пользователь с ID: ${rootId}, ref_code: ${rootRefCode}`);
  
  // Функция для рекурсивного создания структуры
  async function createChildrenRecursive(parentId, parentRefCode, currentDepth, prefix = '') {
    if (currentDepth >= depth) return;
    
    const users = [];
    
    // Создаем пользователей для текущего уровня
    for (let i = 0; i < branchingFactor; i++) {
      const userId = `${prefix}${currentDepth}_${i}`;
      const refCode = `REF_${userId}`;
      
      users.push({
        userId,
        refCode,
        username: `test_ref_${userId}`
      });
    }
    
    // Вставляем пользователей пакетно
    for (const user of users) {
      const insertResult = await executeQuery(`
        INSERT INTO users (username, ref_code, parent_ref_code, balance_uni, balance_ton)
        VALUES ($1, $2, $3, '100.0', '1.0')
        RETURNING id
      `, [user.username, user.refCode, parentRefCode]);
      
      const id = insertResult.rows[0].id;
      
      // Создаем правильные записи в таблице referrals
      await executeQuery(`
        INSERT INTO referrals (user_id, inviter_id, level)
        VALUES ($1, $2, 1)
      `, [id, parentId]);
      
      // Рекурсивно создаем детей для этого пользователя
      await createChildrenRecursive(id, user.refCode, currentDepth + 1, `${userId}_`);
    }
  }
  
  // Запускаем рекурсивное создание структуры
  await createChildrenRecursive(rootId, rootRefCode, 1);
  
  // Подсчитываем количество созданных пользователей
  const countResult = await executeQuery(`
    SELECT COUNT(*) FROM users WHERE username LIKE 'test_ref_%'
  `);
  
  console.log(`✅ Создано ${countResult.rows[0].count} тестовых пользователей в структуре`);
  
  return {
    rootId,
    rootRefCode,
    totalUsers: parseInt(countResult.rows[0].count)
  };
}

/**
 * Тестирует построение реферальной структуры с использованием рекурсивных CTE
 */
async function testReferralStructureQuery(rootId) {
  console.log(`\n🔄 Тестирование запроса реферальной структуры для пользователя ${rootId}...`);
  
  console.time('⏱️ Время выполнения запроса');
  
  // Выполняем рекурсивный CTE-запрос
  const result = await executeQuery(`
    WITH RECURSIVE referral_chain AS (
      -- Начальный запрос: выбираем прямых рефералов (уровень 1)
      SELECT 
        u.id, 
        u.username, 
        u.ref_code, 
        u.parent_ref_code,
        1 AS level
      FROM 
        users u
      INNER JOIN
        (SELECT ref_code FROM users WHERE id = $1) root
      ON u.parent_ref_code = root.ref_code
      
      UNION ALL
      
      -- Рекурсивный запрос: находим всех рефералов на следующих уровнях
      SELECT 
        u.id, 
        u.username, 
        u.ref_code, 
        u.parent_ref_code, 
        rc.level + 1 AS level
      FROM 
        users u
      INNER JOIN 
        referral_chain rc ON u.parent_ref_code = rc.ref_code
      WHERE 
        rc.level < 20  -- Ограничиваем глубину
    )
    -- Финальный запрос: группируем результаты по уровням для агрегации
    SELECT 
      level,
      COUNT(*) AS count,
      ARRAY_AGG(id) AS user_ids
    FROM 
      referral_chain
    GROUP BY 
      level
    ORDER BY 
      level
  `, [rootId]);
  
  console.timeEnd('⏱️ Время выполнения запроса');
  
  console.log('\n📊 Результаты по уровням:');
  result.rows.forEach(row => {
    console.log(`   Уровень ${row.level}: ${row.count} пользователей`);
  });
  
  // Получаем общее количество пользователей
  const totalReferrals = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
  console.log(`\n✅ Общее количество рефералов: ${totalReferrals}`);
  
  return {
    levels: result.rows.map(row => ({
      level: parseInt(row.level),
      count: parseInt(row.count),
      user_ids: row.user_ids
    })),
    totalReferrals
  };
}

/**
 * Тестирует получение инвайтеров (вышестоящих пользователей) с помощью рекурсивных CTE
 */
async function testInvitersQuery(userId) {
  console.log(`\n🔄 Тестирование запроса инвайтеров для пользователя ${userId}...`);
  
  // Сначала получаем parent_ref_code пользователя
  const userResult = await executeQuery(`
    SELECT parent_ref_code FROM users WHERE id = $1
  `, [userId]);
  
  if (!userResult.rows[0] || !userResult.rows[0].parent_ref_code) {
    console.log('❌ У пользователя нет parent_ref_code');
    return [];
  }
  
  const parentRefCode = userResult.rows[0].parent_ref_code;
  
  console.time('⏱️ Время выполнения запроса инвайтеров');
  
  // Выполняем рекурсивный CTE-запрос для цепочки инвайтеров
  const result = await executeQuery(`
    WITH RECURSIVE inviter_chain AS (
      -- Начальный запрос: находим прямого пригласителя
      SELECT 
        u.id, 
        u.username,
        u.ref_code, 
        u.parent_ref_code,
        1 AS level
      FROM 
        users u
      WHERE 
        u.ref_code = $1
      
      UNION ALL
      
      -- Рекурсивный запрос: находим пригласителей более высоких уровней
      SELECT 
        u.id, 
        u.username,
        u.ref_code, 
        u.parent_ref_code, 
        ic.level + 1 AS level
      FROM 
        users u
      INNER JOIN 
        inviter_chain ic ON u.ref_code = ic.parent_ref_code
      WHERE 
        u.parent_ref_code IS NOT NULL AND
        ic.level < 20
    )
    -- Финальный запрос
    SELECT 
      id,
      username,
      level
    FROM 
      inviter_chain
    ORDER BY 
      level
  `, [parentRefCode]);
  
  console.timeEnd('⏱️ Время выполнения запроса инвайтеров');
  
  console.log('\n📊 Результаты инвайтеров:');
  result.rows.forEach(row => {
    console.log(`   Уровень ${row.level}: ID ${row.id}, Username: ${row.username}`);
  });
  
  return result.rows;
}

/**
 * Тестирует симуляцию обработки реферальных вознаграждений
 */
async function testReferralRewardProcessing(userId, amount = 100) {
  console.log(`\n🔄 Тестирование обработки реферальных вознаграждений для пользователя ${userId} с суммой ${amount} UNI...`);
  
  console.time('⏱️ Время выполнения обработки');
  
  // Создаем уникальный идентификатор для пакета
  const batchId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  // Создаем запись в журнале
  await executeQuery(`
    INSERT INTO reward_distribution_logs 
    (source_user_id, batch_id, currency, earned_amount, status, processed_at)
    VALUES ($1, $2, 'UNI', $3, 'processing', NOW())
  `, [userId, batchId, amount.toString()]);
  
  // Получаем всех инвайтеров с использованием рекурсивных CTE
  const invitersResult = await executeQuery(`
    WITH RECURSIVE inviter_chain AS (
      -- Начальный запрос: получаем parent_ref_code пользователя
      SELECT 
        u.parent_ref_code
      FROM 
        users u
      WHERE 
        u.id = $1
      
      UNION ALL
      
      -- Получаем цепочку инвайтеров
      SELECT 
        u.parent_ref_code
      FROM 
        users u
      INNER JOIN 
        inviter_chain ic ON u.ref_code = ic.parent_ref_code
      WHERE 
        u.parent_ref_code IS NOT NULL
    )
    -- Соединяем с таблицей пользователей для получения всех данных
    SELECT 
      u.id,
      u.username,
      u.ref_code,
      u.parent_ref_code,
      CASE 
        WHEN u.ref_code = (SELECT parent_ref_code FROM users WHERE id = $1) THEN 1
        ELSE NULL -- Пока что оставляем NULL, уровень рассчитаем дальше
      END AS level
    FROM 
      inviter_chain ic
    JOIN 
      users u ON ic.parent_ref_code = u.ref_code
  `, [userId]);
  
  // Если нет инвайтеров, просто обновляем запись в журнале
  if (invitersResult.rows.length === 0) {
    await executeQuery(`
      UPDATE reward_distribution_logs
      SET status = 'completed', levels_processed = 0, inviter_count = 0, total_distributed = '0', completed_at = NOW()
      WHERE batch_id = $1
    `, [batchId]);
    
    console.timeEnd('⏱️ Время выполнения обработки');
    console.log('✅ Нет инвайтеров для распределения вознаграждений');
    return { totalRewardsDistributed: 0 };
  }
  
  // Вычисляем уровни для всех инвайтеров
  const inviters = invitersResult.rows;
  const invitersByRefCode = {};
  
  inviters.forEach(inviter => {
    invitersByRefCode[inviter.ref_code] = inviter;
  });
  
  // Находим прямого инвайтера
  const directInviter = inviters.find(inv => inv.level === 1);
  
  if (!directInviter) {
    console.log('❌ Не удалось найти прямого инвайтера');
    return { totalRewardsDistributed: 0 };
  }
  
  // Устанавливаем уровень для всех инвайтеров
  let currentLevel = 1;
  let currentRefCode = directInviter.ref_code;
  
  while (currentRefCode && currentLevel <= 20) {
    const currentInviter = invitersByRefCode[currentRefCode];
    if (!currentInviter) break;
    
    currentInviter.level = currentLevel;
    currentRefCode = currentInviter.parent_ref_code;
    currentLevel++;
  }
  
  // Проценты вознаграждений по уровням
  const levelPercents = [
    5.0,  // Уровень 1: 5%
    3.0,  // Уровень 2: 3%
    2.0,  // Уровень 3: 2%
    1.0,  // Уровень 4: 1%
    0.8,  // Уровень 5: 0.8%
    0.5,  // Уровень 6: 0.5%
    0.3,  // Уровень 7: 0.3%
    0.3,  // Уровень 8: 0.3%
    0.3,  // Уровень 9: 0.3%
    0.3,  // Уровень 10: 0.3%
    0.2,  // Уровень 11: 0.2%
    0.2,  // Уровень 12: 0.2%
    0.2,  // Уровень 13: 0.2%
    0.2,  // Уровень 14: 0.2%
    0.2,  // Уровень 15: 0.2%
    0.1,  // Уровень 16: 0.1%
    0.1,  // Уровень 17: 0.1%
    0.1,  // Уровень 18: 0.1%
    0.1,  // Уровень 19: 0.1%
    0.1   // Уровень 20: 0.1%
  ];
  
  // Выполняем все в одной транзакции
  const client = await pool.connect();
  let totalRewardsDistributed = 0;
  let inviterCount = 0;
  
  try {
    await client.query('BEGIN');
    
    // Обрабатываем каждого инвайтера с известным уровнем
    for (const inviter of inviters.filter(inv => inv.level !== null)) {
      const level = inviter.level;
      
      if (level <= 0 || level > 20) continue;
      
      const percent = levelPercents[level - 1];
      const bonusAmount = amount * (percent / 100);
      
      if (bonusAmount <= 0) continue;
      
      // Получаем текущий баланс пользователя
      const balanceResult = await client.query(
        'SELECT balance_uni FROM users WHERE id = $1',
        [inviter.id]
      );
      
      if (balanceResult.rows.length === 0) continue;
      
      const currentBalance = parseFloat(balanceResult.rows[0].balance_uni || 0);
      const newBalance = currentBalance + bonusAmount;
      
      // Обновляем баланс пользователя
      await client.query(
        'UPDATE users SET balance_uni = $1 WHERE id = $2',
        [newBalance.toString(), inviter.id]
      );
      
      // Записываем транзакцию
      await client.query(`
        INSERT INTO transactions (
          user_id, type, currency, amount, status, source, 
          description, source_user_id, category, data
        )
        VALUES ($1, 'referral', 'UNI', $2, 'confirmed', 'Referral Income', 
                $3, $4, 'bonus', $5)
      `, [
        inviter.id,
        bonusAmount.toString(),
        `Referral reward from level ${level} farming (test)`,
        userId,
        JSON.stringify({
          batch_id: batchId,
          level: level,
          percent: percent
        })
      ]);
      
      totalRewardsDistributed += bonusAmount;
      inviterCount++;
      
      console.log(`   Уровень ${level}: ID ${inviter.id}, Username: ${inviter.username}, Бонус: ${bonusAmount.toFixed(6)} UNI (${percent}%)`);
    }
    
    // Обновляем запись в журнале распределения
    await client.query(`
      UPDATE reward_distribution_logs
      SET 
        status = 'completed', 
        levels_processed = $1, 
        inviter_count = $2, 
        total_distributed = $3, 
        completed_at = NOW()
      WHERE batch_id = $4
    `, [
      inviters.filter(inv => inv.level !== null).length,
      inviterCount,
      totalRewardsDistributed.toString(),
      batchId
    ]);
    
    await client.query('COMMIT');
    
    console.timeEnd('⏱️ Время выполнения обработки');
    console.log(`✅ Успешно распределено ${totalRewardsDistributed.toFixed(6)} UNI среди ${inviterCount} инвайтеров`);
    
    return { totalRewardsDistributed, inviterCount };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка при обработке вознаграждений:', error);
    
    // Записываем ошибку в журнал
    await executeQuery(`
      UPDATE reward_distribution_logs
      SET status = 'failed', error_message = $1, completed_at = NOW()
      WHERE batch_id = $2
    `, [error.message, batchId]);
    
    return { totalRewardsDistributed: 0, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Тестирует производительность оптимизированных запросов в сравнении со стандартными
 */
async function testPerformanceComparison(rootId) {
  console.log(`\n🔄 Тестирование производительности различных реализаций...`);
  
  // Тест 1: Стандартный подход (последовательный обход)
  console.log(`\n📊 Тест 1: Стандартный подход (последовательный обход):`);
  console.time('⏱️ Стандартный подход');
  
  // Имитируем стандартный подход с последовательными запросами
  let queryCount = 0;
  
  async function getChildrenRecursive(refCode, currentLevel, maxLevel) {
    if (currentLevel > maxLevel) return [];
    
    const result = await executeQuery(`
      SELECT id, ref_code FROM users WHERE parent_ref_code = $1
    `, [refCode]);
    
    queryCount++;
    
    let children = result.rows;
    let totalChildren = children.length;
    
    // Для каждого ребенка получаем его детей рекурсивно
    for (const child of children) {
      const grandchildren = await getChildrenRecursive(child.ref_code, currentLevel + 1, maxLevel);
      totalChildren += grandchildren;
    }
    
    return totalChildren;
  }
  
  // Получаем ref_code корневого пользователя
  const rootResult = await executeQuery(`
    SELECT ref_code FROM users WHERE id = $1
  `, [rootId]);
  
  const rootRefCode = rootResult.rows[0].ref_code;
  
  // Выполняем рекурсивный обход
  const totalStandard = await getChildrenRecursive(rootRefCode, 1, 5);
  
  console.timeEnd('⏱️ Стандартный подход');
  console.log(`   Количество SQL-запросов: ${queryCount}`);
  console.log(`   Найдено: ${totalStandard} рефералов`);
  
  // Тест 2: Оптимизированный подход (рекурсивный CTE)
  console.log(`\n📊 Тест 2: Оптимизированный подход (рекурсивный CTE):`);
  console.time('⏱️ Оптимизированный подход');
  
  // Выполняем оптимизированный рекурсивный CTE-запрос
  const result = await executeQuery(`
    WITH RECURSIVE referral_chain AS (
      -- Начальный запрос: выбираем прямых рефералов
      SELECT 
        id, 
        ref_code, 
        parent_ref_code,
        1 AS level
      FROM 
        users
      WHERE 
        parent_ref_code = $1
      
      UNION ALL
      
      -- Рекурсивный запрос: находим рефералов на следующих уровнях
      SELECT 
        u.id, 
        u.ref_code, 
        u.parent_ref_code, 
        rc.level + 1 AS level
      FROM 
        users u
      INNER JOIN 
        referral_chain rc ON u.parent_ref_code = rc.ref_code
      WHERE 
        rc.level < 5
    )
    SELECT COUNT(*) as total FROM referral_chain
  `, [rootRefCode]);
  
  console.timeEnd('⏱️ Оптимизированный подход');
  console.log(`   Количество SQL-запросов: 1`);
  console.log(`   Найдено: ${result.rows[0].total} рефералов`);
  
  // Расчет ускорения
  const speedup = queryCount;
  console.log(`\n🚀 Ускорение: ${speedup}x (${queryCount} запросов против 1)`);
  
  return {
    standard: {
      time: null, // Нужно засечь вручную
      queryCount,
      count: totalStandard
    },
    optimized: {
      time: null, // Нужно засечь вручную
      queryCount: 1,
      count: parseInt(result.rows[0].total)
    },
    speedup
  };
}

/**
 * Основная функция для запуска всех тестов
 */
async function runTests() {
  try {
    console.log('🚀 Начало тестирования оптимизированной реферальной системы\n');
    
    // Создаем тестовую структуру
    const { rootId } = await createTestReferralStructure(5, 3);
    
    // Тест 1: Проверка построения реферальной структуры
    await testReferralStructureQuery(rootId);
    
    // Тест 2: Проверка запроса инвайтеров
    // Выбираем пользователя с глубиной 3 для теста
    const leafResult = await executeQuery(`
      WITH RECURSIVE referral_chain AS (
        SELECT id, ref_code, parent_ref_code, 1 AS level
        FROM users
        WHERE parent_ref_code = (SELECT ref_code FROM users WHERE id = $1)
        
        UNION ALL
        
        SELECT u.id, u.ref_code, u.parent_ref_code, rc.level + 1
        FROM users u
        JOIN referral_chain rc ON u.parent_ref_code = rc.ref_code
        WHERE rc.level < 2
      )
      SELECT id FROM referral_chain
      WHERE level = 2
      LIMIT 1
    `, [rootId]);
    
    if (leafResult.rows.length > 0) {
      const leafId = leafResult.rows[0].id;
      await testInvitersQuery(leafId);
      
      // Тест 3: Проверка обработки реферальных вознаграждений
      await testReferralRewardProcessing(leafId, 100);
    }
    
    // Тест 4: Сравнение производительности
    await testPerformanceComparison(rootId);
    
    // Очистка тестовых данных
    await executeQuery(`
      DELETE FROM users 
      WHERE username LIKE 'test_ref_%'
    `);
    
    console.log('\n✅ Тестирование завершено успешно');
  } catch (error) {
    console.error('❌ Ошибка при выполнении тестов:', error);
  } finally {
    // Закрываем подключение к БД
    await pool.end();
  }
}

// Запускаем тесты
runTests();