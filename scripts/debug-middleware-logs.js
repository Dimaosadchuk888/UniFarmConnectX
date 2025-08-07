import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Создаем клиент Supabase как в middleware
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function debugMiddlewareLogs() {
  console.log('🔍 Отладка middleware логики для user_id=62');
  console.log('='.repeat(50));
  
  // Проверяем require логику как в middleware
  console.log('📋 Проверка require() модуля как в middleware:');
  
  try {
    // Эмулируем require как в middleware (строка 53)
    const { SupabaseUserRepository } = require('../modules/user/service');
    console.log('  ✅ require() успешно загрузил SupabaseUserRepository');
    
    const userRepository = new SupabaseUserRepository();
    console.log('  ✅ Создан экземпляр userRepository');
    
    // Эмулируем поиск пользователя как в middleware (строка 58)
    console.log('\n📋 Поиск пользователя как в middleware:');
    const fullUser = await userRepository.getUserById(62);
    
    if (fullUser) {
      console.log('  ✅ Пользователь найден:');
      console.log(`    ID: ${fullUser.id}`);
      console.log(`    telegram_id: ${fullUser.telegram_id}`);
      console.log(`    username: ${fullUser.username}`);
    } else {
      console.log('  ❌ Пользователь НЕ найден');
    }
    
  } catch (error) {
    console.error('  ❌ Ошибка при require():', error.message);
    console.error('  Stack:', error.stack);
    
    // Альтернативный способ
    console.log('\n📋 Попробуем альтернативный подход:');
    try {
      // Прямой доступ к Supabase
      const { data: user, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', 62)
        .single();
        
      if (dbError && dbError.code !== 'PGRST116') {
        console.log('  ❌ Ошибка БД:', dbError.message);
      } else if (user) {
        console.log('  ✅ Пользователь найден напрямую через Supabase');
      } else {
        console.log('  ❌ Пользователь не найден');
      }
    } catch (e) {
      console.error('  ❌ Критическая ошибка:', e.message);
    }
  }
  
  // Проверяем путь к модулю
  console.log('\n📋 Проверка путей:');
  console.log(`  Текущая директория: ${process.cwd()}`);
  console.log(`  __dirname был бы: ${import.meta.url}`);
  
  // Проверяем переменные окружения
  console.log('\n📋 Проверка окружения:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  Supabase подключен: ${!!supabase}`);
  
  console.log('\n' + '='.repeat(50));
}

debugMiddlewareLogs();