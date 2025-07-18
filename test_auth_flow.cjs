const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Создаем клиент Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testAuthFlow() {
  console.log('=== ТЕСТ ПОТОКА АВТОРИЗАЦИИ ===');
  
  // Проверим User 184 - имеет ли он реферальный код
  const { data: user184 } = await supabase
    .from('users')
    .select('id, telegram_id, username, ref_code')
    .eq('id', 184)
    .single();
  
  console.log('User 184 ref_code:', user184?.ref_code);
  
  console.log('\n=== ТЕСТ ENDPOINT /api/v2/auth/login ===');
  
  // Создаем тестовые данные для авторизации
  const testInitData = 'user=%7B%22id%22%3A777888999%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22test_user_777888999%22%2C%22language_code%22%3A%22en%22%2C%22allows_write_to_pm%22%3Atrue%7D&chat_instance=-1234567890&chat_type=private&auth_date=1752844999&hash=fake_hash_for_testing';
  
  try {
    const response = await fetch('http://localhost:3000/api/v2/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        initData: testInitData,
        ref_by: user184.ref_code // Используем реальный реферальный код
      })
    });
    
    const result = await response.json();
    console.log('Результат авторизации:', result);
    
    if (result.success && result.isNewUser) {
      console.log('✅ Новый пользователь создан!');
      console.log('✅ Проверяем processReferral...');
      
      // Ждем немного чтобы processReferral завершился
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Проверяем что случилось с новым пользователем
      const { data: newUserData } = await supabase
        .from('users')
        .select('id, telegram_id, username, referred_by, ref_code')
        .eq('telegram_id', 777888999)
        .single();
      
      console.log('Новый пользователь:', newUserData);
      
      if (newUserData) {
        // Проверяем запись в referrals
        const { data: referralData } = await supabase
          .from('referrals')
          .select('*')
          .eq('user_id', newUserData.id);
        
        console.log('Записи в referrals:', referralData);
        
        // Очищаем тестовые данные
        await supabase.from('users').delete().eq('id', newUserData.id);
        await supabase.from('referrals').delete().eq('user_id', newUserData.id);
        console.log('✅ Тестовые данные очищены');
      }
    } else {
      console.log('❌ Пользователь не создан или не новый');
    }
    
  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
  }
  
  process.exit(0);
}

testAuthFlow().catch(console.error);