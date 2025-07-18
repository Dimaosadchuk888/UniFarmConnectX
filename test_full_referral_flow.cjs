// Полный тест реферальной системы
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testFullReferralFlow() {
  console.log('=== ПОЛНЫЙ ТЕСТ РЕФЕРАЛЬНОЙ СИСТЕМЫ ===');
  
  const testTelegramId = Date.now();
  const testUsername = `test_${testTelegramId}`;
  const refCode = 'REF_1752755835358_yjrusv'; // User 184
  
  console.log('🚀 Тестовые данные:');
  console.log(`   telegram_id: ${testTelegramId}`);
  console.log(`   username: ${testUsername}`);
  console.log(`   ref_code: ${refCode}`);
  
  let newUserId = null;
  
  try {
    // Шаг 1: Регистрация с реферальным кодом
    console.log('\n1. Регистрация пользователя с реферальным кодом...');
    
    const authResponse = await fetch('http://localhost:3000/api/v2/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        direct_registration: true,
        telegram_id: testTelegramId,
        username: testUsername,
        first_name: "Test User",
        refBy: refCode
      })
    });
    
    const authResult = await authResponse.json();
    console.log(`   Статус: ${authResponse.status}`);
    console.log(`   Успех: ${authResult.success}`);
    
    if (!authResult.success) {
      console.log('❌ Регистрация не удалась:', authResult.error);
      return;
    }
    
    newUserId = authResult.data.user.id;
    console.log(`   Создан пользователь: ${newUserId}`);
    console.log(`   referred_by: ${authResult.data.user.referred_by}`);
    
    // Шаг 2: Проверка в БД
    console.log('\n2. Проверка в БД...');
    
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, created_at')
      .eq('id', newUserId)
      .single();
    
    if (userError) {
      console.log('❌ Ошибка поиска пользователя:', userError.message);
      return;
    }
    
    console.log('✅ Пользователь найден:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   telegram_id: ${newUser.telegram_id}`);
    console.log(`   username: ${newUser.username}`);
    console.log(`   referred_by: ${newUser.referred_by}`);
    console.log(`   created_at: ${newUser.created_at}`);
    
    // Шаг 3: Проверка referrals
    console.log('\n3. Проверка referrals...');
    
    const { data: referralRecords, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', newUserId);
    
    if (referralError) {
      console.log('❌ Ошибка поиска referrals:', referralError.message);
    } else {
      console.log(`✅ Найдено ${referralRecords.length} записей в referrals`);
      
      if (referralRecords.length > 0) {
        referralRecords.forEach(record => {
          console.log(`   Реферал: user_id=${record.user_id}, inviter_id=${record.inviter_id}, level=${record.level}`);
        });
      }
    }
    
    // Шаг 4: Проверка метода processReferral() напрямую
    console.log('\n4. Тестирование processReferral() напрямую...');
    
    const processReferralResponse = await fetch('http://localhost:3000/api/v2/referral/test-process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refCode: refCode,
        newUserId: newUserId.toString()
      })
    });
    
    if (processReferralResponse.ok) {
      const processResult = await processReferralResponse.json();
      console.log('✅ Прямой тест processReferral:');
      console.log(`   Успех: ${processResult.success}`);
      console.log(`   Ошибка: ${processResult.error || 'нет'}`);
      console.log(`   Referrer ID: ${processResult.referrerId || 'нет'}`);
    } else {
      console.log('❌ Не удалось протестировать processReferral напрямую');
    }
    
    // Шаг 5: Финальная проверка
    console.log('\n5. Финальная проверка...');
    
    const { data: finalUser, error: finalError } = await supabase
      .from('users')
      .select('referred_by')
      .eq('id', newUserId)
      .single();
    
    if (finalError) {
      console.log('❌ Ошибка финальной проверки:', finalError.message);
    } else {
      console.log(`✅ Финальное значение referred_by: ${finalUser.referred_by}`);
    }
    
    const { data: finalReferrals, error: finalReferralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', newUserId);
    
    if (finalReferralError) {
      console.log('❌ Ошибка финальной проверки referrals:', finalReferralError.message);
    } else {
      console.log(`✅ Финальное количество referrals: ${finalReferrals.length}`);
    }
    
    // Результат
    console.log('\n=== РЕЗУЛЬТАТ ===');
    
    const success = finalUser.referred_by === 184 && finalReferrals.length > 0;
    
    if (success) {
      console.log('🎉 УСПЕХ! Реферальная система работает!');
    } else {
      console.log('❌ НЕУДАЧА! Реферальная система НЕ работает!');
      console.log('   Проблемы:');
      
      if (finalUser.referred_by !== 184) {
        console.log(`   - referred_by не установлен (${finalUser.referred_by} вместо 184)`);
      }
      
      if (finalReferrals.length === 0) {
        console.log('   - Записи в referrals не созданы');
      }
    }
    
  } catch (error) {
    console.log('❌ Ошибка теста:', error.message);
  } finally {
    // Очистка
    if (newUserId) {
      console.log('\n6. Очистка данных...');
      
      // Удаляем referrals
      await supabase.from('referrals').delete().eq('user_id', newUserId);
      
      // Удаляем пользователя
      await supabase.from('users').delete().eq('id', newUserId);
      
      console.log('✅ Данные очищены');
    }
  }
}

testFullReferralFlow().catch(console.error);