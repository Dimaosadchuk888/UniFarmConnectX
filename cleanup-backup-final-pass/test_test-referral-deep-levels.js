/**
 * Скрипт для тестирования глубоких уровней реферальной системы (до 20)
 * 
 * Этот скрипт создает указанное количество тестовых пользователей (до 21) и настраивает 
 * между ними линейные реферальные связи для тестирования всех 20 уровней реферальной программы.
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
 * Создает тестовых пользователей для глубокого тестирования
 * @param {number} count Количество пользователей для создания (максимум 21 для 20 уровней)
 * @returns {Array} Массив созданных пользователей [{id, username, ref_code}]
 */
async function createDeepTestUsers(count = 21) {
  console.log(`Создание ${count} тестовых пользователей для глубокого тестирования...`);
  
  // Удаляем существующих пользователей deep_test_*
  await executeQuery(`
    DELETE FROM transactions 
    WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'deep_test_%')
      OR source_user_id IN (SELECT id FROM users WHERE username LIKE 'deep_test_%')
  `);
  
  await executeQuery(`
    DELETE FROM referrals
    WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'deep_test_%')
      OR inviter_id IN (SELECT id FROM users WHERE username LIKE 'deep_test_%')
  `);
  
  await executeQuery(`
    DELETE FROM users WHERE username LIKE 'deep_test_%'
  `);
  
  // Создаем новых пользователей
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const username = `deep_test_${i}`;
    const refCode = `DeepTest${i}Code`;
    
    const [createdUser] = await executeQuery(`
      INSERT INTO users (username, ref_code)
      VALUES ($1, $2)
      RETURNING id, username, ref_code
    `, [username, refCode]);
    
    users.push(createdUser);
    console.log(`Создан пользователь ${username} (ID: ${createdUser.id}, ref_code: ${refCode})`);
  }
  
  return users;
}

/**
 * Настраивает глубокие реферальные связи между пользователями
 * @param {Array} users Массив тестовых пользователей
 * @returns {Array} Массив созданных реферальных связей
 */
async function setupDeepReferralRelations(users) {
  console.log('Настройка глубоких реферальных связей...');
  
  const referrals = [];
  
  // Настраиваем линейную реферальную цепочку: 0 <- 1 <- 2 <- 3 ... <- 20
  // Например: user_0 является инвайтером для user_1, user_1 для user_2 и т.д.
  for (let i = 1; i < users.length; i++) {
    const userId = users[i].id;
    const inviterId = users[i - 1].id;
    
    // Создаем прямую связь (level=1)
    const [relation] = await executeQuery(`
      INSERT INTO referrals (user_id, inviter_id, level)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, inviter_id, level
    `, [userId, inviterId, 1]);
    
    referrals.push(relation);
    console.log(`Создана прямая реферальная связь: пользователь ${users[i].username} (ID: ${userId}) -> инвайтер ${users[i - 1].username} (ID: ${inviterId}), уровень 1`);
  }
  
  // Теперь создаем непрямые связи для отображения всех уровней
  // Например, для user_20: user_19 - уровень 1, user_18 - уровень 2, ..., user_0 - уровень 20
  for (let i = 2; i < users.length; i++) {
    const userId = users[i].id;
    
    for (let level = 2; level <= i && level <= 20; level++) {
      const inviterId = users[i - level].id;
      
      const [relation] = await executeQuery(`
        INSERT INTO referrals (user_id, inviter_id, level)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, inviter_id, level
      `, [userId, inviterId, level]);
      
      referrals.push(relation);
      console.log(`Создана непрямая реферальная связь: пользователь ${users[i].username} (ID: ${userId}) -> инвайтер ${users[i - level].username} (ID: ${inviterId}), уровень ${level}`);
    }
  }
  
  return referrals;
}

/**
 * Создает тестовую транзакцию фарминга для последнего пользователя и реферальные начисления для всех уровней
 * @param {Array} users Массив тестовых пользователей
 * @param {number} amount Сумма транзакции
 * @returns {Array} Массив созданных транзакций
 */
async function createDeepTestTransactions(users, amount = 100) {
  const lastUser = users[users.length - 1];
  console.log(`Создание тестовой транзакции фарминга для пользователя ${lastUser.username} (ID: ${lastUser.id}) на сумму ${amount}...`);
  
  // Создаем основную транзакцию
  const [mainTransaction] = await executeQuery(`
    INSERT INTO transactions (user_id, amount, type, source, category, status)
    VALUES ($1, $2, 'income', 'farming', 'farming_reward', 'completed')
    RETURNING id, user_id, amount, type, source, category, status, created_at
  `, [lastUser.id, amount]);
  
  console.log(`Создана основная транзакция: ID ${mainTransaction.id}, сумма ${amount}`);
  
  const transactions = [mainTransaction];
  
  // Создаем реферальные начисления для всех уровней
  for (let level = 1; level <= Math.min(users.length - 1, 20); level++) {
    const inviterIndex = users.length - 1 - level; // Последний - level
    const inviterId = users[inviterIndex].id;
    const percentage = LEVEL_PERCENTAGES[level] || 0;
    const refAmount = amount * (percentage / 100);
    
    const [refTransaction] = await executeQuery(`
      INSERT INTO transactions (user_id, amount, type, category, source, source_user_id, status)
      VALUES ($1, $2, 'income', 'referral_bonus', 'referral', $3, 'completed')
      RETURNING id, user_id, amount, type, source, category, source_user_id, status, created_at
    `, [inviterId, refAmount, lastUser.id]);
    
    transactions.push(refTransaction);
    console.log(`Создана реферальная транзакция: ID ${refTransaction.id}, получатель ${users[inviterIndex].username} (ID: ${inviterId}), уровень ${level}, сумма ${refAmount} (${percentage}%)`);
  }
  
  return transactions;
}

