import { supabase } from '../core/supabase.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

async function createAuthToken() {
  console.log('🔄 Создаем авторизационный токен для пользователя ID 74...');
  
  try {
    // Проверяем существование пользователя
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 74)
      .single();
      
    if (error || !user) {
      console.error('❌ Пользователь ID 74 не найден в базе данных');
      return;
    }
    
    console.log('✅ Пользователь найден:', {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      balance_uni: user.balance_uni,
      balance_ton: user.balance_ton
    });
    
    // Создаем payload для JWT
    const payload = {
      userId: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      ref_code: user.ref_code
    };
    
    // Получаем JWT секрет
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET не установлен в переменных окружения');
      return;
    }
    
    // Генерируем токен
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    
    console.log('\n✅ JWT токен успешно создан!');
    console.log('📋 Токен:', token);
    
    // Проверяем токен
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('\n🔍 Проверка токена:');
    console.log(decoded);
    
    // Инструкция для применения
    console.log('\n📌 Для применения токена выполните в консоли браузера:');
    console.log(`localStorage.setItem('unifarm_jwt_token', '${token}');`);
    console.log('location.reload();');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

createAuthToken();