const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function debugJwtAuth() {
  console.log('🔍 ДИАГНОСТИКА JWT AUTHENTICATION');
  console.log('=================================');
  
  // Получаем правильные данные User 184
  const { data: user, error } = await supabase
    .from('users')
    .select('id, telegram_id, username, first_name, ref_code')
    .eq('id', 184)
    .single();

  if (error) {
    console.error('❌ Ошибка получения пользователя:', error.message);
    return;
  }

  console.log('1️⃣ User 184 данные из БД:');
  console.log('  - ID:', user.id);
  console.log('  - telegram_id:', user.telegram_id);
  console.log('  - username:', user.username);

  // Создаем JWT токен
  const jwtSecret = process.env.JWT_SECRET || 'test_secret_key';
  const payload = {
    telegram_id: user.telegram_id,
    username: user.username, 
    ref_code: user.ref_code
  };

  const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

  console.log('\n2️⃣ JWT токен создан:');
  console.log('  - JWT Secret:', jwtSecret.substring(0, 15) + '...');
  console.log('  - Payload:', payload);
  console.log('  - Token длина:', token.length);

  // Проверяем верификацию токена
  try {
    const decoded = jwt.verify(token, jwtSecret);
    console.log('\n3️⃣ JWT декодирован успешно:');
    console.log('  - telegram_id:', decoded.telegram_id);
    console.log('  - username:', decoded.username);
    console.log('  - ref_code:', decoded.ref_code);
    console.log('  - exp:', new Date(decoded.exp * 1000).toLocaleString());
  } catch (jwtError) {
    console.error('\n❌ JWT декодирование не удалось:', jwtError.message);
    return;
  }

  // Проверим что middleware ищет пользователя по telegram_id
  console.log('\n4️⃣ Проверим поиск пользователя в middleware:');
  const { data: foundUser, error: findError } = await supabase
    .from('users')
    .select('id, telegram_id, username')
    .eq('telegram_id', payload.telegram_id)
    .single();

  if (findError) {
    console.error('❌ Middleware не найдет пользователя:', findError.message);
    console.log('❌ КОРНЕВАЯ ПРИЧИНА: middleware ищет по telegram_id, но пользователь не найден');
  } else {
    console.log('✅ Middleware найдет пользователя:');
    console.log('  - ID:', foundUser.id);
    console.log('  - telegram_id:', foundUser.telegram_id);
    console.log('  - username:', foundUser.username);
  }

  console.log('\n🎯 ЗАКЛЮЧЕНИЕ:');
  if (findError) {
    console.log('❌ Проблема в JWT middleware - пользователь не найден по telegram_id');
  } else {
    console.log('✅ JWT токен и поиск пользователя должны работать');
    console.log('❌ Проблема возможно в другом месте middleware');
  }
}

debugJwtAuth();