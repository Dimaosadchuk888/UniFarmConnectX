#!/usr/bin/env node

/**
 * Диагностика подключения Replit Preview к базе данных
 * Проверяет: подключение к Supabase, JWT токены, пользователей
 */

const dotenv = require('dotenv');
const path = require('path');

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('=== ДИАГНОСТИКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ ===\n');

// 1. Проверка переменных окружения
console.log('1. ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ:');
console.log('----------------------------------');
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Установлено' : '❌ Отсутствует'}`);
console.log(`SUPABASE_KEY: ${process.env.SUPABASE_KEY ? '✅ Установлено' : '❌ Отсутствует'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Установлено' : '❌ Отсутствует'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'не установлено'}`);
console.log();

// 2. Проверка Supabase подключения
async function checkSupabaseConnection() {
  console.log('2. ПРОВЕРКА ПОДКЛЮЧЕНИЯ К SUPABASE:');
  console.log('-----------------------------------');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.log('❌ Supabase credentials отсутствуют');
    return;
  }
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    
    // Проверяем подключение запросом количества пользователей
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Ошибка подключения:', error.message);
    } else {
      console.log('✅ Подключение успешно');
      console.log(`📊 Количество пользователей в базе: ${count}`);
    }
  } catch (err) {
    console.log('❌ Критическая ошибка:', err.message);
  }
  console.log();
}

// 3. Проверка JWT токена для user ID 74
async function checkUserJWT() {
  console.log('3. ПРОВЕРКА JWT ДЛЯ USER ID 74:');
  console.log('--------------------------------');
  
  try {
    const jwt = require('jsonwebtoken');
    
    // Проверяем существующий токен из localStorage (если есть)
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc0LCJ0ZWxlZ3JhbV9pZCI6OTk5NDg5LCJ1c2VybmFtZSI6InRlc3RfdXNlcl8xNzUyMTI5ODQwOTA1IiwicmVmX2NvZGUiOiJURVNUXzE3NTIxMjk4NDA5MDVfZG9reHYwIiwiaWF0IjoxNzUyMTQ0MjkxLCJleHAiOjE3NTI3NDkwOTF9.2A18-Rx0enn8v30ANK6RVBl7SoR_TV2fUJN2hOox-C4';
    
    try {
      const decoded = jwt.decode(testToken);
      console.log('📋 Декодированный токен:');
      console.log(`   User ID: ${decoded.userId}`);
      console.log(`   Telegram ID: ${decoded.telegram_id}`);
      console.log(`   Username: ${decoded.username}`);
      console.log(`   Истекает: ${new Date(decoded.exp * 1000).toLocaleString('ru-RU')}`);
      
      const now = Date.now() / 1000;
      if (decoded.exp < now) {
        console.log('❌ Токен истёк!');
      } else {
        console.log('✅ Токен ещё действителен');
      }
    } catch (err) {
      console.log('❌ Ошибка декодирования токена:', err.message);
    }
    
    // Генерируем новый токен
    if (process.env.JWT_SECRET) {
      console.log('\n📝 Генерация нового JWT токена для user ID 74:');
      const newToken = jwt.sign(
        {
          userId: 74,
          telegram_id: 999489,
          username: 'test_user_74',
          ref_code: 'TEST_74_REPLIT'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      console.log('✅ Новый токен сгенерирован');
      console.log('\n🔑 НОВЫЙ JWT ТОКЕН (скопируйте его):');
      console.log('=====================================');
      console.log(newToken);
      console.log('=====================================');
    } else {
      console.log('❌ JWT_SECRET не установлен - невозможно сгенерировать токен');
    }
  } catch (err) {
    console.log('❌ Ошибка работы с JWT:', err.message);
  }
  console.log();
}

// 4. Проверка пользователя в базе
async function checkUserInDatabase() {
  console.log('4. ПРОВЕРКА USER ID 74 В БАЗЕ ДАННЫХ:');
  console.log('-------------------------------------');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.log('❌ Невозможно проверить - нет подключения к Supabase');
    return;
  }
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    
    // Ищем пользователя с ID 74
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 74)
      .single();
    
    if (error && error.code === 'PGRST116') {
      console.log('❌ Пользователь с ID 74 не найден в базе данных');
      
      // Попробуем найти любого тестового пользователя
      const { data: testUsers, error: testError } = await supabase
        .from('users')
        .select('id, username, telegram_id, uni_balance, ton_balance')
        .like('username', '%test%')
        .limit(5);
      
      if (testUsers && testUsers.length > 0) {
        console.log('\n📋 Найдены тестовые пользователи:');
        testUsers.forEach(u => {
          console.log(`   ID: ${u.id}, Username: ${u.username}, Telegram: ${u.telegram_id}, UNI: ${u.uni_balance}, TON: ${u.ton_balance}`);
        });
      }
    } else if (error) {
      console.log('❌ Ошибка запроса:', error.message);
    } else if (user) {
      console.log('✅ Пользователь найден:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Telegram ID: ${user.telegram_id}`);
      console.log(`   UNI Balance: ${user.uni_balance}`);
      console.log(`   TON Balance: ${user.ton_balance}`);
      console.log(`   Создан: ${new Date(user.created_at).toLocaleString('ru-RU')}`);
    }
  } catch (err) {
    console.log('❌ Критическая ошибка:', err.message);
  }
}

// Запуск всех проверок
async function runDiagnostics() {
  await checkSupabaseConnection();
  await checkUserJWT();
  await checkUserInDatabase();
  
  console.log('\n=== ДИАГНОСТИКА ЗАВЕРШЕНА ===');
}

runDiagnostics().catch(console.error);