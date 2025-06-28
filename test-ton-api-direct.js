import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/v2';

async function testTonFarmingEndpoint() {
  console.log('=== Тестирование прямого вызова API TON Farming ===\n');
  
  try {
    // Тестовый JWT токен для user_id=43
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NDMsInRlbGVncmFtX2lkIjo0MywidXNlcm5hbWUiOiJkZW1vX3VzZXIiLCJyZWZfY29kZSI6IlJFRl9ERU1PIiwiaWF0IjoxNzUxMTMwMDAwLCJleHAiOjE3NTE3MzAwMDB9.test';
    
    // Вызываем endpoint напрямую
    const response = await fetch(`${API_URL}/ton-farming/info`, {
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Статус ответа:', response.status);
    console.log('Полный ответ API:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      console.log('\nПоля в ответе:');
      Object.keys(data.data).forEach(key => {
        console.log(`- ${key}:`, data.data[key]);
      });
      
      // Проверяем наличие проблемного поля
      if ('ton_farming_balance' in data.data) {
        console.log('\n⚠️  ПРОБЛЕМА: Поле ton_farming_balance присутствует в ответе!');
      }
      if ('balance_ton' in data.data) {
        console.log('\n✅ Поле balance_ton присутствует в ответе');
      }
    }
    
  } catch (error) {
    console.error('Ошибка при вызове API:', error);
  }
}

testTonFarmingEndpoint();