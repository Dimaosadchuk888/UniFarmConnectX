/**
 * Тестирование депозита в UNI фарминг
 * 
 * Этот скрипт тестирует АPI депозита в фарминг, проверяя валидацию и обработку различных сценариев
 * 
 * Запуск: node test-farming-deposit.js <user_id> <amount>
 * Пример: node test-farming-deposit.js 1 100
 */

import fetch from 'node-fetch';

// Базовый URL API
const API_BASE_URL = process.env.API_URL || 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev';

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
 * Получает информацию о фарминге пользователя
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
 * Выполняет депозит в фарминг
 * @param {number} userId ID пользователя
 * @param {number|string} amount Сумма депозита
 * @returns {Promise<object>} Результат депозита
 */
async function depositToFarming(userId, amount) {
  try {
    console.log(`\n[🚀] Отправка запроса на депозит ${amount} UNI в фарминг для пользователя ID=${userId}...`);
    
    const response = await fetch(`${API_BASE_URL}/api/uni-farming/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        amount: amount.toString()  // API ожидает строку
      })
    });
    
    const responseBody = await response.text();
    
    try {
      const jsonResponse = JSON.parse(responseBody);
      console.log(`[📄] Статус: ${response.status} ${response.statusText}`);
      
      if (response.ok && jsonResponse.success) {
        console.log(`[✅] Депозит успешно выполнен`);
        console.log(`[📊] Данные ответа:`, JSON.stringify(jsonResponse.data || {}, null, 2));
        return jsonResponse;
      } else {
        console.log(`[❌] Ошибка депозита: ${jsonResponse.error?.message || 'Неизвестная ошибка'}`);
        console.log(`[📝] Детали:`, JSON.stringify(jsonResponse, null, 2));
        return jsonResponse;
      }
    } catch (parseError) {
      console.log(`[❌] Ошибка разбора ответа как JSON`);
      console.log(`[📝] Сырой ответ:`, responseBody.substring(0, 200));
      throw new Error(`Невалидный JSON в ответе: ${parseError.message}`);
    }
  } catch (error) {
    console.error('[❌] Ошибка при выполнении запроса депозита:', error);
    throw error;
  }
}

/**
 * Выполняет полное тестирование депозита
 * @param {number} userId ID пользователя
 * @param {number|string} amount Сумма депозита
 */
async function testDeposit(userId, amount) {
  console.log('====================================================================');
  console.log(`[🧪] НАЧИНАЕМ ТЕСТИРОВАНИЕ ДЕПОЗИТА В ФАРМИНГ`);
  console.log(`[👤] Пользователь ID: ${userId}`);
  console.log(`[💰] Сумма: ${amount} UNI`);
  console.log('====================================================================');
  
  try {
    // Шаг 1: Проверяем начальный баланс
    console.log('\n[1️⃣] Проверка начального баланса...');
    const balanceResponse = await getUserBalance(userId);
    
    if (!balanceResponse.success) {
      throw new Error('Не удалось получить начальный баланс пользователя');
    }
    
    const initialBalance = parseFloat(balanceResponse.data.uni);
    console.log(`[💵] Текущий баланс UNI: ${initialBalance}`);
    
    // Проверяем достаточно ли средств
    const depositAmount = parseFloat(amount);
    if (initialBalance < depositAmount) {
      console.log(`[⚠️] ПРЕДУПРЕЖДЕНИЕ: Недостаточно средств для депозита (${initialBalance} < ${depositAmount})`);
      console.log(`[⚠️] Тест будет продолжен, ожидаем ошибку от API`);
    }
    
    // Шаг 2: Получаем начальную информацию о фарминге
    console.log('\n[2️⃣] Получение информации о текущем состоянии фарминга...');
    const farmingInfoResponse = await getFarmingInfo(userId);
    
    if (!farmingInfoResponse.success) {
      throw new Error('Не удалось получить информацию о фарминге');
    }
    
    console.log(`[📈] Текущий APY: ${farmingInfoResponse.data.total_apy || 'N/A'}%`);
    console.log(`[💼] Текущий баланс в фарминге: ${farmingInfoResponse.data.balance || 0} UNI`);
    
    // Шаг 3: Выполняем депозит
    console.log('\n[3️⃣] Выполнение депозита...');
    const depositResponse = await depositToFarming(userId, amount);
    
    // Шаг 4: Проверяем баланс после депозита (если депозит успешен)
    if (depositResponse.success) {
      console.log('\n[4️⃣] Проверка баланса после депозита...');
      const afterDepositBalanceResponse = await getUserBalance(userId);
      
      if (!afterDepositBalanceResponse.success) {
        throw new Error('Не удалось получить баланс после депозита');
      }
      
      const afterDepositBalance = parseFloat(afterDepositBalanceResponse.data.uni);
      console.log(`[💵] Баланс после депозита: ${afterDepositBalance} UNI`);
      console.log(`[🔄] Разница: ${initialBalance - afterDepositBalance} UNI`);
      
      // Шаг 5: Проверяем информацию о фарминге после депозита
      console.log('\n[5️⃣] Получение обновленной информации о фарминге...');
      const afterDepositFarmingResponse = await getFarmingInfo(userId);
      
      if (!afterDepositFarmingResponse.success) {
        throw new Error('Не удалось получить информацию о фарминге после депозита');
      }
      
      console.log(`[📈] Текущий APY: ${afterDepositFarmingResponse.data.total_apy || 'N/A'}%`);
      console.log(`[💼] Обновленный баланс в фарминге: ${afterDepositFarmingResponse.data.balance || 0} UNI`);
      console.log(`[🔄] Разница: +${parseFloat(afterDepositFarmingResponse.data.balance || 0) - parseFloat(farmingInfoResponse.data.balance || 0)} UNI`);
    }
    
    // Итог
    console.log('\n====================================================================');
    console.log(`[🏁] РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ: ${depositResponse.success ? '✅ УСПЕШНО' : '❌ ОШИБКА'}`);
    console.log('====================================================================');
    
  } catch (error) {
    console.error('\n[❌] ОШИБКА ПРИ ВЫПОЛНЕНИИ ТЕСТА:');
    console.error(error);
    console.log('====================================================================');
  }
}

/**
 * Запуск скрипта с параметрами командной строки
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Проверяем наличие необходимых аргументов
    if (args.length < 2) {
      console.error('Необходимо указать ID пользователя и сумму депозита');
      console.error('Использование: node test-farming-deposit.js <user_id> <amount>');
      process.exit(1);
    }
    
    // Парсим аргументы
    const userId = parseInt(args[0]);
    const amount = args[1];
    
    if (isNaN(userId) || userId <= 0) {
      console.error('ID пользователя должен быть положительным числом');
      process.exit(1);
    }
    
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      console.error('Сумма депозита должна быть положительным числом');
      process.exit(1);
    }
    
    // Запускаем тестирование
    await testDeposit(userId, amount);
    
  } catch (error) {
    console.error('Неожиданная ошибка при выполнении скрипта:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
main();