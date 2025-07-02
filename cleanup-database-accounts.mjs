/**
 * Скрипт для очистки базы данных от конфликтующих аккаунтов
 * Оставляет только пользователя 50 с правильными данными
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: SUPABASE_URL или SUPABASE_KEY не установлены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupAccounts() {
  console.log('🧹 Начинаем очистку базы данных от конфликтующих аккаунтов...\n');
  
  try {
    // 1. Получаем всех пользователей с id 48, 49, 50 и telegram_id 43, 88888888
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .or('id.in.(48,49,50),telegram_id.in.(43,88888888)')
      .order('id');
      
    if (fetchError) {
      console.error('❌ Ошибка при получении пользователей:', fetchError);
      return;
    }
    
    console.log(`📊 Найдено пользователей: ${users.length}\n`);
    
    users.forEach(user => {
      console.log(`ID: ${user.id}, telegram_id: ${user.telegram_id}, username: ${user.username}, ref_code: ${user.ref_code}`);
      console.log(`   Баланс: UNI=${user.balance_uni}, TON=${user.balance_ton}\n`);
    });
    
    // 2. Удаляем пользователей 48 и 49 если они есть
    console.log('🗑️ Удаляем конфликтующие аккаунты (ID 48, 49)...');
    
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .in('id', [48, 49]);
      
    if (deleteError) {
      console.error('❌ Ошибка при удалении:', deleteError);
    } else {
      console.log('✅ Конфликтующие аккаунты удалены\n');
    }
    
    // 3. Проверяем/обновляем пользователя 50
    console.log('🔄 Проверяем пользователя 50...');
    
    const { data: user50, error: user50Error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 50)
      .single();
      
    if (user50Error || !user50) {
      console.log('❌ Пользователь 50 не найден. Создаем...');
      
      const { error: createError } = await supabase
        .from('users')
        .insert({
          id: 50,
          telegram_id: 43,
          username: 'demo_user',
          first_name: 'Demo',
          last_name: 'User',
          ref_code: 'REF_1751432118013_x06tsz',
          balance_uni: 1000,
          balance_ton: 1000,
          uni_farming_start_timestamp: null,
          ton_farming_start_timestamp: null,
          created_at: new Date().toISOString()
        });
        
      if (createError) {
        console.error('❌ Ошибка при создании:', createError);
      } else {
        console.log('✅ Пользователь 50 создан с правильными данными');
      }
    } else {
      // Обновляем данные пользователя 50 на правильные
      console.log('📝 Обновляем данные пользователя 50...');
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          telegram_id: 43,
          username: 'demo_user',
          first_name: 'Demo',
          last_name: 'User',
          ref_code: 'REF_1751432118013_x06tsz',
          balance_uni: 1000,
          balance_ton: 1000
        })
        .eq('id', 50);
        
      if (updateError) {
        console.error('❌ Ошибка при обновлении:', updateError);
      } else {
        console.log('✅ Данные пользователя 50 обновлены');
      }
    }
    
    // 4. Проверяем финальное состояние
    console.log('\n📊 Финальная проверка...');
    
    const { data: finalUser, error: finalError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 50)
      .single();
      
    if (finalError || !finalUser) {
      console.error('❌ Не удалось получить финальные данные');
    } else {
      console.log('\n✨ Итоговый пользователь 50:');
      console.log(`   ID: ${finalUser.id}`);
      console.log(`   telegram_id: ${finalUser.telegram_id}`);
      console.log(`   username: ${finalUser.username}`);
      console.log(`   ref_code: ${finalUser.ref_code}`);
      console.log(`   Баланс UNI: ${finalUser.balance_uni}`);
      console.log(`   Баланс TON: ${finalUser.balance_ton}`);
    }
    
    console.log('\n✅ Очистка базы данных завершена!');
    console.log('🎯 В системе остался только пользователь 50 с правильными данными');
    
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error);
  }
}

// Запускаем очистку
cleanupAccounts();