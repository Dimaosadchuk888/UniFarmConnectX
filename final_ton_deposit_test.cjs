const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test the actual JWT authentication flow
async function finalTonDepositTest() {
  console.log('🚀 ФИНАЛЬНЫЙ ТЕСТ TON DEPOSIT ПОСЛЕ ИСПРАВЛЕНИЯ JWT MIDDLEWARE');
  console.log('==============================================================');
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  // 1. Получаем данные User 184
  const { data: user } = await supabase
    .from('users')
    .select('id, telegram_id, username, ref_code')
    .eq('id', 184)
    .single();

  console.log('1️⃣ User 184:', user);

  // 2. Создаем JWT с правильными полями
  const jwtSecret = process.env.JWT_SECRET;
  const payload = {
    telegram_id: user.telegram_id,
    username: user.username,
    ref_code: user.ref_code
  };
  
  console.log('2️⃣ JWT payload:', payload);
  
  const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
  console.log('3️⃣ JWT token создан, длина:', token.length);

  // 3. Проверяем что getUserByTelegramId найдет пользователя
  const { data: foundUser } = await supabase
    .from('users')
    .select('id, telegram_id, username')
    .eq('telegram_id', user.telegram_id)
    .single();

  console.log('4️⃣ Пользователь найден по telegram_id:', foundUser);

  // 4. Тестируем ton-deposit endpoint
  console.log('\n🎯 ТЕСТИРУЕМ TON DEPOSIT ENDPOINT:');
  
  try {
    const response = await fetch('http://localhost:3000/api/v2/wallet/ton-deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ton_tx_hash: `test_fix_${Date.now()}`,
        amount: 0.01,
        wallet_address: "UQBKgXCNLPexWhs2L79kiARR1phGH1_LEx54JoqfcJEihKPG"
      })
    });

    const responseData = await response.json();

    console.log('📥 HTTP Status:', response.status);
    console.log('📥 Response:', responseData);

    if (response.ok) {
      console.log('\n✅ ╔══════════════════════════════════════╗');
      console.log('✅ ║      JWT MIDDLEWARE ИСПРАВЛЕН!        ║');
      console.log('✅ ║   TON DEPOSIT ENDPOINT РАБОТАЕТ!      ║');
      console.log('✅ ╚══════════════════════════════════════╝');
    } else {
      console.log('\n❌ Проблема не решена. Статус:', response.status);
      console.log('❌ Ошибка:', responseData.error);
    }

  } catch (error) {
    console.error('💥 Ошибка запроса:', error.message);
  }
}

finalTonDepositTest();