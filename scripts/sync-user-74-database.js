import { supabase } from '../core/supabase.js';

async function syncUser74() {
  console.log('🔄 Синхронизация пользователя ID 74 с базой данных Supabase...\n');
  
  try {
    // 1. Проверяем существование пользователя
    console.log('1️⃣ Проверка существования пользователя ID 74...');
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 74)
      .single();
      
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ Ошибка при проверке:', selectError);
      return;
    }
    
    if (existingUser) {
      console.log('✅ Пользователь найден:', {
        id: existingUser.id,
        telegram_id: existingUser.telegram_id,
        username: existingUser.username,
        balance_uni: existingUser.balance_uni,
        balance_ton: existingUser.balance_ton,
        created_at: existingUser.created_at
      });
      
      // 2. Обновляем балансы если нужно
      if (existingUser.balance_uni !== 1000 || existingUser.balance_ton !== 1000) {
        console.log('\n2️⃣ Обновление балансов до 1000 UNI / 1000 TON...');
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            balance_uni: 1000,
            balance_ton: 1000
          })
          .eq('id', 74);
          
        if (updateError) {
          console.error('❌ Ошибка обновления балансов:', updateError);
          return;
        }
        
        console.log('✅ Балансы успешно обновлены!');
      } else {
        console.log('✅ Балансы уже корректные: 1000 UNI / 1000 TON');
      }
      
    } else {
      // 3. Создаем пользователя если его нет
      console.log('⚠️ Пользователь ID 74 не найден. Создаю нового...\n');
      
      const newUser = {
        id: 74,
        telegram_id: 999489,
        username: 'test_user_1752129840905',
        first_name: 'Test User',
        ref_code: 'TEST_1752129840905_dokxv0',
        balance_uni: 1000,
        balance_ton: 1000,
        uni_farming_active: false,
        uni_deposit_amount: 0,
        uni_farming_balance: 0,
        ton_boost_active: false,
        ton_boost_package: null,
        created_at: new Date().toISOString()
      };
      
      const { error: insertError } = await supabase
        .from('users')
        .insert(newUser);
        
      if (insertError) {
        console.error('❌ Ошибка создания пользователя:', insertError);
        return;
      }
      
      console.log('✅ Пользователь успешно создан!');
      console.log(newUser);
    }
    
    // 4. Финальная проверка
    console.log('\n3️⃣ Финальная проверка пользователя...');
    const { data: finalUser, error: finalError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton, created_at')
      .eq('id', 74)
      .single();
      
    if (finalError || !finalUser) {
      console.error('❌ Финальная проверка не удалась:', finalError);
      return;
    }
    
    console.log('\n✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
    console.log('📊 Финальное состояние пользователя:');
    console.log(finalUser);
    
    // 5. Проверяем другие связанные таблицы
    console.log('\n4️⃣ Проверка связанных таблиц...');
    
    // Проверяем таблицу wallets если она существует
    const { data: tables } = await supabase
      .rpc('get_tables', { schema_name: 'public' });
      
    if (tables && tables.some(t => t.table_name === 'wallets')) {
      console.log('📂 Найдена таблица wallets, проверяю...');
      
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', 74)
        .single();
        
      if (!walletError && wallet) {
        console.log('✅ Запись в wallets найдена:', wallet);
      } else if (walletError && walletError.code === 'PGRST116') {
        console.log('⚠️ Записи в wallets нет, но балансы хранятся в users');
      }
    }
    
    console.log('\n✨ Все проверки завершены!');
    console.log('🎯 Пользователь ID 74 готов к использованию');
    console.log('💰 Балансы: 1000 UNI / 1000 TON');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

syncUser74();