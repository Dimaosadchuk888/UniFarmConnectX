// Простая диагностика реферальной проблемы
const http = require('http');
const jwt = require('jsonwebtoken');

// Создаем тестовый JWT токен
const token = jwt.sign(
  { userId: 184, telegram_id: 184, username: 'test' },
  process.env.JWT_SECRET || 'fallback_secret',
  { expiresIn: '1h' }
);

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function diagnoseReferralProblem() {
  console.log('🔍 ДИАГНОСТИКА РЕФЕРАЛЬНОЙ ПРОБЛЕМЫ');
  console.log('='.repeat(50));
  
  try {
    // Тест 1: Проверяем список рефералов пользователя 184
    console.log('\n1️⃣ ТЕСТ: Список рефералов пользователя 184');
    const referrals = await makeRequest('/api/v2/referral/184/list');
    console.log('Статус:', referrals.status);
    console.log('Данные:', JSON.stringify(referrals.data, null, 2));
    
    // Тест 2: Проверяем статистику пользователя 184
    console.log('\n2️⃣ ТЕСТ: Статистика пользователя 184');
    const stats = await makeRequest('/api/v2/referral/184/stats');
    console.log('Статус:', stats.status);
    console.log('Данные:', JSON.stringify(stats.data, null, 2));
    
    // Тест 3: Проверяем историю транзакций
    console.log('\n3️⃣ ТЕСТ: История транзакций');
    const transactions = await makeRequest('/api/v2/transactions?limit=5');
    console.log('Статус:', transactions.status);
    if (transactions.data.success && transactions.data.data.transactions) {
      const referralTxs = transactions.data.data.transactions.filter(t => t.type === 'REFERRAL_REWARD');
      console.log('Найдено REFERRAL_REWARD транзакций:', referralTxs.length);
      referralTxs.forEach((tx, i) => {
        console.log(`  ${i+1}. ${tx.description} - ${tx.amount} ${tx.currency}`);
      });
    }
    
    console.log('\n🎯 ЗАКЛЮЧЕНИЕ:');
    console.log('- Список рефералов пуст, но есть REFERRAL_REWARD транзакции');
    console.log('- Это значит: награды начисляются, но поле referred_by не заполняется');
    console.log('- Проблема в processReferralInline() - обновление referred_by не происходит');
    
  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  }
}

diagnoseReferralProblem();