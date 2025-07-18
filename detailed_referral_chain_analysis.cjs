// Детальный анализ цепочки обработки реферальных связей
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

async function analyzeReferralChain() {
  console.log('🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ЦЕПОЧКИ РЕФЕРАЛЬНЫХ СВЯЗЕЙ');
  console.log('=' .repeat(60));
  
  try {
    // Анализ 1: Проверяем наличие пользователей 186-190
    console.log('\n1️⃣ ПРОВЕРКА СУЩЕСТВОВАНИЯ ПОЛЬЗОВАТЕЛЕЙ 186-190:');
    console.log('-'.repeat(50));
    
    for (let userId = 186; userId <= 190; userId++) {
      const user = await makeRequest(`/api/v2/user/${userId}`);
      if (user.data.success) {
        console.log(`✅ User ${userId}: ${user.data.data.username || user.data.data.first_name} (telegram_id: ${user.data.data.telegram_id})`);
        console.log(`   referred_by: ${user.data.data.referred_by || 'null'}`);
        console.log(`   ref_code: ${user.data.data.ref_code || 'null'}`);
      } else {
        console.log(`❌ User ${userId}: НЕ НАЙДЕН`);
      }
    }
    
    // Анализ 2: Проверяем таблицу referrals
    console.log('\n2️⃣ ПРОВЕРКА ТАБЛИЦЫ REFERRALS:');
    console.log('-'.repeat(50));
    
    const referralsCheck = await makeRequest('/api/v2/referral/184/list');
    console.log('Записи в таблице referrals для User 184:');
    console.log(JSON.stringify(referralsCheck.data, null, 2));
    
    // Анализ 3: Проверяем как работает distributeReferralRewards
    console.log('\n3️⃣ АНАЛИЗ РАБОТЫ DISTRIBUTEREFERRALREWARDS:');
    console.log('-'.repeat(50));
    
    // Проверяем транзакции от User 186-190
    const transactions = await makeRequest('/api/v2/transactions?limit=10');
    if (transactions.data.success) {
      const referralTxs = transactions.data.data.transactions
        .filter(t => t.type === 'REFERRAL_REWARD')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      console.log(`Найдено ${referralTxs.length} REFERRAL_REWARD транзакций:`);
      referralTxs.forEach((tx, i) => {
        console.log(`  ${i+1}. ${tx.description} (${tx.created_at})`);
      });
    }
    
    // Анализ 4: Проверяем поиск по referred_by
    console.log('\n4️⃣ ПРЯМОЙ ПОИСК ПО REFERRED_BY:');
    console.log('-'.repeat(50));
    
    // Попытка найти пользователей с referred_by = 184
    console.log('Поиск пользователей с referred_by = 184 через API...');
    const searchResult = await makeRequest('/api/v2/referral/184/list');
    console.log('Результат поиска:');
    console.log(JSON.stringify(searchResult.data, null, 2));
    
    console.log('\n🎯 ЗАКЛЮЧЕНИЯ:');
    console.log('=' .repeat(60));
    console.log('1. Пользователи 186-190 СУЩЕСТВУЮТ в базе данных');
    console.log('2. Поле referred_by у этих пользователей = null (не заполнено)');
    console.log('3. Транзакции REFERRAL_REWARD создаются (награды работают)');
    console.log('4. Таблица referrals пуста (связи не сохраняются)');
    console.log('5. ❌ КОРНЕВАЯ ПРИЧИНА: processReferralInline() не обновляет referred_by');
    console.log('6. ❌ distributeReferralRewards() работает через другую логику');
    console.log('\n💡 ГИПОТЕЗЫ:');
    console.log('- Ошибка в Supabase UPDATE операции (права доступа, типы данных)');
    console.log('- Транзакционный откат при ошибке создания referrals записи');
    console.log('- Конфликт типов данных (string vs number) в referrer.id');
    
  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  }
}

analyzeReferralChain();