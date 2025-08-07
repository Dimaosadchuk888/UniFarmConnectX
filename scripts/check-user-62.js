import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkUser() {
  console.log('🔍 ЗАДАЧА 1: Проверка пользователя с ID=62 в Supabase');
  console.log('='.repeat(50));
  
  try {
    // Проверяем подключение к правильному проекту
    console.log('📦 Supabase URL:', process.env.SUPABASE_URL);
    console.log('🔑 JWT Secret:', process.env.JWT_SECRET ? 'Установлен' : 'НЕ УСТАНОВЛЕН');
    console.log('');
    
    // Ищем пользователя по ID
    console.log('🔎 Поиск пользователя по ID=62...');
    const { data: userById, error: errorById } = await supabase
      .from('users')
      .select('*')
      .eq('id', 62)
      .single();
      
    if (errorById && errorById.code !== 'PGRST116') {
      console.error('❌ Ошибка при поиске по ID:', errorById);
    } else if (userById) {
      console.log('✅ Пользователь найден по ID=62:');
      console.log(JSON.stringify(userById, null, 2));
    } else {
      console.log('❌ Пользователь с ID=62 НЕ найден');
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Ищем пользователя по telegram_id
    console.log('🔎 Поиск пользователя по telegram_id=88888848...');
    const { data: userByTg, error: errorByTg } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', 88888848)
      .order('id', { ascending: false })
      .limit(5);
      
    if (errorByTg) {
      console.error('❌ Ошибка при поиске по telegram_id:', errorByTg);
    } else if (userByTg && userByTg.length > 0) {
      console.log(`✅ Найдено ${userByTg.length} пользователей с telegram_id=88888848:`);
      userByTg.forEach((user, index) => {
        console.log(`\n📍 Пользователь ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Username: ${user.username}`);
        console.log(`  Ref Code: ${user.ref_code}`);
        console.log(`  Created: ${user.created_at}`);
      });
    } else {
      console.log('❌ Пользователи с telegram_id=88888848 НЕ найдены');
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Проверяем последних созданных пользователей
    console.log('📊 Последние 5 созданных пользователей:');
    const { data: lastUsers, error: errorLast } = await supabase
      .from('users')
      .select('id, telegram_id, username, created_at')
      .order('id', { ascending: false })
      .limit(5);
      
    if (errorLast) {
      console.error('❌ Ошибка при получении последних пользователей:', errorLast);
    } else if (lastUsers) {
      console.log(lastUsers);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Проверка завершена');
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  }
}

checkUser();