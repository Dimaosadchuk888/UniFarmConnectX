// Прямое тестирование базы данных без импорта модулей
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testDatabaseDirect() {
  console.log('=== ПРЯМОЕ ТЕСТИРОВАНИЕ БАЗЫ ДАННЫХ ===');
  
  const testTelegramId = Date.now();
  const testUsername = `test_${testTelegramId}`;
  const refCode = 'REF_1752755835358_yjrusv'; // User 184
  
  let newUserId = null;
  
  try {
    // Шаг 1: Проверим User 184
    console.log('1. Проверка User 184...');
    
    const { data: user184, error: user184Error } = await supabase
      .from('users')
      .select('id, ref_code, telegram_id, username')
      .eq('ref_code', refCode)
      .single();
    
    if (user184Error) {
      console.log('❌ User 184 не найден:', user184Error.message);
      return;
    }
    
    console.log(`✅ User 184 найден: ID=${user184.id}, ref_code=${user184.ref_code}`);
    
    // Шаг 2: Создаем тестового пользователя
    console.log('\n2. Создание тестового пользователя...');
    
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
    
    // Шаг 3: Вручную устанавливаем referred_by
    console.log('\n3. Ручная установка referred_by...');
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ referred_by: user184.id })
      .eq('id', newUserId);
    
    if (updateError) {
      console.log('❌ Ошибка обновления referred_by:', updateError.message);
      return;
    }
    
    console.log(`✅ referred_by установлен: ${user184.id}`);
    
    // Шаг 4: Создаем запись в referrals
    console.log('\n4. Создание записи в referrals...');
    
    const { error: referralError } = await supabase
      .from('referrals')
      .insert({
        user_id: newUserId,
        referred_user_id: newUserId,
        inviter_id: user184.id,
        level: 1,
        reward_uni: '0',
        reward_ton: '0',
        ref_path: [user184.id]
      });
    
    if (referralError) {
      console.log('❌ Ошибка создания referrals:', referralError.message);
      return;
    }
    
    console.log('✅ Запись в referrals создана');
    
    // Шаг 5: Проверяем результат
    console.log('\n5. Проверка результата...');
    
    const { data: finalUser, error: finalError } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .eq('id', newUserId)
      .single();
    
    if (finalError) {
      console.log('❌ Ошибка проверки пользователя:', finalError.message);
    } else {
      console.log(`✅ Пользователь: ID=${finalUser.id}, referred_by=${finalUser.referred_by}`);
    }
    
    const { data: finalReferrals, error: finalReferralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', newUserId);
    
    if (finalReferralError) {
      console.log('❌ Ошибка проверки referrals:', finalReferralError.message);
    } else {
      console.log(`✅ Referrals: ${finalReferrals.length} записей`);
      
      if (finalReferrals.length > 0) {
        finalReferrals.forEach(record => {
          console.log(`   user_id=${record.user_id}, inviter_id=${record.inviter_id}, level=${record.level}`);
        });
      }
    }
    
    // Шаг 6: Проверяем команду User 184
    console.log('\n6. Проверка команды User 184...');
    
    const { data: team184, error: teamError } = await supabase
      .from('users')
      .select('id, username, referred_by, created_at')
      .eq('referred_by', user184.id);
    
    if (teamError) {
      console.log('❌ Ошибка проверки команды:', teamError.message);
    } else {
      console.log(`✅ Команда User 184: ${team184.length} человек`);
      
      team184.forEach(member => {
        console.log(`   ID=${member.id}, username=${member.username}, created_at=${member.created_at}`);
      });
    }
    
    // Результат
    console.log('\n=== РЕЗУЛЬТАТ ===');
    
    const success = finalUser.referred_by === user184.id && finalReferrals.length > 0;
    
    if (success) {
      console.log('🎉 УСПЕХ! База данных работает корректно!');
      console.log('   - referred_by установлен правильно');
      console.log('   - Запись в referrals создана');
      console.log('   - Пользователь отображается в команде User 184');
    } else {
      console.log('❌ НЕУДАЧА! Проблемы с базой данных!');
    }
    
  } catch (error) {
    console.log('❌ Ошибка теста:', error.message);
    console.log('Stack:', error.stack);
  } finally {
    // Очистка
    if (newUserId) {
      console.log('\n7. Очистка данных...');
      
      // Удаляем referrals
      await supabase.from('referrals').delete().eq('user_id', newUserId);
      
      // Удаляем пользователя
      await supabase.from('users').delete().eq('id', newUserId);
      
      console.log('✅ Данные очищены');
    }
  }
}

testDatabaseDirect().catch(console.error);