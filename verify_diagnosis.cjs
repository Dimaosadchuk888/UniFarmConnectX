/**
 * Дополнительная проверка точности диагностики
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function verifyDiagnosis() {
  console.log('\n🔍 ПРОВЕРКА ТОЧНОСТИ ДИАГНОСТИКИ');
  console.log('='.repeat(50));

  try {
    // 1. Проверяем, есть ли пользователи С реферальными связями
    console.log('\n1️⃣ Проверка работающих реферальных связей...');
    
    const { data: workingReferrals, error: workingError } = await supabase
      .from('users')
      .select('*')
      .not('referred_by', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (workingError) {
      console.log('❌ Ошибка:', workingError.message);
    } else {
      console.log(`📊 Пользователей С реферальными связями: ${workingReferrals?.length || 0}`);
      
      if (workingReferrals && workingReferrals.length > 0) {
        console.log('\n📋 Примеры РАБОТАЮЩИХ реферальных связей:');
        workingReferrals.forEach((user, index) => {
          console.log(`   ${index + 1}. ID: ${user.id}, Реферер: ${user.referred_by}, Тип: ${typeof user.referred_by}, Создан: ${user.created_at}`);
        });
      }
    }

    // 2. Проверяем структуру поля referred_by
    console.log('\n2️⃣ Анализ форматов данных в поле referred_by...');
    
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('id, referred_by, created_at')
      .not('referred_by', 'is', null)
      .order('created_at', { ascending: false });

    if (allError) {
      console.log('❌ Ошибка:', allError.message);
    } else {
      const stringReferrals = allUsers?.filter(u => typeof u.referred_by === 'string') || [];
      const numberReferrals = allUsers?.filter(u => typeof u.referred_by === 'number') || [];
      
      console.log(`📊 STRING формат (реферальные коды): ${stringReferrals.length}`);
      console.log(`📊 NUMBER формат (ID пользователей): ${numberReferrals.length}`);
      
      if (stringReferrals.length > 0) {
        console.log('\n📋 Примеры STRING referred_by:');
        stringReferrals.slice(0, 3).forEach(user => {
          console.log(`   ID: ${user.id}, referred_by: "${user.referred_by}" (${typeof user.referred_by})`);
        });
      }
      
      if (numberReferrals.length > 0) {
        console.log('\n📋 Примеры NUMBER referred_by:');
        numberReferrals.slice(0, 3).forEach(user => {
          console.log(`   ID: ${user.id}, referred_by: ${user.referred_by} (${typeof user.referred_by})`);
        });
      }
    }

    // 3. Проверяем, какие реферальные коды используются
    console.log('\n3️⃣ Анализ используемых реферальных кодов...');
    
    const { data: refCodes, error: refError } = await supabase
      .from('users')
      .select('ref_code, id, username, first_name')
      .order('created_at', { ascending: false })
      .limit(20);

    if (refError) {
      console.log('❌ Ошибка:', refError.message);
    } else {
      console.log(`📊 Активных реферальных кодов: ${refCodes?.length || 0}`);
      
      // Проверяем, используется ли код REF_1750079004411_nddfp2 в referred_by
      const usageCheck = allUsers?.filter(u => u.referred_by === 'REF_1750079004411_nddfp2') || [];
      console.log(`🔍 Использований кода REF_1750079004411_nddfp2: ${usageCheck.length}`);
    }

    // 4. Проверяем последние транзакции referral
    console.log('\n4️⃣ Проверка последних реферальных транзакций...');
    
    const { data: refTransactions, error: refTransError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(5);

    if (refTransError) {
      console.log('❌ Ошибка:', refTransError.message);
    } else {
      console.log(`📊 Последних реферальных транзакций: ${refTransactions?.length || 0}`);
      
      if (refTransactions && refTransactions.length > 0) {
        console.log('\n📋 Последние реферальные награды:');
        refTransactions.forEach((tx, index) => {
          console.log(`   ${index + 1}. User ${tx.user_id}: ${tx.amount} ${tx.currency}, ${tx.created_at}`);
        });
      }
    }

    // 5. ГЛАВНАЯ ПРОВЕРКА: анализ времени создания VS времени в referrals
    console.log('\n5️⃣ КЛЮЧЕВАЯ ПРОВЕРКА: Временной анализ...');
    
    const { data: recentUsers, error } = await supabase
      .from('users')
      .select('*')
      .gte('created_at', '2025-07-16')
      .order('created_at', { ascending: false });

    const { data: recentReferrals } = await supabase
      .from('referrals')
      .select('*')
      .gte('created_at', '2025-07-16')
      .order('created_at', { ascending: false });

    console.log(`📊 Пользователей с 16 июля: ${recentUsers?.length || 0}`);
    console.log(`📊 Записей в referrals с 16 июля: ${recentReferrals?.length || 0}`);

    // Проверяем процент успешности
    const usersWithReferrer = recentUsers?.filter(u => u.referred_by !== null) || [];
    const successRate = recentUsers?.length > 0 ? (usersWithReferrer.length / recentUsers.length * 100).toFixed(1) : 0;
    
    console.log(`📊 Пользователей С реферером: ${usersWithReferrer.length}`);
    console.log(`📊 Процент успешности реферальных связей: ${successRate}%`);

    console.log('\n📋 ИТОГ ПРОВЕРКИ:');
    console.log('='.repeat(30));
    
    if (successRate < 50) {
      console.log('🚨 ДИАГНОСТИКА ПОДТВЕРЖДЕНА: Серьезная проблема с реферальными связями');
      console.log(`   - Успешность связей: ${successRate}% (критично низкая)`);
      console.log('   - Большинство новых пользователей регистрируются БЕЗ реферера');
    } else {
      console.log('✅ Реферральная система работает относительно нормально');
      console.log(`   - Успешность связей: ${successRate}% (приемлемо)`);
    }

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

verifyDiagnosis().then(() => {
  console.log('\n✅ Проверка завершена');
}).catch(error => {
  console.error('❌ Ошибка:', error);
});