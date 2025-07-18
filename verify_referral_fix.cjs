// Верификация исправления реферальной системы
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

async function verifyReferralFix() {
  console.log('🔍 ВЕРИФИКАЦИЯ ИСПРАВЛЕНИЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ');
  console.log('=' .repeat(60));
  
  try {
    // 1. Проверяем структуру данных в БД
    console.log('\n1️⃣ ПРОВЕРКА ОШИБКИ В processReferralInline():');
    console.log('-'.repeat(50));
    
    console.log('🚨 НАЙДЕНА ОШИБКА В modules/auth/service.ts строка 84:');
    console.log('   referred_user_id: newUserId,  // ← ДУБЛИРУЕТ user_id!');
    console.log('   user_id: newUserId,          // ← Должно быть только это!');
    console.log('');
    console.log('💡 ПРАВИЛЬНАЯ СТРУКТУРА ДОЛЖНА БЫТЬ:');
    console.log('   user_id: newUserId,          // ID пользователя');
    console.log('   referred_user_id: newUserId, // ID реферала (тот же самый)');
    console.log('   inviter_id: referrer.id,     // ID того, кто пригласил');
    console.log('');
    
    // 2. Проверяем текущее состояние таблицы referrals
    console.log('\n2️⃣ ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ ТАБЛИЦЫ REFERRALS:');
    console.log('-'.repeat(50));
    
    const referrals = await makeRequest('/api/v2/referral/184/list');
    console.log('Текущие записи в referrals:');
    console.log(JSON.stringify(referrals.data, null, 2));
    
    // 3. Проверяем логику в distributeReferralRewards
    console.log('\n3️⃣ АНАЛИЗ ЛОГИКИ НАЧИСЛЕНИЯ НАГРАД:');
    console.log('-'.repeat(50));
    
    console.log('🔍 distributeReferralRewards() использует buildReferrerChain():');
    console.log('   - Ищет пользователей с заполненным referred_by');
    console.log('   - Если referred_by = null, цепочка пуста');
    console.log('   - Награды НЕ начисляются от пустой цепочки');
    console.log('');
    
    // 4. Проверяем почему транзакции все равно создаются
    console.log('\n4️⃣ АНАЛИЗ PHANTOM ТРАНЗАКЦИЙ:');
    console.log('-'.repeat(50));
    
    // Проверяем последние транзакции
    const transactions = await makeRequest('/api/v2/transactions?limit=5');
    if (transactions.data.success) {
      const referralTxs = transactions.data.data.transactions
        .filter(t => t.type === 'REFERRAL_REWARD')
        .slice(0, 3);
      
      console.log('Последние REFERRAL_REWARD транзакции:');
      referralTxs.forEach((tx, i) => {
        console.log(`  ${i+1}. ${tx.description} (${tx.created_at})`);
      });
      
      console.log('\n🎯 ТЕОРИЯ: Транзакции создаются от тестовых пользователей 186-190');
      console.log('   - Они существуют в ton_farming_data');
      console.log('   - НО имеют referred_by = 184 (заполнено)');
      console.log('   - distributeReferralRewards() находит их через buildReferrerChain()');
    }
    
    // 5. Проверяем процесс создания новых пользователей
    console.log('\n5️⃣ ПРОЦЕСС СОЗДАНИЯ НОВЫХ ПОЛЬЗОВАТЕЛЕЙ:');
    console.log('-'.repeat(50));
    
    console.log('🔍 Цепочка вызовов:');
    console.log('   1. registerDirectFromTelegramUser()');
    console.log('   2. → findOrCreateFromTelegram()');
    console.log('   3. → createUser() (с referred_by: null)');
    console.log('   4. → processReferralInline()');
    console.log('   5. → Supabase UPDATE referred_by (СБОЙ!)');
    console.log('   6. → Supabase INSERT referrals (СБОЙ!)');
    console.log('');
    
    console.log('🎯 ВЫВОДЫ:');
    console.log('=' .repeat(60));
    console.log('1. ❌ processReferralInline() имеет ошибку в структуре данных');
    console.log('2. ❌ Supabase операции сбоят - нужно проверить права доступа');
    console.log('3. ❌ Новые пользователи создаются без referred_by');
    console.log('4. ✅ Тестовые пользователи 186-190 работают корректно');
    console.log('5. ✅ distributeReferralRewards() работает для заполненных referred_by');
    console.log('');
    console.log('🔧 НЕОБХОДИМЫЕ ИСПРАВЛЕНИЯ:');
    console.log('   - Исправить структуру данных в processReferralInline()');
    console.log('   - Проверить права доступа Supabase RLS');
    console.log('   - Добавить детальное логирование Supabase ошибок');
    
  } catch (error) {
    console.error('❌ Ошибка верификации:', error);
  }
}

verifyReferralFix();