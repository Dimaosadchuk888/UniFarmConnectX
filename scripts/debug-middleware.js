import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Создаем два клиента Supabase как в приложении
const supabaseFromCore = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const supabaseFromCoreSupabase = createClient(
  process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co',
  process.env.SUPABASE_KEY
);

async function debugMiddleware() {
  console.log('🔍 ЗАДАЧА 5: Отладка middleware логики');
  console.log('='.repeat(50));
  
  // JWT токен из браузера
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MTc4MDUyMTkxOF9lMXY2MmQiLCJpYXQiOjE3NTE4Njk5NzYsImV4cCI6MTc1MjQ3NDc3Nn0.3OX9TDF5XpRW8PUHeozdIoBRIl-UWvjNJWKHbn56Fso';
  
  // Декодируем токен
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId || decoded.user_id;
  
  console.log('📋 JWT payload:');
  console.log(`  userId: ${userId} (тип: ${typeof userId})`);
  console.log(`  telegram_id: ${decoded.telegram_id}`);
  console.log(`  username: ${decoded.username}`);
  
  console.log('\n🔍 Проверка через разные Supabase клиенты:');
  
  // Тест 1: core/supabaseClient.ts
  console.log('\n📦 Client 1 (core/supabaseClient.ts):');
  try {
    const { data: user1, error: error1 } = await supabaseFromCore
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error1 && error1.code !== 'PGRST116') {
      console.log(`  ❌ Ошибка: ${error1.message}`);
    } else if (user1) {
      console.log(`  ✅ Пользователь найден: ID=${user1.id}, username=${user1.username}`);
    } else {
      console.log('  ❌ Пользователь не найден');
    }
  } catch (e) {
    console.error('  💥 Критическая ошибка:', e.message);
  }
  
  // Тест 2: core/supabase.ts
  console.log('\n📦 Client 2 (core/supabase.ts):');
  try {
    const { data: user2, error: error2 } = await supabaseFromCoreSupabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error2 && error2.code !== 'PGRST116') {
      console.log(`  ❌ Ошибка: ${error2.message}`);
    } else if (user2) {
      console.log(`  ✅ Пользователь найден: ID=${user2.id}, username=${user2.username}`);
    } else {
      console.log('  ❌ Пользователь не найден');
    }
  } catch (e) {
    console.error('  💥 Критическая ошибка:', e.message);
  }
  
  // Проверка разных типов userId
  console.log('\n🔍 Проверка типов данных:');
  
  // Как число
  console.log('\n  Поиск как число (62):');
  const { data: asNumber } = await supabaseFromCore
    .from('users')
    .select('id, username')
    .eq('id', 62)
    .single();
  console.log(`  Результат: ${asNumber ? '✅ Найден' : '❌ Не найден'}`);
  
  // Как строка
  console.log('\n  Поиск как строка ("62"):');
  const { data: asString } = await supabaseFromCore
    .from('users')
    .select('id, username')
    .eq('id', '62')
    .single();
  console.log(`  Результат: ${asString ? '✅ Найден' : '❌ Не найден'}`);
  
  // Проверка URL Supabase
  console.log('\n🔍 Проверка конфигурации:');
  console.log(`  SUPABASE_URL из env: ${process.env.SUPABASE_URL}`);
  console.log(`  SUPABASE_URL в client 1: ${process.env.SUPABASE_URL}`);
  console.log(`  SUPABASE_URL в client 2: ${process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co'}`);
  console.log(`  Совпадают: ${process.env.SUPABASE_URL === (process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co') ? '✅ ДА' : '❌ НЕТ'}`);
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Отладка завершена');
}

debugMiddleware();