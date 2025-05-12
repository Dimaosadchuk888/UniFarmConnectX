/**
 * Скрипт для проверки начислений по 20 уровням реферальной программы
 * Безопасный анализ без вмешательства в базу данных
 */

import pg from 'pg';
const { Pool } = pg;

// Подключение к базе данных через переменную окружения
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Процент реферальных начислений для каждого уровня
 * Конфигурация согласно документации проекта
 */
const LEVEL_PERCENTAGES = {
  1: 100, // 100% для первого уровня
  2: 20,  // 20% для второго уровня
  3: 15,  // 15% для третьего уровня
  4: 10,  // 10% для четвертого уровня
  5: 5,   // 5% для пятого уровня
  // Уровни 6-20 имеют 2% начисления
  6: 2, 7: 2, 8: 2, 9: 2, 10: 2,
  11: 2, 12: 2, 13: 2, 14: 2, 15: 2,
  16: 2, 17: 2, 18: 2, 19: 2, 20: 2
};

/**
 * Выполняет SQL запрос к базе данных
 */
async function executeQuery(query, params = []) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Ошибка при выполнении SQL запроса:', error);
    throw error;
  }
}

/**
 * Получает текущую структуру реферальной программы
 * Находит все реферальные связи в системе
 */
async function getReferralStructure() {
  console.log('Получение текущей структуры реферальной программы...');
  
  const query = `
    SELECT 
      r.user_id, 
      r.inviter_id, 
      r.level,
      u1.username as user_username,
      u2.username as inviter_username
    FROM 
      referrals r
    JOIN 
      users u1 ON r.user_id = u1.id
    JOIN 
      users u2 ON r.inviter_id = u2.id
    ORDER BY 
      r.inviter_id, r.level
  `;
  
  const referrals = await executeQuery(query);
  
  console.log(`Найдено ${referrals.length} реферальных связей`);
  return referrals;
}

/**
 * Строит дерево рефералов для указанного родительского ID
 */
async function buildReferralTree(rootUserId) {
  console.log(`Построение реферального дерева для пользователя ${rootUserId}...`);
  
  // Получаем данные о пользователе
  const userQuery = 'SELECT id, username FROM users WHERE id = $1';
  const userResult = await executeQuery(userQuery, [rootUserId]);
  
  if (userResult.length === 0) {
    throw new Error(`Пользователь с ID ${rootUserId} не найден`);
  }
  
  const rootUser = userResult[0];
  
  // Получаем всех прямых рефералов
  const referralsQuery = `
    SELECT 
      r.user_id, 
      u.username
    FROM 
      referrals r
    JOIN 
      users u ON r.user_id = u.id
    WHERE 
      r.inviter_id = $1 AND r.level = 1
  `;
  
  const referralsResult = await executeQuery(referralsQuery, [rootUserId]);
  
  console.log(`Найдено ${referralsResult.length} прямых рефералов для пользователя ${rootUser.username} (ID: ${rootUserId})`);
  
  // Рекурсивно строим дерево для каждого реферала
  const tree = {
    id: rootUser.id,
    username: rootUser.username,
    children: []
  };
  
  // Ограничиваем глубину рекурсии до 20 уровней
  async function buildSubtree(node, currentLevel = 1, maxLevel = 20) {
    if (currentLevel > maxLevel) {
      return;
    }
    
    const childrenQuery = `
      SELECT 
        r.user_id, 
        u.username
      FROM 
        referrals r
      JOIN 
        users u ON r.user_id = u.id
      WHERE 
        r.inviter_id = $1 AND r.level = 1
    `;
    
    const children = await executeQuery(childrenQuery, [node.id]);
    
    for (const child of children) {
      const childNode = {
        id: child.user_id,
        username: child.username,
        level: currentLevel,
        children: []
      };
      
      node.children.push(childNode);
      
      // Рекурсивно строим дерево для этого ребенка
      await buildSubtree(childNode, currentLevel + 1, maxLevel);
    }
  }
  
  // Начинаем строить дерево с корня
  await buildSubtree(tree, 1);
  
  return tree;
}

/**
 * Получает транзакции по реферальной программе
 */
async function getReferralTransactions() {
  console.log('Получение реферальных транзакций...');
  
  const query = `
    SELECT 
      t.id,
      t.user_id,
      u.username,
      t.amount,
      t.currency,
      t.type,
      t.description,
      t.created_at
    FROM 
      transactions t
    JOIN 
      users u ON t.user_id = u.id
    WHERE 
      t.type LIKE '%referral%'
    ORDER BY 
      t.created_at DESC
  `;
  
  const transactions = await executeQuery(query);
  
  console.log(`Найдено ${transactions.length} реферальных транзакций`);
  return transactions;
}

