import fetch from 'node-fetch';

async function testDepositViaAPI() {
  console.log('=== ТЕСТ ДЕПОЗИТА ЧЕРЕЗ API ===\n');
  
  const baseUrl = 'http://localhost:8080';
  const userId = '184';
  const authHeader = 'Bearer ' + process.env.TEST_JWT_TOKEN || 'test-token';
  
  // 1. Получим текущий статус
  console.log('1. Получение текущего статуса farming...');
  try {
    const statusResponse = await fetch(`${baseUrl}/api/farming/uni/status`, {
      headers: {
        'Authorization': authHeader,
        'x-user-id': userId
      }
    });
    
    const statusData = await statusResponse.json();
    console.log('Текущий депозит:', statusData.data?.uni_deposit_amount || 0);
    
    // 2. Попробуем сделать депозит
    console.log('\n2. Выполнение депозита через API...');
    const depositResponse = await fetch(`${baseUrl}/api/farming/uni/deposit`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'x-user-id': userId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 50 // депозит 50 UNI
      })
    });
    
    const depositResult = await depositResponse.json();
    
    if (depositResponse.ok && depositResult.success) {
      console.log('✅ ДЕПОЗИТ УСПЕШЕН!');
      console.log('Новый депозит:', depositResult.data?.deposit_amount);
      console.log('Сообщение:', depositResult.message);
    } else {
      console.log('❌ ОШИБКА ДЕПОЗИТА:');
      console.log('Статус:', depositResponse.status);
      console.log('Ошибка:', depositResult.error || depositResult.message);
    }
    
    // 3. Проверим статус после депозита
    console.log('\n3. Проверка статуса после депозита...');
    const afterResponse = await fetch(`${baseUrl}/api/farming/uni/status`, {
      headers: {
        'Authorization': authHeader,
        'x-user-id': userId
      }
    });
    
    const afterData = await afterResponse.json();
    console.log('Депозит после операции:', afterData.data?.uni_deposit_amount || 0);
    
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
    console.log('\nВозможные причины:');
    console.log('1. Сервер не запущен (нужно запустить npm run dev)');
    console.log('2. Нет валидного JWT токена');
    console.log('3. Проблемы с сетью');
  }
}

// Генерация тестового JWT токена
function generateTestToken() {
  // В реальном приложении токен приходит от Telegram
  const payload = {
    userId: 184,
    username: 'testuser',
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  
  // Для теста используем простой base64 (в проде используется настоящий JWT)
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Установим тестовый токен
process.env.TEST_JWT_TOKEN = generateTestToken();

testDepositViaAPI();