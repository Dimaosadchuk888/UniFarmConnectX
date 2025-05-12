/**
 * Скрипт для тестирования реферальной системы UniFarm
 * 
 * Этот скрипт создает тестовых пользователей, настраивает между ними реферальные связи
 * и выполняет тестовые транзакции для проверки правильности начислений по реферальной программе.
 * 
 * Поддерживает проверку до 20 уровней реферальной программы.
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
 * Создает тестовых пользователей
 * @param {number} count Количество пользователей для создания
 * @returns {Array} Массив созданных пользователей [{id, username, ref_code}]
 */
async function createTestUsers(count = 6) {
  console.log(`Создание ${count} тестовых пользователей...`);
  
  // Сначала проверим, есть ли уже тестовые пользователи
  const existingUsers = await executeQuery(`
    SELECT id, username, ref_code FROM users WHERE username LIKE 'test_ref_%'
  `);
  
  if (existingUsers.length >= count) {
    console.log(`Найдено ${existingUsers.length} существующих тестовых пользователей. Пропускаем создание.`);
    return existingUsers;
  }
  
  // Создаем недостающих пользователей
  const users = [...existingUsers];
  
  for (let i = existingUsers.length; i < count; i++) {
    const username = `test_ref_${i}`;
    const refCode = `TestRef${i}Code`;
    
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
 * Настраивает реферальные связи между пользователями
 * @param {Array} users Массив тестовых пользователей
 * @returns {Array} Массив созданных реферальных связей
 */
async function setupReferralRelations(users) {
  console.log('Настройка реферальных связей...');
  
  // Удаляем существующие реферальные связи для тестовых пользователей
  await executeQuery(`
    DELETE FROM referrals
    WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'test_ref_%')
      OR inviter_id IN (SELECT id FROM users WHERE username LIKE 'test_ref_%')
  `);
  
  const referrals = [];
  
  // Настраиваем реферальную цепочку: 0 <- 1 <- 2 <- 3 <- 4 <- 5 ... и так далее
  for (let i = 1; i < users.length; i++) {
    const userId = users[i].id;
    
    // Для каждого пользователя создаем связи со всеми уровнями инвайтеров
    for (let level = 1; level <= i && level <= 20; level++) {
      const inviterId = users[i - level].id;
      
      const [relation] = await executeQuery(`
        INSERT INTO referrals (user_id, inviter_id, level)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, inviter_id, level
      `, [userId, inviterId, level]);
      
      referrals.push(relation);
      console.log(`Создана реферальная связь: пользователь ${users[i].username} (ID: ${userId}) -> инвайтер ${users[i - level].username} (ID: ${inviterId}), уровень ${level}`);
    }
  }
  
  return referrals;
}

/**
 * Создает тестовую транзакцию фарминга и реферальные начисления
 * @param {number} userId ID пользователя, совершающего транзакцию
 * @param {number} amount Сумма транзакции
 * @param {Array} users Массив тестовых пользователей
 * @returns {Array} Массив созданных транзакций
 */
async function createTestTransactions(userId, amount, users) {
  console.log(`Создание тестовой транзакции фарминга для пользователя с ID ${userId} на сумму ${amount}...`);
  
  // Находим пользователя
  const userIndex = users.findIndex(user => user.id === userId);
  if (userIndex === -1) {
    throw new Error(`Пользователь с ID ${userId} не найден в списке тестовых пользователей`);
  }
  
  // Создаем основную транзакцию
  const [mainTransaction] = await executeQuery(`
    INSERT INTO transactions (user_id, amount, type, source, category, status)
    VALUES ($1, $2, 'income', 'farming', 'farming_reward', 'completed')
    RETURNING id, user_id, amount, type, source, category, status, created_at
  `, [userId, amount]);
  
  console.log(`Создана основная транзакция: ID ${mainTransaction.id}, сумма ${amount}`);
  
  const transactions = [mainTransaction];
  
  // Создаем реферальные начисления для всех уровней
  for (let level = 1; level <= userIndex && level <= 20; level++) {
    const inviterId = users[userIndex - level].id;
    const percentage = LEVEL_PERCENTAGES[level] || 0;
    const refAmount = amount * (percentage / 100);
    
    const [refTransaction] = await executeQuery(`
      INSERT INTO transactions (user_id, amount, type, category, source, source_user_id, status)
      VALUES ($1, $2, 'income', 'referral_bonus', 'referral', $3, 'completed')
      RETURNING id, user_id, amount, type, source, category, source_user_id, status, created_at
    `, [inviterId, refAmount, userId]);
    
    transactions.push(refTransaction);
    console.log(`Создана реферальная транзакция: ID ${refTransaction.id}, получатель ${users[userIndex - level].username} (ID: ${inviterId}), уровень ${level}, сумма ${refAmount} (${percentage}%)`);
  }
  
  return transactions;
}

/**
 * Проверяет созданные реферальные транзакции
 * @param {Array} transactions Массив созданных транзакций
 * @param {Array} users Массив тестовых пользователей
 * @returns {Object} Результат проверки
 */
async function verifyReferralTransactions(transactions, users) {
  console.log('\n=== Проверка реферальных транзакций ===');
  
  const sourceTransaction = transactions[0];
  const sourceAmount = parseFloat(sourceTransaction.amount);
  const sourceUserId = sourceTransaction.user_id;
  
  const referralTransactions = transactions.slice(1);
  let success = true;
  const errors = [];
  
  for (const tx of referralTransactions) {
    const inviterId = tx.user_id;
    const amount = parseFloat(tx.amount);
    
    // Находим уровень реферальной связи
    const [relation] = await executeQuery(`
      SELECT level FROM referrals
      WHERE user_id = $1 AND inviter_id = $2
    `, [sourceUserId, inviterId]);
    
    if (!relation) {
      const error = `Не найдена реферальная связь между пользователями ${sourceUserId} и ${inviterId}`;
      console.error(`❌ ${error}`);
      errors.push(error);
      success = false;
      continue;
    }
    
    const level = relation.level;
    const expectedPercentage = LEVEL_PERCENTAGES[level] || 0;
    const expectedAmount = sourceAmount * (expectedPercentage / 100);
    
    const tolerance = 0.000001;
    const difference = Math.abs(amount - expectedAmount);
    const isCorrect = difference <= tolerance;
    
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
    testedLevels: referralTransactions.length,
    successCount: referralTransactions.filter(tx => success).length,
    errorCount: errors.length
  };
}

/**
 * Запускает полное тестирование реферальной системы
 * @param {number} userCount Количество тестовых пользователей
 * @param {number} testAmount Сумма тестовой транзакции
 * @returns {Object} Результат тестирования
 */
async function runFullReferralTest(userCount = 6, testAmount = 100) {
  try {
    console.log('=== Запуск полного тестирования реферальной системы ===');
    
    // Создаем тестовых пользователей
    const users = await createTestUsers(userCount);
    
    // Настраиваем реферальные связи
    const referrals = await setupReferralRelations(users);
    
    // Создаем тестовые транзакции для последнего пользователя
    const lastUser = users[users.length - 1];
    const transactions = await createTestTransactions(lastUser.id, testAmount, users);
    
    // Проверяем правильность реферальных начислений
    const verificationResult = await verifyReferralTransactions(transactions, users);
    
    console.log('\n=== Результаты тестирования ===');
    console.log(`Протестировано уровней: ${verificationResult.testedLevels}`);
    console.log(`Успешных проверок: ${verificationResult.successCount}`);
    console.log(`Ошибок: ${verificationResult.errorCount}`);
    
    if (verificationResult.success) {
      console.log('✅ Тестирование реферальной системы завершено успешно');
    } else {
      console.error('❌ Тестирование реферальной системы завершено с ошибками');
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
const userCount = parseInt(args[0], 10) || 6;
const testAmount = parseFloat(args[1]) || 100;

runFullReferralTest(userCount, testAmount)
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