const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Создаем клиент Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testProcessReferral() {
  console.log('=== ТЕСТ ФУНКЦИИ processReferral ===');
  
  // Создадим тестового пользователя для проверки
  const testTelegramId = 999999999;
  const testUsername = 'test_referral_' + Date.now();
  
  console.log('\n=== 1. СОЗДАНИЕ ТЕСТОВОГО ПОЛЬЗОВАТЕЛЯ ===');
  
  // Удаляем существующего тестового пользователя если есть
  await supabase
    .from('users')
    .delete()
    .eq('telegram_id', testTelegramId);
  
  // Создаем нового тестового пользователя
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      telegram_id: testTelegramId,
      username: testUsername,
      first_name: 'Test User',
      ref_code: 'TEST_REF_' + Date.now(),
      referred_by: null,
      balance_uni: '0',
      balance_ton: '0'
    })
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Ошибка создания тестового пользователя:', createError);
    return;
  }
  
  console.log('✅ Тестовый пользователь создан:', {
    id: newUser.id,
    telegram_id: newUser.telegram_id,
    username: newUser.username,
    ref_code: newUser.ref_code
  });
  
  console.log('\n=== 2. ТЕСТ ФУНКЦИИ processReferral ===');
  
  // Получаем ref_code User 184 для теста
  const { data: user184, error: user184Error } = await supabase
    .from('users')
    .select('ref_code')
    .eq('id', 184)
    .single();
  
  if (user184Error) {
    console.error('❌ Ошибка получения User 184:', user184Error);
    return;
  }
  
  console.log('✅ Ref code User 184:', user184.ref_code);
  
  // Теперь тестируем processReferral через прямой вызов
  try {
    console.log('\n=== 3. ВЫЗОВ processReferral ===');
    
    // Импортируем ReferralService
    const { ReferralService } = require('./modules/referral/service');
    const referralService = new ReferralService();
    
    const result = await referralService.processReferral(user184.ref_code, newUser.id.toString());
    
    console.log('✅ Результат processReferral:', result);
    
    if (result.success) {
      console.log('✅ processReferral выполнен успешно!');
      
      // Проверим что изменилось в базе данных
      const { data: updatedUser } = await supabase
        .from('users')
        .select('id, referred_by')
        .eq('id', newUser.id)
        .single();
      
      console.log('✅ Обновленные данные пользователя:', updatedUser);
      
      // Проверим создалась ли запись в referrals
      const { data: referralRecord } = await supabase
        .from('referrals')
        .select('*')
        .eq('user_id', newUser.id)
        .single();
      
      console.log('✅ Запись в referrals:', referralRecord);
      
    } else {
      console.log('❌ processReferral вернул ошибку:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Ошибка вызова processReferral:', error);
  }
  
  console.log('\n=== 4. ОЧИСТКА ТЕСТОВЫХ ДАННЫХ ===');
  
  // Удаляем тестового пользователя
  await supabase
    .from('users')
    .delete()
    .eq('id', newUser.id);
  
  await supabase
    .from('referrals')
    .delete()
    .eq('user_id', newUser.id);
  
  console.log('✅ Тестовые данные очищены');
  
  process.exit(0);
}

testProcessReferral().catch(console.error);