/**
 * Анализирует реферальные транзакции по уровням
 */
async function analyzeReferralLevels() {
  console.log('\n=== Анализ реферальных начислений по уровням ===');
  
  // Получаем все реферальные транзакции
  const transactions = await getReferralTransactions();
  
  // Группируем транзакции по уровню (из описания)
  const levelPattern = /уровень (\d+)/i;
  const levelTransactions = {};
  
  transactions.forEach(tx => {
    let level = 0;
    
    if (tx.description) {
      const match = tx.description.match(levelPattern);
      if (match && match[1]) {
        level = parseInt(match[1], 10);
      }
    }
    
    if (!levelTransactions[level]) {
      levelTransactions[level] = [];
    }
    
    levelTransactions[level].push(tx);
  });
  
  // Выводим статистику по каждому уровню
  console.log('\n=== Распределение реферальных начислений по уровням ===');
  
  let allLevelsFound = true;
  let maxLevelFound = 0;
  
  for (let level = 1; level <= 20; level++) {
    const levelTxs = levelTransactions[level] || [];
    const totalAmount = levelTxs.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    
    console.log(`Уровень ${level}: ${levelTxs.length} транзакций, ${totalAmount.toFixed(6)} UNI`);
    
    if (levelTxs.length > 0 && level > maxLevelFound) {
      maxLevelFound = level;
    }
    
    if (level <= 5 && levelTxs.length === 0) {
      allLevelsFound = false;
      console.log(`  ⚠️ ВНИМАНИЕ: Не найдено транзакций для уровня ${level}!`);
    }
  }
  
  // Выводим итоговую статистику
  console.log('\n=== Итоговая статистика ===');
  console.log(`Всего найдено реферальных транзакций: ${transactions.length}`);
  console.log(`Максимальный найденный уровень: ${maxLevelFound}`);
  
  if (allLevelsFound) {
    console.log('✅ Все основные уровни (1-5) имеют реферальные начисления');
  } else {
    console.log('⚠️ Некоторые основные уровни (1-5) не имеют реферальных начислений');
  }
  
  if (maxLevelFound < 20) {
    console.log(`⚠️ Не найдены начисления для всех 20 уровней (максимальный: ${maxLevelFound})`);
  } else {
    console.log('✅ Найдены начисления для всех 20 уровней');
  }
  
  return {
    transactions,
    levelTransactions,
    maxLevelFound,
    allLevelsFound
  };
}

/**
 * Проверяет соответствие начислений процентным ставкам
 */
