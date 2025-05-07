/**
 * Скрипт для тестирования API множественного UNI фарминга (новой версии)
 * Выполняет серию запросов к API для проверки основных операций:
 * 1. Получение информации о фарминге
 * 2. Создание депозита
 * 3. Получение списка депозитов
 * 4. Обновление баланса фарминга
 */

import fetch from 'node-fetch';

// Конфигурация
const API_BASE_URL = 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev'; // Замените на ваш URL
const USER_ID = 11; // ID тестового пользователя

// Вспомогательная функция для выполнения запросов к API
async function callApi(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const options = {
    method,
    headers
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`\n[API Request] ${method} ${url}`);
  if (body) console.log('Request Body:', body);

  try {
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    console.log(`Response Status: ${response.status} ${response.statusText}`);
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('Response Data:', JSON.stringify(responseData, null, 2));
      return { success: true, data: responseData, status: response.status };
    } catch (e) {
      console.log('Response Text:', responseText);
      return { success: false, error: 'Invalid JSON response', text: responseText, status: response.status };
    }
  } catch (error) {
    console.error(`Error calling API: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Тестовые функции

// 1. Получение информации о фарминге
async function testGetFarmingInfo() {
  console.log('\n===== Тестирование получения информации о фарминге =====');
  return await callApi(`/api/new-uni-farming/info?user_id=${USER_ID}`);
}

// 2. Создание депозита
async function testCreateDeposit(amount = '1000') {
  console.log('\n===== Тестирование создания депозита =====');
  return await callApi('/api/new-uni-farming/deposit', 'POST', {
    user_id: USER_ID,
    amount
  });
}

// 3. Получение списка депозитов
async function testGetDeposits() {
  console.log('\n===== Тестирование получения списка депозитов =====');
  return await callApi(`/api/new-uni-farming/deposits?user_id=${USER_ID}`);
}

// 4. Обновление баланса фарминга
async function testUpdateFarmingBalance() {
  console.log('\n===== Тестирование обновления баланса фарминга =====');
  return await callApi(`/api/new-uni-farming/update-balance?user_id=${USER_ID}`);
}

// Запуск всех тестов
async function runAllTests() {
  console.log('🚀 Начинаем тестирование API множественного UNI фарминга');
  
  try {
    // Шаг 1: Получаем исходную информацию о фарминге
    await testGetFarmingInfo();
    
    // Шаг 2: Создаем новый депозит
    await testCreateDeposit('1000');
    
    // Шаг 3: Получаем список депозитов
    await testGetDeposits();
    
    // Шаг 4: Обновляем и проверяем баланс фарминга
    await testUpdateFarmingBalance();
    
    // Шаг 5: Снова получаем информацию о фарминге после всех операций
    await testGetFarmingInfo();
    
    console.log('\n✅ Все тесты завершены успешно!');
  } catch (error) {
    console.error('\n❌ Ошибка при выполнении тестов:', error);
  }
}

// Запуск отдельных тестов
async function runSingleTest() {
  // Раскомментируйте нужную строку для тестирования конкретного метода
  // await testGetFarmingInfo();
  // await testCreateDeposit('1000');
  // await testGetDeposits();
  await testUpdateFarmingBalance();
}

// Запускаем все тесты
// runAllTests();

// Запуск одного теста
runSingleTest();