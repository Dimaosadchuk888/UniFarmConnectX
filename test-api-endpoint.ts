import { config as loadEnv } from 'dotenv';
import fetch from 'node-fetch';

loadEnv();

async function testApiEndpoint() {
  console.log('\n=== ТЕСТИРОВАНИЕ API ENDPOINT /api/v2/transactions ===\n');
  
  // Создаем тестовый JWT токен (нужно взять реальный из браузера или создать)
  // Для теста используем заглушку
  const testToken = 'test-jwt-token';
  
  try {
    // 1. Проверяем endpoint без токена
    console.log('1. Запрос без токена:');
    const response1 = await fetch('http://localhost:3000/api/v2/transactions?page=1&limit=5&currency=UNI');
    const data1 = await response1.json();
    console.log('   Статус:', response1.status);
    console.log('   Ответ:', JSON.stringify(data1, null, 2).slice(0, 200));
    
    // 2. Проверяем с токеном (если есть)
    if (testToken !== 'test-jwt-token') {
      console.log('\n2. Запрос с токеном:');
      const response2 = await fetch('http://localhost:3000/api/v2/transactions?page=1&limit=5&currency=UNI', {
        headers: {
          'Authorization': `Bearer ${testToken}`
        }
      });
      const data2 = await response2.json();
      console.log('   Статус:', response2.status);
      console.log('   Ответ:', JSON.stringify(data2, null, 2).slice(0, 500));
    }
    
    // 3. Проверяем альтернативный endpoint
    console.log('\n3. Проверка /api/transactions:');
    const response3 = await fetch('http://localhost:3000/api/transactions?page=1&limit=5&currency=UNI');
    const data3 = await response3.json();
    console.log('   Статус:', response3.status);
    console.log('   Ответ:', JSON.stringify(data3, null, 2).slice(0, 200));
    
  } catch (error) {
    console.error('Ошибка при запросе:', error);
  }
  
  console.log('\n=== ТЕСТ ЗАВЕРШЕН ===\n');
}

testApiEndpoint().catch(console.error);