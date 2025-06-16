import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ SUPABASE_URL или SUPABASE_KEY не найдены в переменных окружения');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  try {
    console.log('🔍 Проверка пользователей в Supabase...');
    
    const { data, error } = await supabase
      .from('users')
      .select('id, telegram_id, username, first_name, ref_code, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log('❌ Ошибка запроса:', error.message);
      return;
    }

    console.log('✅ Найдено пользователей:', data.length);
    data.forEach(user => {
      console.log(`ID: ${user.id}, Telegram ID: ${user.telegram_id}, Username: ${user.username}, Ref: ${user.ref_code}`);
    });
    
  } catch (error) {
    console.log('❌ Ошибка подключения:', error.message);
  }
}

checkUsers();