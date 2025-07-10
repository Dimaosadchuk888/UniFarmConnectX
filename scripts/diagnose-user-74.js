import { supabase } from '../core/supabase.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

async function diagnoseUser74() {
  console.log('🔬 Диагностика пользователя ID 74...\n');
  
  try {
    // 1. Проверяем JWT токен
    console.log('1️⃣ Проверка JWT токена...');
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc0LCJ0ZWxlZ3JhbV9pZCI6OTk5NDg5LCJ1c2VybmFtZSI6InRlc3RfdXNlcl8xNzUyMTI5ODQwOTA1IiwicmVmX2NvZGUiOiJURVNUXzE3NTIxMjk4NDA5MDVfZG9reHYwIiwiaWF0IjoxNzUyMTQzMjE3LCJleHAiOjE3NTI3NDgwMTd9.0SHPKWAt_BazW4o8HX7r6hsXGUynqEoRiMbI9uNG5aI';
    
    const JWT_SECRET = process.env.JWT_SECRET;
    console.log('JWT_SECRET установлен:', !!JWT_SECRET);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ JWT токен валидный:', decoded);
      console.log('   - userId:', decoded.userId, '(тип:', typeof decoded.userId, ')');
      console.log('   - telegram_id:', decoded.telegram_id);
      console.log('   - Истекает:', new Date(decoded.exp * 1000).toLocaleString());
    } catch (err) {
      console.error('❌ JWT токен невалидный:', err.message);
    }
    
    // 2. Проверяем пользователя в БД по разным полям
    console.log('\n2️⃣ Поиск пользователя в базе данных...');
    
    // По ID
    const { data: userById, error: errorById } = await supabase
      .from('users')
      .select('*')
      .eq('id', 74)
      .single();
      
    console.log('\nПоиск по id=74:');
    if (userById) {
      console.log('✅ Найден:', {
        id: userById.id,
        telegram_id: userById.telegram_id,
        username: userById.username,
        balance_uni: userById.balance_uni,
        balance_ton: userById.balance_ton
      });
    } else {
      console.log('❌ Не найден. Ошибка:', errorById);
    }
    
    // По telegram_id
    const { data: userByTelegramId, error: errorByTelegramId } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', 999489)
      .single();
      
    console.log('\nПоиск по telegram_id=999489:');
    if (userByTelegramId) {
      console.log('✅ Найден:', {
        id: userByTelegramId.id,
        telegram_id: userByTelegramId.telegram_id,
        username: userByTelegramId.username
      });
    } else {
      console.log('❌ Не найден. Ошибка:', errorByTelegramId);
    }
    
    // 3. Проверяем все пользователи с ID около 74
    console.log('\n3️⃣ Пользователи с ID 70-80...');
    const { data: nearbyUsers } = await supabase
      .from('users')
      .select('id, telegram_id, username, created_at')
      .gte('id', 70)
      .lte('id', 80)
      .order('id');
      
    if (nearbyUsers && nearbyUsers.length > 0) {
      console.log('Найдено пользователей:', nearbyUsers.length);
      nearbyUsers.forEach(u => {
        console.log(`  - ID ${u.id}: @${u.username} (telegram_id: ${u.telegram_id})`);
      });
    } else {
      console.log('Пользователей в диапазоне 70-80 не найдено');
    }
    
    // 4. Проверяем тип данных ID в БД
    console.log('\n4️⃣ Проверка типов данных...');
    if (userById) {
      console.log('Тип поля id в БД:', typeof userById.id);
      console.log('Значение id:', userById.id);
      console.log('Сравнение с числом 74:', userById.id === 74);
      console.log('Сравнение со строкой "74":', userById.id === '74');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

diagnoseUser74();