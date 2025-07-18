// Прямое тестирование реферальной системы
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Импорт ReferralService
const { ReferralService } = require('./modules/referral/service');

async function testDirectReferral() {
  console.log('=== ПРЯМОЕ ТЕСТИРОВАНИЕ РЕФЕРАЛЬНОЙ СИСТЕМЫ ===');
  
  const testTelegramId = Date.now();
  const testUsername = `test_${testTelegramId}`;
  const refCode = 'REF_1752755835358_yjrusv'; // User 184
  
  let newUserId = null;
  
  try {
    // Шаг 1: Создаем пользователя вручную
    console.log('1. Создание тестового пользователя...');
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        telegram_id: testTelegramId,
        username: testUsername,
        first_name: 'Test User',
        ref_code: `REF_${testTelegramId}_test`,
        referred_by: null,
        balance_uni: '0',
        balance_ton: '0',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Ошибка создания пользователя:', createError.message);
      return;
    }
    
    newUserId = newUser.id;
    console.log(`✅ Пользователь создан: ID=${newUserId}`);
    
    // Шаг 2: Тестируем processReferral напрямую
    console.log('\n2. Тестирование processReferral...');
    
    const referralService = new ReferralService();
    const result = await referralService.processReferral(refCode, newUserId.toString());
    
    console.log('✅ Результат processReferral:');
    console.log(`   success: ${result.success}`);
    console.log(`   error: ${result.error || 'нет'}`);
    console.log(`   referrerId: ${result.referrerId || 'нет'}`);
    
    // Шаг 3: Проверяем результат в БД
    console.log('\n3. Проверка в БД...');
    
    // Проверяем users
    const { data: updatedUser, error: userError } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .eq('id', newUserId)
      .single();
    
    if (userError) {
      console.log('❌ Ошибка поиска пользователя:', userError.message);
    } else {
      console.log(`✅ Пользователь: ID=${updatedUser.id}, referred_by=${updatedUser.referred_by}`);
    }
    
    // Проверяем referrals
    const { data: referralRecords, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', newUserId);
    
    if (referralError) {
      console.log('❌ Ошибка поиска referrals:', referralError.message);
    } else {
      console.log(`✅ Referrals: ${referralRecords.length} записей`);
      
      if (referralRecords.length > 0) {
        referralRecords.forEach(record => {
          console.log(`   user_id=${record.user_id}, inviter_id=${record.inviter_id}, level=${record.level}`);
        });
      }
    }
    
    // Результат
    console.log('\n=== РЕЗУЛЬТАТ ===');
    
    const success = result.success && updatedUser.referred_by === 184 && referralRecords.length > 0;
    
    if (success) {
      console.log('🎉 УСПЕХ! processReferral работает!');
    } else {
      console.log('❌ НЕУДАЧА! processReferral НЕ работает!');
      console.log('   Проблемы:');
      
      if (!result.success) {
        console.log(`   - processReferral вернул success=false: ${result.error}`);
      }
      
      if (updatedUser.referred_by !== 184) {
        console.log(`   - referred_by не установлен (${updatedUser.referred_by} вместо 184)`);
      }
      
      if (referralRecords.length === 0) {
        console.log('   - Записи в referrals не созданы');
      }
    }
    
  } catch (error) {
    console.log('❌ Ошибка теста:', error.message);
    console.log('Stack:', error.stack);
  } finally {
    // Очистка
    if (newUserId) {
      console.log('\n4. Очистка данных...');
      
      // Удаляем referrals
      await supabase.from('referrals').delete().eq('user_id', newUserId);
      
      // Удаляем пользователя
      await supabase.from('users').delete().eq('id', newUserId);
      
      console.log('✅ Данные очищены');
    }
  }
}

testDirectReferral().catch(console.error);