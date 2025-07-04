import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const jwtSecret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAuthSystem() {
  console.log('🔧 ИСПРАВЛЕНИЕ СИСТЕМЫ АВТОРИЗАЦИИ');
  console.log('Проблема: В localStorage сохранён JWT токен с userId: 48');
  console.log('Решение: Создать нового пользователя с правильным telegram_id\n');
  
  // 1. Создадим нового пользователя для текущего guest_id
  const guestId = 'guest_1751644443385_l5fujk';
  const newTelegramId = 123456789; // Уникальный telegram_id для тестирования
  
  console.log('📝 Создание нового пользователя...');
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      telegram_id: newTelegramId,
      username: 'test_new_auth_user',
      first_name: 'New Auth User',
      ref_code: `REF_${Date.now()}_new_auth`,
      balance_uni: 500,
      balance_ton: 25,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
    
  if (createError) {
    console.error('❌ Ошибка создания пользователя:', createError.message);
    return;
  }
  
  console.log('✅ Новый пользователь создан:', {
    id: newUser.id,
    telegram_id: newUser.telegram_id,
    username: newUser.username,
    ref_code: newUser.ref_code
  });
  
  // 2. Создадим новый JWT токен для этого пользователя
  const newJwtPayload = {
    userId: newUser.id,
    telegram_id: newUser.telegram_id,
    username: newUser.username,
    ref_code: newUser.ref_code
  };
  
  const newToken = jwt.sign(newJwtPayload, jwtSecret, { expiresIn: '7d' });
  console.log('\n🎫 Новый JWT токен создан');
  console.log('Payload:', newJwtPayload);
  
  // 3. Протестируем API с новым пользователем
  console.log('\n🧪 Тестирование API...');
  
  // Попробуем без JWT токена (пустой localStorage)
  try {
    const response1 = await fetch('http://localhost:3000/api/v2/users/profile', {
      headers: {
        'X-Guest-ID': guestId,
        'Content-Type': 'application/json'
      }
    });
    
    const result1 = await response1.json();
    console.log('📊 API без JWT (должен fallback):', {
      success: result1.success,
      user_id: result1.data?.user?.id
    });
    
    // Теперь с новым JWT токеном
    const response2 = await fetch('http://localhost:3000/api/v2/users/profile', {
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result2 = await response2.json();
    console.log('📊 API с новым JWT:', {
      success: result2.success,
      user_id: result2.data?.user?.id,
      telegram_id: result2.data?.user?.telegram_id
    });
    
    if (result2.data?.user?.id === newUser.id) {
      console.log('\n🎉 SUCCESS! Система авторизации работает правильно!');
      console.log('🔧 Инструкции для пользователя:');
      console.log('1. Откройте DevTools (F12)');
      console.log('2. Перейдите на вкладку Application > Local Storage');
      console.log('3. Найдите ключ с JWT токеном и замените его на:');
      console.log(`   ${newToken}`);
      console.log('4. Перезагрузите страницу');
      console.log(`\nТеперь API будет возвращать user_id=${newUser.id} вместо 48`);
    } else {
      console.log('❌ Проблема с middleware - JWT токен не обрабатывается');
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования API:', error.message);
  }
}

fixAuthSystem().catch(console.error);