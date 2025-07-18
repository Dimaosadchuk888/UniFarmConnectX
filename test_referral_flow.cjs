// Тест полного потока реферальной системы
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testReferralFlow() {
  console.log('=== ТЕСТ ПОЛНОГО ПОТОКА РЕФЕРАЛЬНОЙ СИСТЕМЫ ===');
  
  // Создаем тестовые данные
  const testTelegramId = Math.floor(Math.random() * 1000000000);
  const testUsername = `test_${Date.now()}`;
  const refCode = 'REF_1752755835358_yjrusv'; // Код User 184
  
  console.log('🚀 Тестовые данные:');
  console.log(`   telegram_id: ${testTelegramId}`);
  console.log(`   username: ${testUsername}`);
  console.log(`   ref_code: ${refCode}`);
  
  try {
    // Проверяем, что сервер работает
    console.log('\n1. Проверка сервера...');
    
    const healthResponse = await fetch('http://localhost:3000/health');
    if (!healthResponse.ok) {
      console.log('❌ Сервер не отвечает');
      return;
    }
    
    console.log('✅ Сервер работает');
    
    // Проверяем auth endpoint
    console.log('\n2. Проверка auth endpoint...');
    
    const authData = {
      initData: `user=${encodeURIComponent(JSON.stringify({
        id: testTelegramId,
        first_name: "Test",
        username: testUsername
      }))}&chat_instance=-1&chat_type=private&auth_date=${Math.floor(Date.now() / 1000)}&hash=test_hash`,
      ref_by: refCode
    };
    
    console.log('📤 Отправляем запрос с данными:');
    console.log(`   initData: ${authData.initData.substring(0, 100)}...`);
    console.log(`   ref_by: ${authData.ref_by}`);
    
    const authResponse = await fetch('http://localhost:3000/api/v2/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authData)
    });
    
    console.log(`📥 Получен ответ: ${authResponse.status} ${authResponse.statusText}`);
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.log('❌ Ошибка auth endpoint:', errorText);
      return;
    }
    
    const authResult = await authResponse.json();
    console.log('📋 Результат аутентификации:');
    console.log(JSON.stringify(authResult, null, 2));
    
    if (!authResult.success) {
      console.log('❌ Аутентификация не удалась');
      return;
    }
    
    // Проверяем результат в БД
    console.log('\n3. Проверка результата в БД...');
    
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, created_at')
      .eq('telegram_id', testTelegramId)
      .single();
    
    if (userError) {
      console.log('❌ Ошибка поиска пользователя:', userError.message);
      return;
    }
    
    if (!newUser) {
      console.log('❌ Пользователь не найден в БД');
      return;
    }
    
    console.log('✅ Пользователь найден:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   telegram_id: ${newUser.telegram_id}`);
    console.log(`   username: ${newUser.username}`);
    console.log(`   referred_by: ${newUser.referred_by}`);
    console.log(`   created_at: ${newUser.created_at}`);
    
    // Проверяем referred_by
    if (newUser.referred_by === 184) {
      console.log('\n✅ УСПЕХ: referred_by установлен правильно (184)');
    } else if (newUser.referred_by === null) {
      console.log('\n❌ ПРОБЛЕМА: referred_by не установлен (null)');
    } else {
      console.log(`\n⚠️  НЕОЖИДАННО: referred_by = ${newUser.referred_by}`);
    }
    
    // Проверяем запись в referrals
    console.log('\n4. Проверка записи в referrals...');
    
    const { data: referralRecord, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', newUser.id)
      .single();
    
    if (referralError && referralError.code !== 'PGRST116') {
      console.log('❌ Ошибка поиска referral:', referralError.message);
    } else if (!referralRecord) {
      console.log('❌ Запись в referrals не найдена');
    } else {
      console.log('✅ Запись в referrals найдена:');
      console.log(`   ID: ${referralRecord.id}`);
      console.log(`   user_id: ${referralRecord.user_id}`);
      console.log(`   inviter_id: ${referralRecord.inviter_id}`);
      console.log(`   created_at: ${referralRecord.created_at}`);
      
      // Проверяем временную синхронизацию
      const userTime = new Date(newUser.created_at);
      const referralTime = new Date(referralRecord.created_at);
      const timeDiff = Math.abs(referralTime - userTime);
      
      console.log(`   ⏱️  Разница во времени: ${timeDiff}ms`);
      
      if (timeDiff < 5000) {
        console.log('   ✅ Записи созданы синхронно');
      } else {
        console.log('   ❌ Записи созданы с задержкой');
      }
    }
    
    // Очищаем тестовые данные
    console.log('\n5. Очистка тестовых данных...');
    
    if (referralRecord) {
      await supabase.from('referrals').delete().eq('id', referralRecord.id);
      console.log('✅ Запись в referrals удалена');
    }
    
    await supabase.from('users').delete().eq('id', newUser.id);
    console.log('✅ Пользователь удален');
    
    console.log('\n=== ИТОГОВЫЙ РЕЗУЛЬТАТ ===');
    
    if (newUser.referred_by === 184 && referralRecord) {
      console.log('🎉 ПОЛНЫЙ УСПЕХ: Реферальная система работает идеально!');
    } else if (newUser.referred_by === 184) {
      console.log('⚠️  ЧАСТИЧНЫЙ УСПЕХ: referred_by установлен, но referrals не создан');
    } else {
      console.log('❌ НЕУДАЧА: referred_by не установлен');
    }
    
  } catch (error) {
    console.log('❌ Ошибка теста:', error.message);
  }
}

testReferralFlow().catch(console.error);