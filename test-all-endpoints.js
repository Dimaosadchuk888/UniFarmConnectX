/**
 * Комплексный скрипт для проверки всех исправленных API-эндпоинтов
 */
import fetch from 'node-fetch';

// Базовый URL и ID пользователя для тестирования
const baseUrl = 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev';
const userId = 34;

// Список эндпоинтов для тестирования
const endpoints = [
  `/api/referrals?user_id=${userId}`,
  `/api/uni-farming/info?user_id=${userId}`,
  `/api/missions/active?user_id=${userId}`,
  `/api/boosts?user_id=${userId}`,
  `/api/transactions?user_id=${userId}`,
  `/api/daily-bonus/status?user_id=${userId}`
];

// Функция для тестирования одного эндпоинта
async function testEndpoint(endpoint) {
  console.log(`Тестирование API-эндпоинта: ${endpoint}`);
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`);
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log(`✅ Успешно получен JSON-ответ от ${endpoint}`);
      return { 
        success: true, 
        endpoint,
        status: response.status,
        data 
      };
    } else {
      const text = await response.text();
      console.log(`❌ Получен не JSON-ответ от ${endpoint}:`);
      console.log(text.substring(0, 100) + '...');
      return { 
        success: false, 
        endpoint,
        status: response.status,
        error: 'Not JSON response' 
      };
    }
  } catch (error) {
    console.error(`❌ Ошибка при выполнении запроса к ${endpoint}:`, error);
    return { 
      success: false, 
      endpoint,
      error: error.message 
    };
  }
}

// Функция для запуска тестов всех эндпоинтов
async function testAllEndpoints() {
  console.log('=== Начало тестирования API-эндпоинтов ===');
  
  const results = [];
  let passedCount = 0;
  let failedCount = 0;
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    if (result.success) {
      passedCount++;
    } else {
      failedCount++;
    }
  }
  
  // Вывод итогового результата
  console.log('\n=== Итоги тестирования ===');
  console.log(`Протестировано эндпоинтов: ${results.length}`);
  console.log(`Успешно: ${passedCount}`);
  console.log(`Неудачно: ${failedCount}`);
  
  console.log('\n=== Детали по эндпоинтам ===');
  for (const result of results) {
    console.log(`${result.success ? '✅' : '❌'} ${result.endpoint} - ${result.success ? 'OK' : 'FAILED'}`);
  }
  
  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    details: results
  };
}

// Запускаем тестирование
testAllEndpoints()
  .then(results => {
    process.exit(results.failed === 0 ? 0 : 1);
  })
  .catch(error => {
    console.error('Ошибка при запуске тестов:', error);
    process.exit(1);
  });