import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersSchema() {
  console.log('🔍 Проверка структуры таблицы users...');
  
  // Получим одного пользователя чтобы увидеть все колонки
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }
  
  if (users.length > 0) {
    console.log('📊 Доступные колонки в таблице users:');
    Object.keys(users[0]).forEach(key => {
      console.log(`  - ${key}: ${typeof users[0][key]} = ${users[0][key]}`);
    });
  }
  
  // Проверим все пользователи
  const { data: allUsers, error: allError } = await supabase
    .from('users')
    .select('id, telegram_id, username, ref_code')
    .order('id');
    
  if (allUsers) {
    console.log('\n👥 Все пользователи в базе:');
    allUsers.forEach(user => {
      console.log(`  ID ${user.id}: telegram_id=${user.telegram_id}, username=${user.username}, ref_code=${user.ref_code}`);
    });
  }
}

checkUsersSchema().catch(console.error);