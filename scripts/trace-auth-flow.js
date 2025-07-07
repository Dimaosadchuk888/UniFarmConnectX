import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function traceAuthFlow() {
  console.log('🔍 ЗАДАЧА 4: Трассировка потока авторизации');
  console.log('='.repeat(50));
  
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MTc4MDUyMTkxOF9lMXY2MmQiLCJpYXQiOjE3NTE4Njk5NzYsImV4cCI6MTc1MjQ3NDc3Nn0.3OX9TDF5XpRW8PUHeozdIoBRIl-UWvjNJWKHbn56Fso';
  
  // Тест 1: Прямой API запрос
  console.log('📋 Тест 1: Прямой запрос к API...');
  try {
    const response = await fetch('http://localhost:3000/api/v2/users/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`  Статус: ${response.status}`);
    console.log(`  Ответ:`, JSON.stringify(data, null, 2));
    
    if (response.status === 401) {
      console.log('\n⚠️ ОБНАРУЖЕНА ПРОБЛЕМА: API возвращает 401');
      
      // Проверим timing
      console.log('\n📋 Проверка timing (Race Condition)...');
      
      // Создадим нового пользователя и сразу попробуем его найти
      const testUserId = 88888850;
      console.log(`  Создаем тестового пользователя с telegram_id=${testUserId}...`);
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          telegram_id: testUserId,
          username: 'race_condition_test',
          first_name: 'Test',
          ref_code: `REF_TEST_${Date.now()}`,
          balance_uni: '0',
          balance_ton: '0'
        })
        .select()
        .single();
        
      if (createError) {
        console.error('  ❌ Ошибка создания:', createError.message);
      } else {
        console.log(`  ✅ Создан пользователь с ID=${newUser.id}`);
        
        // Сразу пытаемся найти
        console.log('  Немедленный поиск...');
        const { data: foundImmediately } = await supabase
          .from('users')
          .select('id')
          .eq('id', newUser.id)
          .single();
          
        console.log(`  Найден сразу: ${foundImmediately ? '✅ ДА' : '❌ НЕТ'}`);
        
        // Ждем 1 секунду
        console.log('  Ждем 1 секунду...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: foundAfterDelay } = await supabase
          .from('users')
          .select('id')
          .eq('id', newUser.id)
          .single();
          
        console.log(`  Найден после задержки: ${foundAfterDelay ? '✅ ДА' : '❌ НЕТ'}`);
        
        // Удаляем тестового пользователя
        await supabase.from('users').delete().eq('id', newUser.id);
      }
    }
    
  } catch (error) {
    console.error('💥 Ошибка при запросе:', error.message);
  }
  
  // Тест 2: Проверка переменных окружения
  console.log('\n📋 Тест 2: Проверка переменных окружения...');
  console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Установлен' : '❌ НЕ установлен'}`);
  console.log(`  SUPABASE_KEY: ${process.env.SUPABASE_KEY ? '✅ Установлен' : '❌ НЕ установлен'}`);
  console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Установлен' : '❌ НЕ установлен'}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Трассировка завершена');
}

traceAuthFlow();