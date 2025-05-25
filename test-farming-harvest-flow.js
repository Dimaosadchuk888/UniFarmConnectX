/**
 * Комплексный тест потока сбора урожая (harvest) в фарминге
 * 
 * Этот скрипт выполняет полное тестирование функциональности сбора урожая в фарминге:
 * 1. Проверяет информацию о фарминге пользователя
 * 2. Проверяет, есть ли урожай для сбора
 * 3. Выполняет сбор урожая
 * 4. Проверяет успешное выполнение сбора
 * 5. Проверяет обновление баланса пользователя
 * 
 * Запуск: node test-farming-harvest-flow.js <user_id>
 * Пример: node test-farming-harvest-flow.js 1
 */

const fetch = require('node-fetch');

// Базовый URL API
const API_BASE_URL = process.env.API_URL || 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app';

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
 * Выполняет запрос на сбор урожая с фарминга
 * @param {number} userId ID пользователя
 * @returns {Promise<object>} Результат сбора урожая
 */
async function harvestFarming(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/uni-farming/harvest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    
    // Проверяем HTTP статус
    console.log(`[i] Статус ответа сбора урожая: ${response.status} ${response.statusText}`);
    
    // Получаем тело ответа в любом случае для анализа
    const responseBody = await response.text();
    
    // Пытаемся распарсить JSON
    try {
      const jsonResponse = JSON.parse(responseBody);
      if (!response.ok && jsonResponse.error) {
        throw new Error(`Ошибка сбора урожая: ${jsonResponse.error.message || 'Неизвестная ошибка'}`);
      }
      
      return jsonResponse;
    } catch (parseError) {
      console.error('Ошибка разбора JSON ответа:', parseError);
      console.log('Оригинальный ответ:', responseBody);
      throw new Error(`Получен неверный формат ответа: ${responseBody.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error('Ошибка при сборе урожая с фарминга:', error);
    throw error;
  }
}

/**
 * Выполняет проверку процесса сбора урожая из фарминга
 * @param {number} userId ID пользователя
 * @returns {Promise<void>}
 */
async function testHarvestFlow(userId) {
  console.log(`Начинаем тестирование потока сбора урожая из фарминга для пользователя ID=${userId}`);
  console.log('------------------------------------------------------------');
  
  try {
    // Шаг 1: Проверяем начальный баланс
    const initialBalanceResponse = await getUserBalance(userId);
    if (!initialBalanceResponse.success) {
      throw new Error('Не удалось получить начальный баланс пользователя');
    }
    
    const initialBalance = parseFloat(initialBalanceResponse.data.uni);
    console.log(`[1] Начальный баланс UNI: ${initialBalance}`);
    
    // Шаг 2: Получаем информацию о фарминге
    const farmingResponse = await getFarmingInfo(userId);
    if (!farmingResponse.success) {
      throw new Error('Не удалось получить информацию о фарминге');
    }
    
    console.log(`[2] Информация о фарминге:`);
    console.log(`    - Общий APY: ${farmingResponse.data.total_apy || 'N/A'}%`);
    console.log(`    - Активный: ${farmingResponse.data.is_active ? 'Да' : 'Нет'}`);
    console.log(`    - Баланс в фарминге: ${farmingResponse.data.balance || 0}`);
    console.log(`    - Доступно для сбора: ${farmingResponse.data.rewards || 0}`);
    
    // Проверяем, есть ли доступный урожай для сбора
    const availableRewards = parseFloat(farmingResponse.data.rewards || 0);
    if (availableRewards <= 0) {
      console.log('\n[!] Нет доступного урожая для сбора. Тест завершен.');
      return;
    }
    
    console.log(`[3] Доступен урожай для сбора: ${availableRewards} UNI`);
    
    // Шаг 3: Выполняем сбор урожая
    console.log(`[4] Выполнение сбора урожая...`);
    const harvestResponse = await harvestFarming(userId);
    
    if (!harvestResponse.success) {
      throw new Error(`Сбор урожая не удался: ${JSON.stringify(harvestResponse)}`);
    }
    
    console.log(`[4] Сбор урожая выполнен успешно!`);
    console.log(`    - Детали ответа: ${JSON.stringify(harvestResponse.data || {})}`);
    
    // Шаг 4: Проверяем баланс после сбора урожая
    const afterHarvestBalanceResponse = await getUserBalance(userId);
    if (!afterHarvestBalanceResponse.success) {
      throw new Error('Не удалось получить баланс после сбора урожая');
    }
    
    const afterHarvestBalance = parseFloat(afterHarvestBalanceResponse.data.uni);
    const balanceDifference = afterHarvestBalance - initialBalance;
    
    console.log(`[5] Баланс после сбора урожая: ${afterHarvestBalance} UNI`);
    console.log(`    - Разница баланса: +${balanceDifference} UNI`);
    
    if (Math.abs(balanceDifference - availableRewards) > 0.001) {
      console.warn(`[!] Внимание: разница баланса (${balanceDifference}) не соответствует сумме урожая (${availableRewards})`);
    }
    
    // Шаг 5: Проверяем обновленную информацию о фарминге
    const updatedFarmingResponse = await getFarmingInfo(userId);
    if (!updatedFarmingResponse.success) {
      throw new Error('Не удалось получить обновленную информацию о фарминге');
    }
    
    const updatedRewards = parseFloat(updatedFarmingResponse.data.rewards || 0);
    
    console.log(`[6] Информация о фарминге после сбора урожая:`);
    console.log(`    - Общий APY: ${updatedFarmingResponse.data.total_apy || 'N/A'}%`);
    console.log(`    - Активный: ${updatedFarmingResponse.data.is_active ? 'Да' : 'Нет'}`);
    console.log(`    - Баланс в фарминге: ${updatedFarmingResponse.data.balance || 0}`);
    console.log(`    - Доступно для сбора: ${updatedRewards}`);
    
    // Проверяем, обнулились ли вознаграждения
    if (updatedRewards > 0.001) {
      console.warn(`[!] Внимание: после сбора урожая всё ещё остаются вознаграждения: ${updatedRewards} UNI`);
    }
    
    // Финальный вывод результатов
    console.log('\n------------------------------------------------------------');
    console.log(`[✓] Тестирование потока сбора урожая из фарминга завершено успешно!`);
    console.log('------------------------------------------------------------');
    
  } catch (error) {
    console.error('\n[X] ОШИБКА ПРИ ТЕСТИРОВАНИИ ПОТОКА СБОРА УРОЖАЯ:');
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
      console.error('Использование: node test-farming-harvest-flow.js <user_id>');
      process.exit(1);
    }
    
    // Парсим и валидируем ID пользователя
    const userId = parseInt(args[0]);
    
    if (isNaN(userId) || userId <= 0) {
      console.error('ID пользователя должен быть положительным числом');
      process.exit(1);
    }
    
    // Запускаем тестирование
    await testHarvestFlow(userId);
    
  } catch (error) {
    console.error('Неожиданная ошибка при выполнении скрипта:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
main();