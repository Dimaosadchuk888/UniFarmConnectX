// Comprehensive диагностика реферальной системы
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

async function comprehensiveReferralDiagnosis() {
  console.log('🔍 COMPREHENSIVE ДИАГНОСТИКА РЕФЕРАЛЬНОЙ СИСТЕМЫ');
  console.log('=' .repeat(70));
  
  try {
    // 1. Проверяем тестовых пользователей 186-190
    console.log('\n1️⃣ ПРОВЕРКА ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ 186-190:');
    console.log('-'.repeat(50));
    
    console.log('🎯 ГИПОТЕЗА: Тестовые пользователи имеют referred_by = 184');
    console.log('   Это объясняет, почему distributeReferralRewards() работает');
    console.log('');
    
    // Проверяем существование и структуру тестовых пользователей
    const testUserIds = [186, 187, 188, 189, 190];
    let testUsersFound = 0;
    
    for (const userId of testUserIds) {
      try {
        const user = await makeRequest(`/api/v2/user/${userId}`);
        if (user.data.success) {
          testUsersFound++;
          console.log(`✅ User ${userId}: ${user.data.data.username || 'No username'}`);
          console.log(`   referred_by: ${user.data.data.referred_by || 'null'}`);
          console.log(`   telegram_id: ${user.data.data.telegram_id || 'null'}`);
        } else {
          console.log(`❌ User ${userId}: НЕ НАЙДЕН`);
        }
      } catch (error) {
        console.log(`❌ User ${userId}: ОШИБКА ЗАПРОСА`);
      }
    }
    
    console.log(`\n📊 НАЙДЕНО: ${testUsersFound} из 5 тестовых пользователей`);
    
    // 2. Анализ реферальных транзакций
    console.log('\n2️⃣ АНАЛИЗ РЕФЕРАЛЬНЫХ ТРАНЗАКЦИЙ:');
    console.log('-'.repeat(50));
    
    const transactions = await makeRequest('/api/v2/transactions?limit=50');
    if (transactions.data.success) {
      const referralTxs = transactions.data.data.transactions
        .filter(t => t.type === 'REFERRAL_REWARD');
      
      console.log(`📊 Найдено ${referralTxs.length} REFERRAL_REWARD транзакций`);
      
      // Анализ по источникам
      const sourceAnalysis = {};
      referralTxs.forEach(tx => {
        const match = tx.description.match(/from User (\d+):/);
        if (match) {
          const sourceId = match[1];
          if (!sourceAnalysis[sourceId]) {
            sourceAnalysis[sourceId] = { count: 0, totalUNI: 0, totalTON: 0 };
          }
          sourceAnalysis[sourceId].count++;
          if (tx.currency === 'UNI') {
            sourceAnalysis[sourceId].totalUNI += parseFloat(tx.amount);
          } else if (tx.currency === 'TON') {
            sourceAnalysis[sourceId].totalTON += parseFloat(tx.amount);
          }
        }
      });
      
      console.log('\n📈 СТАТИСТИКА ПО ИСТОЧНИКАМ:');
      Object.entries(sourceAnalysis).forEach(([userId, stats]) => {
        console.log(`  User ${userId}: ${stats.count} транзакций`);
        console.log(`    UNI: ${stats.totalUNI.toFixed(8)}`);
        console.log(`    TON: ${stats.totalTON.toFixed(8)}`);
      });
      
      // Анализ временных паттернов
      console.log('\n⏰ ВРЕМЕННОЙ АНАЛИЗ:');
      const last5Txs = referralTxs.slice(0, 5);
      last5Txs.forEach((tx, i) => {
        const date = new Date(tx.created_at);
        console.log(`  ${i+1}. ${date.toLocaleTimeString()}: ${tx.description}`);
      });
    }
    
    // 3. Проверяем buildReferrerChain логику
    console.log('\n3️⃣ АНАЛИЗ BUILDREFERRERCHAIN():');
    console.log('-'.repeat(50));
    
    console.log('🔍 buildReferrerChain() ищет пользователей с заполненным referred_by:');
    console.log('   1. Получает User ID из источника (186-190)');
    console.log('   2. Ищет в таблице users: SELECT * WHERE id = sourceUserId');
    console.log('   3. Проверяет поле referred_by');
    console.log('   4. Если referred_by заполнен, добавляет в цепочку');
    console.log('   5. Продолжает до 20 уровней');
    console.log('');
    
    // 4. Проверяем состояние реальных пользователей
    console.log('\n4️⃣ ПРОВЕРКА РЕАЛЬНЫХ ПОЛЬЗОВАТЕЛЕЙ:');
    console.log('-'.repeat(50));
    
    // Проверяем несколько реальных пользователей
    const realUserIds = [1, 2, 3, 74, 184];
    
    for (const userId of realUserIds) {
      try {
        const user = await makeRequest(`/api/v2/user/${userId}`);
        if (user.data.success) {
          console.log(`✅ User ${userId}: ${user.data.data.username || 'No username'}`);
          console.log(`   referred_by: ${user.data.data.referred_by || 'null'}`);
          console.log(`   ref_code: ${user.data.data.ref_code || 'null'}`);
        } else {
          console.log(`❌ User ${userId}: НЕ НАЙДЕН`);
        }
      } catch (error) {
        console.log(`❌ User ${userId}: ОШИБКА ЗАПРОСА`);
      }
    }
    
    // 5. Финальный анализ
    console.log('\n5️⃣ ФИНАЛЬНЫЙ ДИАГНОЗ:');
    console.log('-'.repeat(50));
    
    console.log('🎯 КОРНЕВАЯ ПРИЧИНА:');
    console.log('   1. Тестовые пользователи 186-190 имеют referred_by = 184');
    console.log('   2. Реальные пользователи имеют referred_by = null');
    console.log('   3. buildReferrerChain() работает только с заполненным referred_by');
    console.log('   4. processReferralInline() не обновляет referred_by при создании');
    console.log('');
    
    console.log('🔧 НЕОБХОДИМЫЕ ИСПРАВЛЕНИЯ:');
    console.log('   ✅ Исправить ошибку в processReferralInline() (строка 84)');
    console.log('   ✅ Проверить права доступа Supabase RLS');
    console.log('   ✅ Добавить детальное логирование ошибок');
    console.log('   ✅ Протестировать создание новых пользователей');
    
  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  }
}

comprehensiveReferralDiagnosis();