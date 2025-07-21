const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function getCorrectTelegramId() {
  console.log('🔍 Получаем правильный telegram_id для User 184:');
  
  const { data: user, error } = await supabase
    .from('users')
    .select('id, telegram_id, username, first_name, ref_code')
    .eq('id', 184)
    .single();

  if (error) {
    console.error('❌ Ошибка:', error.message);
    return;
  }

  console.log('✅ User 184 найден:');
  console.log('  ID:', user.id);
  console.log('  Telegram ID:', user.telegram_id);
  console.log('  Username:', user.username);
  console.log('  First Name:', user.first_name);
  console.log('  Ref Code:', user.ref_code);
  
  // Создаем правильный JWT токен
  const jwt = require('jsonwebtoken');
  const correctToken = jwt.sign({
    telegram_id: user.telegram_id,
    username: user.username,
    ref_code: user.ref_code
  }, process.env.JWT_SECRET || 'test_secret_key', { expiresIn: '7d' });

  console.log('\n🎯 Правильный JWT токен (первые 50 символов):');
  console.log(correctToken.substring(0, 50) + '...');
  console.log('Длина токена:', correctToken.length);
  
  return { user, token: correctToken };
}

getCorrectTelegramId();