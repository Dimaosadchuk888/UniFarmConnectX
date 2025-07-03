/**
 * Отладочный скрипт для проверки данных пользователя
 */

import { createClient } from '@supabase/supabase-js';

async function debugUserData() {
  console.log('=== ОТЛАДКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ ===');
  
  // Подключение к Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Отсутствуют переменные SUPABASE_URL или SUPABASE_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // 1. Ищем пользователя по ID = 48
    console.log('\n1. Поиск пользователя по ID = 48:');
    const { data: userById, error: errorById } = await supabase
      .from('users')
      .select('*')
      .eq('id', 48)
      .single();
      
    if (errorById) {
      console.error('Ошибка:', errorById.message);
    } else {
      console.log('✅ Найден:', {
        id: userById?.id,
        telegram_id: userById?.telegram_id,
        username: userById?.username,
        balance_uni: userById?.balance_uni,
        balance_ton: userById?.balance_ton,
        ref_code: userById?.ref_code
      });
    }
    
    // 2. Ищем пользователя по telegram_id = 88888888
    console.log('\n2. Поиск пользователя по telegram_id = 88888888:');
    const { data: userByTelegram, error: errorByTelegram } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', 88888888)
      .single();
      
    if (errorByTelegram) {
      console.error('Ошибка:', errorByTelegram.message);
    } else {
      console.log('✅ Найден:', {
        id: userByTelegram?.id,
        telegram_id: userByTelegram?.telegram_id,
        username: userByTelegram?.username,
        balance_uni: userByTelegram?.balance_uni,
        balance_ton: userByTelegram?.balance_ton,
        ref_code: userByTelegram?.ref_code
      });
    }
    
    // 3. Ищем пользователя по telegram_id = 48
    console.log('\n3. Поиск пользователя по telegram_id = 48:');
    const { data: userByTelegram48, error: errorByTelegram48 } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', 48)
      .single();
      
    if (errorByTelegram48) {
      console.error('Ошибка:', errorByTelegram48.message);
    } else {
      console.log('✅ Найден:', {
        id: userByTelegram48?.id,
        telegram_id: userByTelegram48?.telegram_id,
        username: userByTelegram48?.username,
        balance_uni: userByTelegram48?.balance_uni,
        balance_ton: userByTelegram48?.balance_ton,
        ref_code: userByTelegram48?.ref_code
      });
    }
    
    // 4. Показываем всех пользователей
    console.log('\n4. Все пользователи в базе:');
    const { data: allUsers, error: errorAll } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton, ref_code')
      .order('id');
      
    if (errorAll) {
      console.error('Ошибка:', errorAll.message);
    } else {
      console.log('Всего пользователей:', allUsers?.length);
      allUsers?.forEach(user => {
        console.log(`  ID: ${user.id}, telegram_id: ${user.telegram_id}, username: ${user.username}, UNI: ${user.balance_uni}, TON: ${user.balance_ton}, ref: ${user.ref_code}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error.message);
  }
}

debugUserData().catch(console.error);