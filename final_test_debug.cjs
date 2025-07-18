// Финальная диагностика с детальным логированием
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function finalTestDebug() {
  console.log('=== ФИНАЛЬНАЯ ДИАГНОСТИКА ===');
  
  const testTelegramId = Date.now();
  const testUsername = `test_${testTelegramId}`;
  const refCode = 'REF_1752755835358_yjrusv';
  
  console.log('🚀 Параметры теста:');
  console.log(`   telegram_id: ${testTelegramId}`);
  console.log(`   username: ${testUsername}`);
  console.log(`   refBy: ${refCode}`);
  
  try {
    // Тест 1: Аутентификация
    console.log('\n1. Аутентификация...');
    
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
      console.log('❌ Аутентификация не удалась:', authResult.error);
      return;
    }
    
    const newUserId = authResult.data.user.id;
    console.log(`   Создан пользователь: ${newUserId}`);
    console.log(`   referred_by: ${authResult.data.user.referred_by}`);
    
    // Тест 2: Немедленная проверка в БД
    console.log('\n2. Немедленная проверка в БД...');
    
    const { data: freshUser, error: freshError } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, created_at')
      .eq('id', newUserId)
      .single();
    
    if (freshError) {
      console.log('❌ Ошибка поиска пользователя:', freshError.message);
    } else {
      console.log(`✅ Пользователь найден: ID=${freshUser.id}, referred_by=${freshUser.referred_by}`);
    }
    
    // Тест 3: Проверка referrals
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
          console.log(`   user_id=${record.user_id}, inviter_id=${record.inviter_id}, level=${record.level}`);
        });
      }
    }
    
    // Тест 4: Проверка команды User 184
    console.log('\n4. Проверка команды User 184...');
    
    const { data: team184, error: teamError } = await supabase
      .from('users')
      .select('id, username, referred_by, created_at')
      .eq('referred_by', 184)
      .order('created_at', { ascending: false });
    
    if (teamError) {
      console.log('❌ Ошибка проверки команды:', teamError.message);
    } else {
      console.log(`✅ Команда User 184: ${team184.length} человек`);
      
      const recentMembers = team184.slice(0, 3);
      console.log('   Последние 3 участника:');
      recentMembers.forEach(member => {
        console.log(`   - ID=${member.id}, username=${member.username}, created_at=${member.created_at}`);
      });
    }
    
    // Диагностика
    console.log('\n=== ДИАГНОСТИКА ===');
    
    const isReferralWorking = freshUser.referred_by === 184 && referralRecords.length > 0;
    
    if (isReferralWorking) {
      console.log('🎉 ВЕЛИКОЛЕПНО! Реферальная система РАБОТАЕТ!');
      console.log('   - User создан с правильным referred_by');
      console.log('   - Записи в referrals созданы');
      console.log('   - Пользователь отображается в команде User 184');
    } else {
      console.log('❌ ПРОБЛЕМА: Реферальная система НЕ работает!');
      console.log('   Проблемы:');
      
      if (freshUser.referred_by !== 184) {
        console.log(`   - referred_by неправильный (${freshUser.referred_by} вместо 184)`);
      }
      
      if (referralRecords.length === 0) {
        console.log('   - Записи в referrals не созданы');
      }
      
      console.log('\n   Возможные причины:');
      console.log('   1. Параметр refBy не передается правильно');
      console.log('   2. Логика processReferral не выполняется');
      console.log('   3. Ошибка в ReferralService');
    }
    
    // Очистка
    console.log('\n5. Очистка данных...');
    
    await supabase.from('referrals').delete().eq('user_id', newUserId);
    await supabase.from('users').delete().eq('id', newUserId);
    
    console.log('✅ Данные очищены');
    
  } catch (error) {
    console.log('❌ Ошибка теста:', error.message);
  }
}

finalTestDebug().catch(console.error);