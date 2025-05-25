/**
 * Скрипт для проверки работоспособности маршрутов фарминга
 */
import fetch from 'node-fetch';

async function testFarmingEndpoint() {
  const baseUrl = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app';
  const userId = 34;
  const endpoint = `/api/uni-farming/info?user_id=${userId}`;
  
  console.log(`Тестирование API-эндпоинта: ${endpoint}`);
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`);
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Успешно получен ответ JSON:');
      console.log(JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      const text = await response.text();
      console.log('Получен не JSON ответ:');
      console.log(text.substring(0, 200) + '...');
      return { success: false, error: 'Not JSON response' };
    }
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    return { success: false, error: error.message };
  }
}

// Запуск теста
testFarmingEndpoint().then(result => {
  console.log('Результат теста:', result.success ? 'Успешно' : 'Неудача');
  process.exit(result.success ? 0 : 1);
});