async function checkReferralPercentages() {
  console.log('\n=== Проверка соответствия начислений процентным ставкам ===');
  
  // Находим связанные транзакции (оригинальный доход и реферальные начисления)
  const query = `
    SELECT 
      t1.id as orig_id,
      t1.user_id as orig_user_id,
      u1.username as orig_username,
      t1.amount as orig_amount,
      t1.type as orig_type,
      t1.created_at as orig_created_at,
      t2.id as ref_id,
      t2.user_id as ref_user_id,
      u2.username as ref_username,
      t2.amount as ref_amount,
      t2.type as ref_type,
      t2.description as ref_description,
      t2.created_at as ref_created_at
    FROM 
      transactions t1
    JOIN 
      transactions t2 ON t2.created_at >= t1.created_at 
                      AND t2.created_at < t1.created_at + interval '1 minute'
    JOIN 
      users u1 ON t1.user_id = u1.id
    JOIN 
      users u2 ON t2.user_id = u2.id
    WHERE 
      t1.type IN ('farming_harvest', 'ton_farming_harvest') 
      AND t2.type LIKE '%referral%'
    ORDER BY 
      t1.created_at DESC, t2.created_at
    LIMIT 100
  `;
  
  const relatedTxs = await executeQuery(query);
  console.log(`Найдено ${relatedTxs.length} связанных транзакций для анализа`);
  
  // Группируем по оригинальным транзакциям
  const txGroups = {};
  
  relatedTxs.forEach(tx => {
    const key = `${tx.orig_id}_${tx.orig_created_at.toISOString()}`;
    if (!txGroups[key]) {
      txGroups[key] = {
        original: {
          id: tx.orig_id,
          userId: tx.orig_user_id,
          username: tx.orig_username,
          amount: parseFloat(tx.orig_amount),
          type: tx.orig_type,
          createdAt: tx.orig_created_at
        },
        referrals: []
      };
    }
    
    txGroups[key].referrals.push({
      id: tx.ref_id,
      userId: tx.ref_user_id,
      username: tx.ref_username,
      amount: parseFloat(tx.ref_amount),
      type: tx.ref_type,
      description: tx.ref_description,
      createdAt: tx.ref_created_at
    });
  });
  
  // Проверяем процентное соотношение для каждой группы
  const results = [];
  
  for (const key in txGroups) {
    const group = txGroups[key];
    const originalAmount = group.original.amount;
    
    // Извлекаем уровень из описания каждой реферальной транзакции
    const levelPattern = /уровень (\d+)/i;
    
    group.referrals.forEach(refTx => {
      let level = 0;
      if (refTx.description) {
        const match = refTx.description.match(levelPattern);
        if (match && match[1]) {
          level = parseInt(match[1], 10);
        }
      }
      
      if (level > 0 && level <= 20) {
        const expectedPercentage = LEVEL_PERCENTAGES[level] || 0;
        const expectedAmount = originalAmount * (expectedPercentage / 100);
        
        // Допустимая погрешность из-за округления
        const tolerance = 0.000001;
        const actualAmount = refTx.amount;
        const difference = Math.abs(actualAmount - expectedAmount);
        const isCorrect = difference <= tolerance;
        
        results.push({
          originalId: group.original.id,
          originalAmount,
          originalUser: group.original.username,
          referralUser: refTx.username,
          level,
          expectedPercentage,
          expectedAmount,
          actualAmount,
          isCorrect,
          differenceAmount: difference
        });
      }
    });
  }
  
  // Выводим результаты проверки
  console.log('\n=== Результаты проверки процентных ставок ===');
  
  // Сортируем по уровню для более удобного вывода
  results.sort((a, b) => a.level - b.level);
  
  const correctCount = results.filter(r => r.isCorrect).length;
  const incorrectCount = results.length - correctCount;
  
  for (let level = 1; level <= 20; level++) {
    const levelResults = results.filter(r => r.level === level);
    const levelCorrect = levelResults.filter(r => r.isCorrect).length;
    const levelIncorrect = levelResults.length - levelCorrect;
    
    if (levelResults.length > 0) {
      console.log(`Уровень ${level} (${LEVEL_PERCENTAGES[level]}%): ${levelResults.length} проверок, ${levelCorrect} корректных, ${levelIncorrect} некорректных`);
      
      if (levelIncorrect > 0) {
        const incorrectExamples = levelResults.filter(r => !r.isCorrect).slice(0, 3);
        
        incorrectExamples.forEach(ex => {
          console.log(`  ⚠️ Пример несоответствия: Оригинал: ${ex.originalAmount} UNI, Ожидалось: ${ex.expectedAmount.toFixed(6)} UNI, Фактически: ${ex.actualAmount.toFixed(6)} UNI, Разница: ${ex.differenceAmount.toFixed(6)} UNI`);
        });
      }
    } else {
      console.log(`Уровень ${level} (${LEVEL_PERCENTAGES[level]}%): Нет данных для проверки`);
    }
  }
  
  // Итоговая статистика
  console.log('\n=== Итоговая статистика проверки ===');
  console.log(`Всего проверено: ${results.length} реферальных начислений`);
  console.log(`Корректных начислений: ${correctCount} (${((correctCount / results.length) * 100).toFixed(2)}%)`);
  console.log(`Некорректных начислений: ${incorrectCount} (${((incorrectCount / results.length) * 100).toFixed(2)}%)`);
  
  if (incorrectCount === 0) {
    console.log('✅ Все проверенные начисления корректны и соответствуют процентным ставкам');
  } else {
    console.log('⚠️ Обнаружены несоответствия в начислениях по реферальной программе');
  }
  
  return {
    resultsCount: results.length,
    correctCount,
    incorrectCount,
    percentCorrect: (correctCount / results.length) * 100,
    results
  };
}

/**
 * Основная функция
 */
async function main() {
  try {
    console.log('=== Запуск проверки реферальной программы ===');
    
    // Получаем текущую структуру реферальной программы
    const referralStructure = await getReferralStructure();
    
    // Анализируем реферальные начисления по уровням
    const levelAnalysis = await analyzeReferralLevels();
    
    // Проверяем соответствие начислений процентным ставкам
    const percentageCheck = await checkReferralPercentages();
    
    console.log('\n=== Проверка реферальной программы завершена ===');
    
    return {
      success: true,
      referralStructure,
      levelAnalysis,
      percentageCheck
    };
  } catch (error) {
    console.error('Ошибка при проверке реферальной программы:', error);
    return { success: false, error: error.message };
  } finally {
    // Завершаем подключение к БД
    await pool.end();
  }
}

// Запускаем основную функцию
try {
  const result = await main();
  if (result.success) {
    console.log('Проверка успешно завершена');
  } else {
    console.error('Проверка завершилась с ошибкой:', result.error);
    process.exit(1);
  }
} catch (error) {
  console.error('Непредвиденная ошибка:', error);
  process.exit(1);
}