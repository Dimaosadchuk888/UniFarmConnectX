import { supabase } from '../core/supabase.js';

async function syncUser74() {
  console.log('🔄 Начинаем синхронизацию пользователя ID 74...');
  
  try {
    // 1. Проверяем существование пользователя
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 74)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = не найдено
      console.error('❌ Ошибка при проверке пользователя:', checkError);
      return;
    }
    
    if (existingUser) {
      console.log('✅ Пользователь ID 74 уже существует:', existingUser);
      
      // Обновляем балансы если они неправильные
      if (existingUser.balance_uni !== '1000' || existingUser.balance_ton !== '1000') {
        console.log('🔧 Обновляем балансы...');
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            balance_uni: '1000',
            balance_ton: '1000'
          })
          .eq('id', 74);
        
        if (updateError) {
          console.error('❌ Ошибка обновления балансов:', updateError);
        } else {
          console.log('✅ Балансы обновлены: 1000 UNI, 1000 TON');
        }
      }
    } else {
      console.log('⚠️ Пользователь ID 74 не найден, создаем...');
      
      // Создаем нового пользователя
      const newUser = {
        id: 74,
        telegram_id: 999489,
        username: 'test_user_1752129840905',
        first_name: 'Test',
        last_name: null,
        is_premium: false,
        language_code: 'en',
        balance_uni: '1000',
        balance_ton: '1000',
        ref_code: `REF_${Date.now()}_test74`,
        referred_by: null,
        is_active: true,
        is_admin: false,
        uni_farming_balance: '0',
        uni_farming_active: false,
        uni_farming_start_timestamp: null,
        uni_deposit_amount: '0',
        ton_wallet_address: null,
        ton_wallet_verified: false,
        ton_wallet_linked_at: null,
        ton_boost_package: null,
        ton_boost_active_until: null,
        created_at: new Date().toISOString()
      };
      
      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Ошибка создания пользователя:', createError);
        console.error('Детали:', createError.details);
      } else {
        console.log('✅ Пользователь успешно создан:', createdUser);
      }
    }
    
    // 3. Проверяем финальный результат
    const { data: finalUser, error: finalError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton, ref_code')
      .eq('id', 74)
      .single();
    
    if (finalError) {
      console.error('❌ Не удалось получить финальные данные:', finalError);
    } else {
      console.log('✅ Финальное состояние пользователя:', finalUser);
    }
    
  } catch (error) {
    console.error('❌ Непредвиденная ошибка:', error);
  }
}

// Запускаем синхронизацию
syncUser74();