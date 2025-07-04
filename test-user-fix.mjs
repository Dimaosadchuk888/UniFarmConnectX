import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  console.log('🔧 Создание тестового пользователя для проверки guest_id логики...');
  
  const testGuestId = 'guest_1751644443385_l5fujk';
  
  // Проверяем, есть ли уже пользователь с таким guest_id
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('*')
    .eq('guest_id', testGuestId)
    .single();
    
  if (existingUser) {
    console.log('✅ Пользователь с guest_id уже существует:', {
      id: existingUser.id,
      guest_id: existingUser.guest_id,
      telegram_id: existingUser.telegram_id
    });
    return;
  }
  
  // Создаем нового пользователя с этим guest_id
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      telegram_id: 999888777,  // Уникальный telegram_id
      username: 'test_guest_user',
      first_name: 'Guest Test User',
      guest_id: testGuestId,
      ref_code: `REF_${Date.now()}_test`,
      balance_uni: '100',
      balance_ton: '50',
      created_at: new Date().toISOString()
    })
    .select()
    .single();
    
  if (createError) {
    console.error('❌ Ошибка создания пользователя:', createError);
    return;
  }
  
  console.log('✅ Тестовый пользователь создан:', {
    id: newUser.id,
    guest_id: newUser.guest_id,
    telegram_id: newUser.telegram_id,
    username: newUser.username
  });
  
  // Тестируем API запрос
  console.log('\n🧪 Тестируем API запрос...');
  try {
    const response = await fetch('http://localhost:3000/api/v2/users/profile', {
      headers: {
        'X-Guest-ID': testGuestId,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('📝 Результат API:', {
      success: result.success,
      user_id: result.data?.user?.id,
      telegram_id: result.data?.user?.telegram_id,
      username: result.data?.user?.username
    });
    
    if (result.data?.user?.id === newUser.id) {
      console.log('🎉 SUCCESS! API возвращает правильного пользователя по guest_id');
    } else {
      console.log('❌ FAILED! API возвращает неправильного пользователя');
      console.log('Ожидался ID:', newUser.id);
      console.log('Получен ID:', result.data?.user?.id);
    }
    
  } catch (error) {
    console.error('❌ Ошибка API запроса:', error.message);
  }
}

createTestUser().catch(console.error);