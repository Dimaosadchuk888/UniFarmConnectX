/**
 * Комплексный тест потока депозита в фарминге
 * 
 * Этот скрипт выполняет полное тестирование функциональности депозита в фарминге:
 * 1. Добавляет тестовый баланс пользователю через систему ежедневных бонусов
 * 2. Проверяет успешное получение баланса
 * 3. Выполняет депозит средств в фарминг
 * 4. Проверяет успешное выполнение депозита
 * 5. Проверяет обновление статуса фарминга
 * 
 * Запуск: node test-farming-deposit-flow.js <user_id>
 * Пример: node test-farming-deposit-flow.js 1
 */

const fetch = require('node-fetch');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Базовый URL API
const API_BASE_URL = process.env.API_URL || 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app';

// Конфигурация тестирования
const TEST_BALANCE_AMOUNT = 5; // Количество бонусов для начисления
const DEPOSIT_AMOUNT = 1000; // Сумма для депозита в фарминг

/**
 * Получает баланс пользователя
 * @param {number} userId ID пользователя
 * @returns {Promise<object>} Баланс пользователя
 */
async function getUserBalance(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/wallet/balance?user_id=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка при получении баланса: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Ошибка при получении баланса:', error);
    throw error;
  }
}

/**
 * Выполняет запрос на получение информации о статусе фарминга
 * @param {number} userId ID пользователя
 * @returns {Promise<object>} Информация о фарминге
 */
async function getFarmingInfo(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/uni-farming/info?user_id=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка при получении информации о фарминге: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Ошибка при получении информации о фарминге:', error);
    throw error;
  }
}

/**
 * Выполняет запрос на депозит средств в фарминг
 * @param {number} userId ID пользователя
 * @param {number} amount Сумма депозита
 * @returns {Promise<object>} Результат депозита
 */
