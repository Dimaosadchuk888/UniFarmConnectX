// Тестовый скрипт для проверки работы API баланса
const fetch = require('node-fetch');

async function testBalanceAPI() {
  console.log('=== ТЕСТ API БАЛАНСА С JWT ===\n');
  
  // 1. Получаем токен
  const authResponse = await fetch('http://localhost:3000/api/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      direct_registration: true,
      telegram_id: 111222333,
      username: 'testuser',
      first_name: 'Test'
    })
  });
  
  const authData = await authResponse.json();
  const token = authData.data.token;
  const userId = authData.data.user.id;
  
  console.log('Получен токен для пользователя:', authData.data.user.username);
  console.log('User ID:', userId);
  console.log('Token preview:', token.substring(0, 50) + '...\n');
  
  // 2. Декодируем JWT чтобы увидеть структуру
  const tokenParts = token.split('.');
  const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
  console.log('JWT Payload:', payload, '\n');
  
  // 3. Тест БЕЗ параметра user_id
  console.log('Тест 1: БЕЗ параметра user_id');
  const balanceResponse1 = await fetch('http://localhost:3000/api/v2/wallet/balance', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const balanceData1 = await balanceResponse1.json();
  console.log('Ответ:', balanceData1, '\n');
  
  // 4. Тест С параметром user_id
  console.log('Тест 2: С параметром user_id=' + userId);
  const balanceResponse2 = await fetch(`http://localhost:3000/api/v2/wallet/balance?user_id=${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const balanceData2 = await balanceResponse2.json();
  console.log('Ответ:', balanceData2.data || balanceData2, '\n');
  
  // Результат
  if (balanceData1.success && balanceData1.data) {
    console.log('✅ УСПЕХ: API баланса работает БЕЗ передачи user_id!');
  } else {
    console.log('❌ ПРОБЛЕМА: API баланса НЕ работает без user_id');
    console.log('Требуется доработка метода getBalance в wallet/controller.ts');
  }
}

testBalanceAPI().catch(console.error);