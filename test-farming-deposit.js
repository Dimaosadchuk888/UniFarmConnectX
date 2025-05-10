/**
 * Скрипт для тестирования депозита в фарминг
 */
import fetch from 'node-fetch';

// Базовый URL и ID пользователя для тестирования
const baseUrl = 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev';
const userId = 34; // Тестовый пользователь

// Функция для отправки запроса на API
async function callApi(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return { 
        success: true,
        status: response.status,
        data 
      };
    } else {
      const text = await response.text();
      console.error(`Получен не JSON-ответ от ${endpoint}:`);
      console.error(text.substring(0, 100) + '...');
      return { 
        success: false,
        status: response.status,
        error: 'Not JSON response' 
      };
    }
  } catch (error) {
    console.error(`Ошибка при выполнении запроса к ${endpoint}:`, error);
    return { 
      success: false,
      error: error.message 
    };
  }
}

// Функция для выполнения депозита в фарминг
async function makeFarmingDeposit() {
  console.log(`===== Тестирование депозита в фарминг для пользователя ID: ${userId} =====`);
  
  // 1. Проверяем текущее состояние фарминга пользователя
  console.log('\n1. Получаем текущую информацию о фарминге:');
  const farmingInfo = await callApi(`/api/uni-farming/info?user_id=${userId}`);
  
  if (!farmingInfo.success) {
    console.error('❌ Не удалось получить информацию о фарминге');
    return;
  }
  
  console.log('✅ Информация о фарминге до депозита:');
  console.log(JSON.stringify(farmingInfo.data, null, 2));
  
  // 2. Выполняем депозит
  console.log('\n2. Выполняем депозит в фарминг:');
  const depositAmount = 10; // Сумма для депозита
  
  const depositResult = await callApi(`/api/uni-farming/deposit`, 'POST', {
    user_id: userId,
    amount: depositAmount,
    currency: 'uni'
  });
  
  if (!depositResult.success) {
    console.error('❌ Не удалось выполнить депозит');
    return;
  }
  
  console.log('✅ Результат депозита:');
  console.log(JSON.stringify(depositResult.data, null, 2));
  
  // 3. Проверяем состояние фарминга после депозита
  console.log('\n3. Получаем информацию о фарминге после депозита:');
  const updatedFarmingInfo = await callApi(`/api/uni-farming/info?user_id=${userId}`);
  
  if (!updatedFarmingInfo.success) {
    console.error('❌ Не удалось получить обновленную информацию о фарминге');
    return;
  }
  
  console.log('✅ Информация о фарминге после депозита:');
  console.log(JSON.stringify(updatedFarmingInfo.data, null, 2));
  
  // 4. Получаем список депозитов
  console.log('\n4. Получаем список депозитов:');
  const depositsInfo = await callApi(`/api/uni-farming/deposits?user_id=${userId}`);
  
  if (!depositsInfo.success) {
    // Пробуем альтернативный эндпоинт
    console.log('Пробуем альтернативный эндпоинт для депозитов...');
    const altDepositsInfo = await callApi(`/api/new-uni-farming/deposits?user_id=${userId}`);
    
    if (!altDepositsInfo.success) {
      console.error('❌ Не удалось получить список депозитов');
      return;
    }
    
    console.log('✅ Список депозитов (альтернативный эндпоинт):');
    console.log(JSON.stringify(altDepositsInfo.data, null, 2));
  } else {
    console.log('✅ Список депозитов:');
    console.log(JSON.stringify(depositsInfo.data, null, 2));
  }
  
  console.log('\n===== Тестирование депозита завершено =====');
}

// Запускаем тест
makeFarmingDeposit()
  .catch(error => {
    console.error('Необработанная ошибка:', error);
  });