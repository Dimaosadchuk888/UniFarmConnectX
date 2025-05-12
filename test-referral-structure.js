/**
 * Скрипт для создания и тестирования 20-уровневой реферальной структуры
 * Безопасно создает тестовых пользователей и устанавливает между ними реферальные связи
 */

import { exec } from 'child_process';
import pg from 'pg';
import fetch from 'node-fetch';
import { promisify } from 'util';

const execAsync = promisify(exec);
const { Pool } = pg;

// Подключение к базе данных через переменную окружения
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Конфигурация
const CONFIG = {
  // Количество уровней для тестирования
  LEVELS: 20,
  // Префикс для имен тестовых пользователей
  USER_PREFIX: 'test_ref_lvl',
  // ID существующего пользователя, который будет на вершине структуры
  ROOT_USER_ID: 1,
  // Базовая сумма для добавления на баланс
  BASE_BALANCE: 1000,
  // Базовая сумма для внесения депозита
  DEPOSIT_AMOUNT: 500,
  // Использовать API вместо прямых запросов к БД
  USE_API: true,
  // Базовый URL для API запросов
  API_URL: 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev:3000/api'
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
 * Создает нового тестового пользователя через API или напрямую в БД
 */
async function createTestUser(level) {
  const username = `${CONFIG.USER_PREFIX}_${level}`;
  
  if (CONFIG.USE_API) {
    console.log(`Создание тестового пользователя через API: ${username}`);
    
    try {
      const response = await fetch(`${CONFIG.API_URL}/users/create-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-development-mode': 'true'
        },
        body: JSON.stringify({ username })
      });
      
      if (!response.ok) {
        throw new Error(`API вернул статус ${response.status}`);
      }
      
      const data = await response.json();
      return data.data.id;
    } catch (error) {
      console.error(`Ошибка при создании пользователя через API: ${error.message}`);
      
      // Запасной вариант через командную строку, если скрипт существует
      try {
        console.log(`Попытка создать пользователя через скрипт: ${username}`);
        const { stdout } = await execAsync(`node scripts/add-test-user.js --username ${username}`);
        console.log(stdout);
        
        // Получаем ID созданного пользователя
        const users = await executeQuery(
          'SELECT id FROM users WHERE username = $1',
          [username]
        );
        
        if (users.length > 0) {
          return users[0].id;
        }
        throw new Error('Не удалось получить ID созданного пользователя');
      } catch (scriptError) {
        console.error(`Ошибка при создании пользователя через скрипт: ${scriptError.message}`);
        throw scriptError;
      }
    }
  } else {
    // Создание напрямую в БД (более опасный вариант)
    console.log(`Создание тестового пользователя напрямую в БД: ${username}`);
    
    const users = await executeQuery(
      'INSERT INTO users (username, guest_id) VALUES ($1, $2) RETURNING id',
      [username, `test-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`]
    );
    
    return users[0].id;
  }
}

/**
 * Устанавливает реферальную связь между двумя пользователями
 */
async function createReferralRelationship(inviteeId, inviterId) {
  if (CONFIG.USE_API) {
    console.log(`Создание реферальной связи через API: ${inviteeId} -> ${inviterId}`);
    
    try {
      const response = await fetch(`${CONFIG.API_URL}/referral/create-relationship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-development-mode': 'true'
        },
        body: JSON.stringify({ userId: inviteeId, inviterId: inviterId })
      });
      
      if (!response.ok) {
        throw new Error(`API вернул статус ${response.status}`);
      }
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error(`Ошибка при создании реферальной связи через API: ${error.message}`);
      throw error;
    }
  } else {
    // Создание связи напрямую в БД (более опасный вариант)
    console.log(`Создание реферальной связи напрямую в БД: ${inviteeId} -> ${inviterId}`);
    
    await executeQuery(
      'INSERT INTO referrals (user_id, inviter_id, level) VALUES ($1, $2, $3)',
      [inviteeId, inviterId, 1]
    );
    
    return true;
  }
}

/**
 * Добавляет средства на баланс пользователя
 */
async function addBalance(userId, amount) {
  try {
    console.log(`Попытка добавить баланс пользователю ${userId} через скрипт: ${amount} UNI`);
    const { stdout } = await execAsync(`node add-test-balance.js ${userId} ${amount}`);
    console.log(stdout);
    return true;
  } catch (error) {
    console.error(`Ошибка при добавлении баланса: ${error.message}`);
    throw error;
  }
}

/**
 * Создает депозит в фарминг
 */
async function createFarmingDeposit(userId, amount) {
  try {
    console.log(`Создание депозита в фарминг для пользователя ${userId}: ${amount} UNI`);
    const { stdout } = await execAsync(`node test-farming-deposit.js ${userId} ${amount}`);
    console.log(stdout);
    return true;
  } catch (error) {
    console.error(`Ошибка при создании депозита: ${error.message}`);
    
    // Попробуем через API если скрипта нет
    try {
      const response = await fetch(`${CONFIG.API_URL}/uni-farming/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-development-mode': 'true',
          'x-development-user-id': userId.toString()
        },
        body: JSON.stringify({ amount: amount.toString() })
      });
      
      if (!response.ok) {
        throw new Error(`API вернул статус ${response.status}`);
      }
      
      return true;
    } catch (apiError) {
      console.error(`Ошибка при создании депозита через API: ${apiError.message}`);
      throw apiError;
    }
  }
}

/**
 * Запускает операцию получения дохода от фарминга (harvest)
 */
async function harvestFarming(userId) {
  try {
    console.log(`Запуск операции harvest для пользователя ${userId}`);
    const { stdout } = await execAsync(`node test-farming-harvest.js ${userId}`);
    console.log(stdout);
    return true;
  } catch (error) {
    console.error(`Ошибка при выполнении harvest: ${error.message}`);
    
    // Попробуем через API если скрипта нет
    try {
      const response = await fetch(`${CONFIG.API_URL}/uni-farming/harvest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-development-mode': 'true',
          'x-development-user-id': userId.toString()
        }
      });
      
      if (!response.ok) {
        throw new Error(`API вернул статус ${response.status}`);
      }
      
      return true;
    } catch (apiError) {
      console.error(`Ошибка при выполнении harvest через API: ${apiError.message}`);
      throw apiError;
    }
  }
}

