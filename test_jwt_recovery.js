
// JWT Token Recovery Test Script
console.log('[JWT Test] Начинаем тест системы восстановления токенов...');

// 1. Проверяем текущий токен
const currentToken = localStorage.getItem('unifarm_jwt_token');
console.log('[JWT Test] Текущий токен в localStorage:', currentToken ? 'ЕСТЬ (длина: ' + currentToken.length + ')' : 'ОТСУТСТВУЕТ');

// 2. Тестируем /api/auth/refresh endpoint
async function testRefreshEndpoint() {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentToken
      },
      body: JSON.stringify({ token: currentToken })
    });
    
    console.log('[JWT Test] Refresh endpoint response status:', response.status);
    const data = await response.json();
    console.log('[JWT Test] Refresh endpoint response:', data);
    return response.ok;
  } catch (error) {
    console.error('[JWT Test] Refresh endpoint error:', error);
    return false;
  }
}

// 3. Тестируем создание нового токена через Telegram initData  
async function testTelegramAuth() {
  if (!window.Telegram?.WebApp?.initData) {
    console.log('[JWT Test] Telegram initData недоступен');
    return false;
  }
  
  try {
    const response = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        initData: window.Telegram.WebApp.initData
      })
    });
    
    console.log('[JWT Test] Telegram auth response status:', response.status);
    const data = await response.json();
    console.log('[JWT Test] Telegram auth response:', data);
    return response.ok && data.success;
  } catch (error) {
    console.error('[JWT Test] Telegram auth error:', error);
    return false;
  }
}

// Запускаем тесты
setTimeout(async () => {
  console.log('[JWT Test] === ТЕСТ REFRESH ENDPOINT ===');
  await testRefreshEndpoint();
  
  console.log('[JWT Test] === ТЕСТ TELEGRAM AUTH ===');
  await testTelegramAuth();
  
  console.log('[JWT Test] Тестирование завершено');
}, 1000);

