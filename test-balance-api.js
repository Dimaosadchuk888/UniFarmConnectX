/**
 * Скрипт для проверки API баланса пользователя
 */

const API_BASE = 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app';

async function testBalanceAPI() {
  console.log('🔍 Проверяем API баланса пользователя...');
  
  try {
    // Проверяем API /api/users/1
    console.log('\n📊 Тестируем /api/users/1...');
    const userResponse = await fetch(`${API_BASE}/api/users/1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log(`Статус: ${userResponse.status}`);
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ Данные пользователя:', JSON.stringify(userData, null, 2));
      
      if (userData.data && userData.data.balance_uni && userData.data.balance_ton) {
        console.log(`💰 Баланс UNI: ${userData.data.balance_uni}`);
        console.log(`💰 Баланс TON: ${userData.data.balance_ton}`);
      } else {
        console.log('⚠️ Баланс не найден в ответе API');
      }
    } else {
      const errorText = await userResponse.text();
      console.log('❌ Ошибка API:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

// Запускаем тест
testBalanceAPI();