/**
 * Проверяет транзакции пользователя, включая реферальные
 */
async function checkTransactions(userId) {
  console.log(`Проверка транзакций для пользователя ${userId}`);
  
  const transactions = await executeQuery(
    `SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [userId]
  );
  
  console.log(`Найдено ${transactions.length} транзакций:`);
  transactions.forEach(tx => {
    console.log(`ID: ${tx.id}, Тип: ${tx.type}, Сумма: ${tx.amount}, Валюта: ${tx.currency}, Время: ${tx.created_at}`);
  });
  
  // Подсчет реферальных транзакций
  const referralTransactions = transactions.filter(tx => tx.type && tx.type.includes('referral'));
  console.log(`Из них реферальных: ${referralTransactions.length}`);
  
  return transactions;
}

/**
 * Создает полную 20-уровневую структуру рефералов
 */
async function createReferralStructure() {
  console.log('=== Создание 20-уровневой реферальной структуры ===');
  
  // Массив для хранения созданных пользователей
  const users = [CONFIG.ROOT_USER_ID];
  
  // Создаем пользователей для каждого уровня
  for (let level = 1; level <= CONFIG.LEVELS; level++) {
    console.log(`\n=== Создание пользователя для уровня ${level} ===`);
    const userId = await createTestUser(level);
    console.log(`Создан пользователь с ID ${userId} для уровня ${level}`);
    
    // Добавляем пользователя в массив
    users.push(userId);
    
    // Устанавливаем реферальную связь с предыдущим уровнем
    await createReferralRelationship(userId, users[level - 1]);
    console.log(`Установлена реферальная связь: ${userId} -> ${users[level - 1]}`);
    
    // Добавляем средства на баланс
    await addBalance(userId, CONFIG.BASE_BALANCE);
    console.log(`Добавлено ${CONFIG.BASE_BALANCE} UNI на баланс пользователя ${userId}`);
  }
  
  return users;
}

/**
 * Тестирует реферальную структуру, создавая депозит и запуская harvest
 */
async function testReferralStructure(users) {
  console.log('\n=== Тестирование реферальной структуры ===');
  
  // Создаем депозит для пользователя последнего уровня
  const lastUserId = users[users.length - 1];
  await createFarmingDeposit(lastUserId, CONFIG.DEPOSIT_AMOUNT);
  console.log(`Создан депозит ${CONFIG.DEPOSIT_AMOUNT} UNI для пользователя ${lastUserId}`);
  
  // Даем время на обработку депозита
  console.log('Ожидание 5 секунд для обработки депозита...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Запускаем harvest для сбора дохода
  await harvestFarming(lastUserId);
  console.log(`Выполнен harvest для пользователя ${lastUserId}`);
  
  // Даем время на распространение реферальных начислений
  console.log('Ожидание 10 секунд для обработки реферальных начислений...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  return true;
}

/**
 * Проверяет распределение реферальных бонусов по всей структуре
 */
async function checkReferralBonuses(users) {
  console.log('\n=== Проверка распределения реферальных бонусов ===');
  
  const results = [];
  
  // Проверяем транзакции для каждого пользователя в структуре
  for (let i = 0; i < users.length; i++) {
    console.log(`\n--- Проверка пользователя на уровне ${i} (ID: ${users[i]}) ---`);
    const transactions = await checkTransactions(users[i]);
    
    // Находим реферальные транзакции
    const referralTransactions = transactions.filter(tx => tx.type && tx.type.includes('referral'));
    
    results.push({
      userId: users[i],
      level: i,
      totalTransactions: transactions.length,
      referralTransactions: referralTransactions.length,
      referralAmount: referralTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
    });
  }
  
  // Выводим сводку
  console.log('\n=== Сводка по реферальным бонусам ===');
  results.forEach(result => {
    console.log(`Уровень ${result.level}, Пользователь ${result.userId}: ${result.referralTransactions} реферальных транзакций на сумму ${result.referralAmount} UNI`);
  });
  
  return results;
}

/**
 * Основная функция
 */
async function main() {
  try {
    console.log('Начало тестирования реферальной структуры...');
    
    // Создаем структуру
    const users = await createReferralStructure();
    console.log('Структура рефералов успешно создана:', users);
    
    // Тестируем
    await testReferralStructure(users);
    
    // Проверяем результаты
    const results = await checkReferralBonuses(users);
    
    console.log('\nТестирование завершено успешно!');
    return { success: true, users, results };
  } catch (error) {
    console.error('Ошибка при тестировании реферальной структуры:', error);
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
    console.log('Тестирование успешно завершено.');
  } else {
    console.error('Тестирование завершилось с ошибкой:', result.error);
    process.exit(1);
  }
} catch (error) {
  console.error('Непредвиденная ошибка:', error);
  process.exit(1);
}