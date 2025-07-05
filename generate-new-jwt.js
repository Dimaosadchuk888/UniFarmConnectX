import jwt from 'jsonwebtoken';
import { supabase } from './core/supabase.ts';
import dotenv from 'dotenv';

dotenv.config();

async function generateNewJWT() {
  console.log('🔍 Генерация нового JWT токена...\n');
  
  try {
    // Получаем реального пользователя из базы (не user 48)
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .neq('id', 48) // Исключаем пользователя 48
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error || !users || users.length === 0) {
      console.error('❌ Не удалось найти других пользователей');
      return;
    }
    
    console.log('📋 Найдены пользователи:');
    users.forEach(u => {
      console.log(`  ID: ${u.id}, telegram_id: ${u.telegram_id}, username: ${u.username}`);
    });
    
    // Берем первого пользователя не 48
    const user = users[0];
    console.log(`\n✅ Используем пользователя ID: ${user.id}`);
    
    // Генерируем новый JWT токен с правильными данными
    const jwtSecret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';
    const payload = {
      userId: user.id, // Правильный user ID
      telegram_id: user.telegram_id, // Правильный telegram_id из базы
      username: user.username,
      ref_code: user.ref_code,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };
    
    const token = jwt.sign(payload, jwtSecret);
    
    console.log('\n🎯 Новый JWT токен сгенерирован:');
    console.log('================================');
    console.log(token);
    console.log('================================');
    
    console.log('\n📋 Payload токена:');
    console.log(JSON.stringify(payload, null, 2));
    
    console.log('\n🔧 Инструкция по применению:');
    console.log('1. Откройте консоль браузера (F12)');
    console.log('2. Вставьте следующий код:');
    console.log(`\nlocalStorage.setItem('authToken', '${token}');\nlocalStorage.setItem('jwt_token', '${token}');\nlocation.reload();\n`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

generateNewJWT();