async function depositToFarming(userId, amount) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/uni-farming/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        amount: amount.toString() // Отправляем как строку, как это делает фронтенд
      })
    });
    
    // Проверяем HTTP статус
    console.log(`[i] Статус ответа депозита: ${response.status} ${response.statusText}`);
    
    // Получаем тело ответа в любом случае для анализа
    const responseBody = await response.text();
    
    // Пытаемся распарсить JSON
    try {
      const jsonResponse = JSON.parse(responseBody);
      if (!response.ok && jsonResponse.error) {
        throw new Error(`Ошибка депозита: ${jsonResponse.error.message || 'Неизвестная ошибка'}`);
      }
      
      return jsonResponse;
    } catch (parseError) {
      console.error('Ошибка разбора JSON ответа:', parseError);
      console.log('Оригинальный ответ:', responseBody);
      throw new Error(`Получен неверный формат ответа: ${responseBody.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error('Ошибка при депозите в фарминг:', error);
    throw error;
  }
}

/**
 * Добавляет тестовый баланс пользователю через скрипт ежедневных бонусов
 * @param {number} userId ID пользователя
 * @returns {Promise<void>}
 */
async function addTestBalance(userId) {
  console.log(`Добавление тестового баланса пользователю ${userId}...`);
  
  try {
    const { stdout, stderr } = await execAsync(`node add-test-balance-bonus.js ${userId} ${TEST_BALANCE_AMOUNT}`);
    
    if (stderr) {
      console.error('Ошибка при добавлении баланса:', stderr);
    }
    
    console.log(stdout);
  } catch (error) {
    console.error('Ошибка при выполнении скрипта начисления баланса:', error);
    throw error;
  }
}

/**
 * Выполняет проверку процесса депозита в фарминг
 * @param {number} userId ID пользователя
 * @returns {Promise<void>}
 */
async function testDepositFlow(userId) {
  console.log(`Начинаем тестирование потока депозита в фарминг для пользователя ID=${userId}`);
  console.log('------------------------------------------------------------');
  
  try {
    // Шаг 1: Проверяем начальный баланс
    const initialBalanceResponse = await getUserBalance(userId);
    if (!initialBalanceResponse.success) {
      throw new Error('Не удалось получить начальный баланс пользователя');
    }
    
    const initialBalance = parseFloat(initialBalanceResponse.data.uni);
    console.log(`[1] Начальный баланс UNI: ${initialBalance}`);
    
    // Шаг 2: Получаем начальную информацию о фарминге
    const initialFarmingResponse = await getFarmingInfo(userId);
    if (!initialFarmingResponse.success) {
      throw new Error('Не удалось получить начальную информацию о фарминге');
    }
    
    console.log(`[2] Информация о фарминге до депозита:`);
    console.log(`    - Общий APY: ${initialFarmingResponse.data.total_apy || 'N/A'}%`);
    console.log(`    - Активный: ${initialFarmingResponse.data.is_active ? 'Да' : 'Нет'}`);
    console.log(`    - Баланс в фарминге: ${initialFarmingResponse.data.balance || 0}`);
    
    // Если баланса недостаточно для депозита, добавляем тестовый баланс
    if (initialBalance < DEPOSIT_AMOUNT) {
      console.log(`[3] Баланс недостаточен для депозита, добавляем тестовый баланс...`);
      await addTestBalance(userId);
      
      // Проверяем обновленный баланс
      const updatedBalanceResponse = await getUserBalance(userId);
      if (!updatedBalanceResponse.success) {
        throw new Error('Не удалось получить обновленный баланс пользователя');
      }
      
      const updatedBalance = parseFloat(updatedBalanceResponse.data.uni);
      console.log(`[3] Обновленный баланс UNI: ${updatedBalance}`);
      
      if (updatedBalance < DEPOSIT_AMOUNT) {
        throw new Error(`Баланса недостаточно для депозита (${updatedBalance} < ${DEPOSIT_AMOUNT})`);
      }
    } else {
      console.log(`[3] Баланс достаточен для депозита, пропускаем добавление тестового баланса`);
    }
    
    // Шаг 4: Выполняем депозит в фарминг
    console.log(`[4] Выполнение депозита ${DEPOSIT_AMOUNT} UNI в фарминг...`);
    const depositResponse = await depositToFarming(userId, DEPOSIT_AMOUNT);
    
    if (!depositResponse.success) {
      throw new Error(`Депозит не удался: ${JSON.stringify(depositResponse)}`);
    }
    
    console.log(`[4] Депозит выполнен успешно!`);
    console.log(`    - Детали ответа: ${JSON.stringify(depositResponse.data || {})}`);
    
    // Шаг 5: Проверяем баланс после депозита
    const afterDepositBalanceResponse = await getUserBalance(userId);
    if (!afterDepositBalanceResponse.success) {
      throw new Error('Не удалось получить баланс после депозита');
    }
    
    const afterDepositBalance = parseFloat(afterDepositBalanceResponse.data.uni);
    const balanceDifference = initialBalance - afterDepositBalance;
    
    console.log(`[5] Баланс после депозита: ${afterDepositBalance} UNI`);
    console.log(`    - Разница баланса: ${balanceDifference} UNI`);
    
    if (Math.abs(balanceDifference - DEPOSIT_AMOUNT) > 0.001) {
      console.warn(`[!] Внимание: разница баланса (${balanceDifference}) не соответствует сумме депозита (${DEPOSIT_AMOUNT})`);
    }
    
    // Шаг 6: Проверяем обновленную информацию о фарминге
    const updatedFarmingResponse = await getFarmingInfo(userId);
    if (!updatedFarmingResponse.success) {
      throw new Error('Не удалось получить обновленную информацию о фарминге');
    }
    
    console.log(`[6] Информация о фарминге после депозита:`);
    console.log(`    - Общий APY: ${updatedFarmingResponse.data.total_apy || 'N/A'}%`);
    console.log(`    - Активный: ${updatedFarmingResponse.data.is_active ? 'Да' : 'Нет'}`);
    console.log(`    - Баланс в фарминге: ${updatedFarmingResponse.data.balance || 0}`);
    
    // Проверяем, стал ли фарминг активным
    if (!updatedFarmingResponse.data.is_active) {
      console.warn('[!] Внимание: фарминг не стал активным после депозита');
    }
    
    // Проверяем, увеличился ли баланс в фарминге
    const initialFarmingBalance = parseFloat(initialFarmingResponse.data.balance || 0);
    const updatedFarmingBalance = parseFloat(updatedFarmingResponse.data.balance || 0);
    const farmingBalanceDifference = updatedFarmingBalance - initialFarmingBalance;
    
    console.log(`    - Разница баланса в фарминге: ${farmingBalanceDifference} UNI`);
    
    if (Math.abs(farmingBalanceDifference - DEPOSIT_AMOUNT) > 0.001) {
      console.warn(`[!] Внимание: разница баланса в фарминге (${farmingBalanceDifference}) не соответствует сумме депозита (${DEPOSIT_AMOUNT})`);
    }
    
    // Финальный вывод результатов
    console.log('\n------------------------------------------------------------');
    console.log(`[✓] Тестирование потока депозита в фарминг завершено успешно!`);
    console.log('------------------------------------------------------------');
    
  } catch (error) {
    console.error('\n[X] ОШИБКА ПРИ ТЕСТИРОВАНИИ ПОТОКА ДЕПОЗИТА:');
    console.error(error);
    console.error('------------------------------------------------------------');
    process.exit(1);
  }
}

/**
 * Запуск скрипта с параметрами командной строки
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Проверяем наличие необходимых аргументов
    if (args.length < 1) {
      console.error('Необходимо указать ID пользователя');
      console.error('Использование: node test-farming-deposit-flow.js <user_id>');
      process.exit(1);
    }
    
    // Парсим и валидируем ID пользователя
    const userId = parseInt(args[0]);
    
    if (isNaN(userId) || userId <= 0) {
      console.error('ID пользователя должен быть положительным числом');
      process.exit(1);
    }
    
    // Запускаем тестирование
    await testDepositFlow(userId);
    
  } catch (error) {
    console.error('Неожиданная ошибка при выполнении скрипта:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
main();