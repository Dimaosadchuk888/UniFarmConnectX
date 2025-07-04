/**
 * Проверка пользователя ID 48 напрямую через Supabase API
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUser48() {
  console.log('🔍 Проверяем пользователя ID 48 в базе данных Supabase...');
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  try {
    // Проверяем пользователя ID 48
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, ref_code, telegram_id, balance_uni, balance_ton')
      .eq('id', 48)
      .single();
    
    console.log('\n📊 Результат поиска пользователя ID=48:');
    console.log('Error:', error);
    console.log('Data:', user);
    
    if (error) {
      console.log('\n❌ Ошибка при поиске пользователя:', error.message);
      
      // Попробуем найти всех пользователей для понимания структуры
      console.log('\n🔍 Получаем список всех пользователей...');
      const { data: allUsers, error: allError } = await supabase
        .from('users')
        .select('id, username, telegram_id, ref_code')
        .limit(10);
      
      if (allError) {
        console.log('❌ Ошибка получения списка пользователей:', allError.message);
      } else {
        console.log('✅ Найдено пользователей:', allUsers.length);
        allUsers.forEach(u => {
          console.log(`  - ID: ${u.id}, username: ${u.username}, telegram_id: ${u.telegram_id}, ref_code: ${u.ref_code}`);
        });
      }
    } else {
      console.log('\n✅ Пользователь ID=48 найден успешно!');
      console.log(`  - Username: ${user.username}`);
      console.log(`  - Telegram ID: ${user.telegram_id}`);
      console.log(`  - Ref Code: ${user.ref_code}`);
      console.log(`  - UNI Balance: ${user.balance_uni}`);
      console.log(`  - TON Balance: ${user.balance_ton}`);
    }
    
  } catch (err) {
    console.error('❌ Критическая ошибка:', err);
  }
}

checkUser48();