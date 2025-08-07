import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Функция из middleware
async function getUserById(userId) {
  try {
    console.log(`🔎 [Middleware simulation] getUserById(${userId})`);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Ошибка Supabase:', error.message);
      return null;
    }

    if (data) {
      console.log('✅ Пользователь найден:', data.id, data.username);
    } else {
      console.log('❌ Пользователь не найден');
    }
    
    return data;
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
    return null;
  }
}

async function simulateMiddleware() {
  console.log('🔍 ЗАДАЧА 3: Симуляция middleware проверки');
  console.log('='.repeat(50));
  
  // JWT токен из логов
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MTc4MDUyMTkxOF9lMXY2MmQiLCJpYXQiOjE3NTE4Njk5NzYsImV4cCI6MTc1MjQ3NDc3Nn0.3OX9TDF5XpRW8PUHeozdIoBRIl-UWvjNJWKHbn56Fso';
  
  try {
    // Шаг 1: Декодирование
    console.log('📋 Шаг 1: Декодирование JWT...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`  userId: ${decoded.userId}`);
    console.log(`  telegram_id: ${decoded.telegram_id}`);
    
    // Шаг 2: Извлечение userId (как в middleware)
    console.log('\n📋 Шаг 2: Извлечение userId...');
    const userId = decoded.userId || decoded.user_id;
    console.log(`  userId для поиска: ${userId}`);
    console.log(`  Тип: ${typeof userId}`);
    
    // Шаг 3: Поиск пользователя
    console.log('\n📋 Шаг 3: Поиск пользователя в БД...');
    const fullUser = await getUserById(userId);
    
    if (!fullUser) {
      console.log('\n❌ ПРОБЛЕМА: Пользователь не найден!');
      
      // Дополнительная проверка - а что если userId строка?
      console.log('\n🔍 Проверка с userId как строкой...');
      const userAsString = await getUserById(String(userId));
      if (userAsString) {
        console.log('⚠️ НАЙДЕНО: Проблема с типом данных! userId должен быть числом.');
      }
      
      // Проверка других пользователей
      console.log('\n🔍 Проверка соседних ID...');
      for (let id = 60; id <= 64; id++) {
        const user = await getUserById(id);
        console.log(`  ID ${id}: ${user ? '✅ Найден' : '❌ Не найден'}`);
      }
    } else {
      console.log('\n✅ Пользователь успешно найден через middleware логику!');
    }
    
  } catch (error) {
    console.error('💥 Ошибка при симуляции:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Симуляция завершена');
}

simulateMiddleware();