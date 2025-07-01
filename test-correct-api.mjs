// Тест создания транзакции через API endpoint
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/v2';

async function testTransactionAPI() {
  try {
    console.log('=== ТЕСТ API ТРАНЗАКЦИЙ ===\n');
    
    // Создаём транзакцию через API endpoint
    const response = await fetch(`${API_URL}/transactions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-Mode': 'true'  // Для обхода авторизации в dev режиме
      },
      body: JSON.stringify({
        user_id: 48,
        type: 'mission_reward',
        amount_uni: '500',
        amount_ton: '0',
        currency: 'UNI',
        description: 'API Test: Mission reward',
        status: 'completed'
      })
    });

    if (!response.ok) {
      console.error(`Ошибка API: ${response.status} ${response.statusText}`);
      return;
    }

    const result = await response.json();
    console.log('Результат API:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

testTransactionAPI();