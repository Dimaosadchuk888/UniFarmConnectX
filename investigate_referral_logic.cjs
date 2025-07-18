// Расследование логики начисления реферальных наград
const http = require('http');
const jwt = require('jsonwebtoken');

// Создаем тестовый JWT токен
const token = jwt.sign(
  { userId: 184, telegram_id: 184, username: 'test' },
  process.env.JWT_SECRET || 'fallback_secret',
  { expiresIn: '1h' }
);

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function investigateReferralLogic() {
  console.log('🔍 РАССЛЕДОВАНИЕ ЛОГИКИ РЕФЕРАЛЬНЫХ НАГРАД');
  console.log('=' .repeat(60));
  
  try {
    // 1. Проверяем все транзакции REFERRAL_REWARD
    console.log('\n1️⃣ АНАЛИЗ REFERRAL_REWARD ТРАНЗАКЦИЙ:');
    console.log('-'.repeat(50));
    
    const transactions = await makeRequest('/api/v2/transactions?limit=50');
    if (transactions.data.success) {
      const referralTxs = transactions.data.data.transactions
        .filter(t => t.type === 'REFERRAL_REWARD')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      console.log(`Найдено ${referralTxs.length} REFERRAL_REWARD транзакций:`);
      
      // Группируем по источникам
      const sourceMap = {};
      referralTxs.forEach(tx => {
        const match = tx.description.match(/from User (\d+):/);
        if (match) {
          const sourceUser = match[1];
          if (!sourceMap[sourceUser]) sourceMap[sourceUser] = [];
          sourceMap[sourceUser].push(tx);
        }
      });
      
      console.log('\nТранзакции по источникам:');
      Object.entries(sourceMap).forEach(([userId, txs]) => {
        console.log(`  User ${userId}: ${txs.length} транзакций`);
        console.log(`    Последняя: ${txs[0].created_at}`);
      });
    }
    
    // 2. Проверяем активных пользователей TON Boost
    console.log('\n2️⃣ ПРОВЕРКА АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ TON BOOST:');
    console.log('-'.repeat(50));
    
    // Пытаемся найти endpoint для активных пользователей
    const tonBoostStatus = await makeRequest('/api/v2/boost/ton-farming/status');
    console.log('TON Boost статус:', JSON.stringify(tonBoostStatus.data, null, 2));
    
    // 3. Проверяем логи планировщика
    console.log('\n3️⃣ ПОИСК СВЯЗИ МЕЖДУ ПОЛЬЗОВАТЕЛЯМИ:');
    console.log('-'.repeat(50));
    
    // Анализируем описания транзакций
    if (transactions.data.success) {
      const referralTxs = transactions.data.data.transactions
        .filter(t => t.type === 'REFERRAL_REWARD');
      
      console.log('Детальный анализ транзакций:');
      referralTxs.slice(0, 5).forEach((tx, i) => {
        console.log(`  ${i+1}. ${tx.description}`);
        console.log(`     Время: ${tx.created_at}`);
        console.log(`     Сумма: ${tx.amount} ${tx.currency}`);
        console.log(`     Статус: ${tx.status}`);
        console.log('');
      });
    }
    
    // 4. Проверяем timestamp связь с TON Boost
    console.log('\n4️⃣ АНАЛИЗ ВРЕМЕННЫХ СВЯЗЕЙ:');
    console.log('-'.repeat(50));
    
    // Проверяем TON транзакции за тот же период
    const tonTransactions = await makeRequest('/api/v2/transactions?currency=TON&limit=20');
    if (tonTransactions.data.success) {
      const tonTxs = tonTransactions.data.data.transactions
        .filter(t => t.type !== 'REFERRAL_REWARD')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      console.log('TON транзакции (не реферальные):');
      tonTxs.slice(0, 5).forEach((tx, i) => {
        console.log(`  ${i+1}. ${tx.type}: ${tx.amount} TON (${tx.created_at})`);
      });
    }
    
    console.log('\n🎯 ВЫВОДЫ:');
    console.log('=' .repeat(60));
    console.log('1. Реферальные награды создаются от несуществующих пользователей');
    console.log('2. Описания указывают на User 186-190, но API их не находит');
    console.log('3. Возможно, они существуют в БД, но не доступны через API');
    console.log('4. Логика начисления работает через другой механизм');
    console.log('5. Необходимо проверить прямой доступ к БД');
    
  } catch (error) {
    console.error('❌ Ошибка расследования:', error);
  }
}

investigateReferralLogic();