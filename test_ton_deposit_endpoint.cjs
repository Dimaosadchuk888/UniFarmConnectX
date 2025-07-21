const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function testTonDepositEndpoint() {
  console.log('🧪 ТЕСТИРОВАНИЕ TON DEPOSIT ENDPOINT');
  console.log('====================================');
  
  // Создаем JWT токен для User 184
  const token = jwt.sign({
    telegram_id: 999489,
    username: 'test_user_1752129840905',
    ref_code: 'REF_1752755835358_yjrusv'
  }, process.env.JWT_SECRET || 'test_secret_key', { expiresIn: '7d' });

  console.log('✅ JWT токен создан, длина:', token.length);

  const testPayload = {
    user_id: 184,
    ton_tx_hash: `diagnostic_test_${Date.now()}`,
    amount: 0.01,
    wallet_address: "UQBKgXCNLPexWhs2L79kiARR1phGH1_LEx54JoqfcJEihKPG"
  };

  console.log('📤 Отправляем тестовый запрос:', testPayload);

  try {
    const response = await fetch('http://localhost:3000/api/v2/wallet/ton-deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testPayload)
    });

    const responseData = await response.json();

    console.log('📥 Статус ответа:', response.status);
    console.log('📥 Заголовки:', response.headers.raw());
    console.log('📥 Тело ответа:', responseData);

    if (response.ok && responseData.success) {
      console.log('✅ TON DEPOSIT ENDPOINT РАБОТАЕТ!');
      console.log('✅ Архитектурное решение Wallet-Based Resolution активно');
    } else {
      console.log('❌ TON DEPOSIT ENDPOINT НЕ РАБОТАЕТ');
      console.log('❌ Причина:', responseData.error || 'Unknown error');
      
      if (response.status === 401) {
        console.log('🔐 Проблема с авторизацией JWT');
      } else if (response.status === 400) {
        console.log('📝 Проблема с валидацией данных');
      } else if (response.status === 500) {
        console.log('💥 Внутренняя ошибка сервера');
      }
    }

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.log('🔍 Возможные причины:');
    console.log('- Сервер не запущен на порту 3000');
    console.log('- Маршрут /api/v2/wallet/ton-deposit не зарегистрирован');
    console.log('- LSP ошибки компиляции блокируют запуск');
  }

  console.log('====================================');
}

testTonDepositEndpoint();