/**
 * Проверяет созданные реферальные транзакции
 * @param {Array} transactions Массив созданных транзакций
 * @returns {Object} Результат проверки
 */
async function verifyDeepReferralTransactions(transactions) {
  console.log('\n=== Проверка реферальных транзакций ===');
  
  const sourceTransaction = transactions[0];
  const sourceAmount = parseFloat(sourceTransaction.amount);
  
  const referralTransactions = transactions.slice(1);
  let success = true;
  const errors = [];
  
  // Группируем транзакции по уровням
  const levelTransactions = {};
  
  for (let i = 0; i < referralTransactions.length; i++) {
    const level = i + 1; // Уровень соответствует индексу + 1
    const tx = referralTransactions[i];
    const amount = parseFloat(tx.amount);
    
    const expectedPercentage = LEVEL_PERCENTAGES[level] || 0;
    const expectedAmount = sourceAmount * (expectedPercentage / 100);
    
    const tolerance = 0.000001;
    const difference = Math.abs(amount - expectedAmount);
    const isCorrect = difference <= tolerance;
    
    levelTransactions[level] = {
      transaction: tx,
      amount,
      expectedAmount,
      expectedPercentage,
      isCorrect,
      difference
    };
    
    if (isCorrect) {
      console.log(`✅ Уровень ${level}: Ожидалось ${expectedAmount} UNI (${expectedPercentage}%), получено ${amount} UNI`);
    } else {
      const error = `Некорректная сумма для уровня ${level}: Ожидалось ${expectedAmount} UNI (${expectedPercentage}%), получено ${amount} UNI. Разница: ${difference} UNI`;
      console.error(`❌ ${error}`);
      errors.push(error);
      success = false;
    }
  }
  
  return {
    success,
    errors,
    levelTransactions,
    testedLevels: referralTransactions.length,
    successCount: Object.values(levelTransactions).filter(lt => lt.isCorrect).length,
    errorCount: errors.length
  };
}

/**
 * Запускает тестирование глубоких уровней реферальной системы
 * @param {number} levelCount Количество уровней для тестирования (максимум 20)
 * @param {number} testAmount Сумма тестовой транзакции
 * @returns {Object} Результат тестирования
 */
async function runDeepReferralTest(levelCount = 20, testAmount = 100) {
  try {
    console.log(`=== Запуск тестирования реферальной системы для ${levelCount} уровней ===`);
    
    // Ограничиваем количество уровней до 20
    levelCount = Math.min(levelCount, 20);
    
    // Нам нужно levelCount + 1 пользователей для тестирования levelCount уровней
    const userCount = levelCount + 1;
    
    // Создаем тестовых пользователей
    const users = await createDeepTestUsers(userCount);
    
    // Настраиваем реферальные связи
    const referrals = await setupDeepReferralRelations(users);
    
    // Создаем тестовые транзакции
    const transactions = await createDeepTestTransactions(users, testAmount);
    
    // Проверяем правильность реферальных начислений
    const verificationResult = await verifyDeepReferralTransactions(transactions);
    
    console.log('\n=== Результаты тестирования ===');
    console.log(`Протестировано уровней: ${verificationResult.testedLevels}`);
    console.log(`Успешных проверок: ${verificationResult.successCount}`);
    console.log(`Ошибок: ${verificationResult.errorCount}`);
    
    if (verificationResult.success) {
      console.log(`✅ Тестирование реферальной системы для ${levelCount} уровней завершено успешно`);
    } else {
      console.error(`❌ Тестирование реферальной системы для ${levelCount} уровней завершено с ошибками`);
      console.error('Ошибки:');
      verificationResult.errors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    }
    
    return {
      success: verificationResult.success,
      users,
      referrals,
      transactions,
      verificationResult
    };
  } catch (error) {
    console.error('Ошибка при тестировании реферальной системы:', error);
    return { success: false, error: error.message };
  } finally {
    // Завершаем подключение к БД
    await pool.end();
  }
}

// Запускаем тестирование с переданными параметрами или по умолчанию
const args = process.argv.slice(2);
const levelCount = parseInt(args[0], 10) || 20; // По умолчанию тестируем все 20 уровней
const testAmount = parseFloat(args[1]) || 100;

runDeepReferralTest(levelCount, testAmount)
  .then(result => {
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Необработанная ошибка:', error);
    process.exit(1);
  });