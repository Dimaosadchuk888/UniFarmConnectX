// Проверка работы исправленной реферальной системы
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testReferralFix() {
  console.log('=== ПРОВЕРКА ИСПРАВЛЕНИЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ ===');
  
  // Создаем тестовые данные для имитации регистрации
  const testTelegramId = Math.floor(Math.random() * 1000000000);
  const testUsername = `test_${Date.now()}`;
  const refCode = 'REF_1752755835358_yjrusv'; // Код User 184
  
  console.log('Тестовые данные:');
  console.log('- Telegram ID:', testTelegramId);
  console.log('- Username:', testUsername);  
  console.log('- Ref Code:', refCode);
  
  try {
    // Отправляем запрос на регистрацию
    console.log('\n1. Отправляем запрос регистрации...');
    
    const response = await fetch('http://localhost:3000/api/v2/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        initData: `user=${encodeURIComponent(JSON.stringify({
          id: testTelegramId,
          first_name: "Test",
          username: testUsername
        }))}&chat_instance=-1&chat_type=private&auth_date=${Math.floor(Date.now() / 1000)}&hash=test_hash`,
        ref_by: refCode
      })
    });
    
    const result = await response.json();
    console.log('Статус:', response.status);
    console.log('Ответ:', JSON.stringify(result, null, 2));
    
    if (result.success && result.isNewUser) {
      console.log('✅ Новый пользователь создан');
      
      // Ждем обработки реферальной связи
      console.log('\n2. Ожидаем обработки реферальной связи...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Проверяем результат в БД
      console.log('\n3. Проверяем результат в БД...');
      
      const { data: user } = await supabase
        .from('users')
        .select('id, telegram_id, username, referred_by, created_at')
        .eq('telegram_id', testTelegramId)
        .single();
      
      if (user) {
        console.log('✅ Пользователь найден:', user);
        
        if (user.referred_by === 184) {
          console.log('✅ ИСПРАВЛЕНИЕ СРАБОТАЛО - referred_by установлен на 184');
          
          // Проверяем запись в referrals
          const { data: referralRecord } = await supabase
            .from('referrals')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (referralRecord) {
            console.log('✅ Запись в referrals создана:', referralRecord);
            console.log('✅ ПОЛНЫЙ УСПЕХ - реферальная система работает!');
          } else {
            console.log('❌ Запись в referrals НЕ создана');
          }
        } else {
          console.log('❌ ИСПРАВЛЕНИЕ НЕ СРАБОТАЛО - referred_by:', user.referred_by);
        }
        
        // Очищаем тестовые данные
        console.log('\n4. Очищаем тестовые данные...');
        await supabase.from('referrals').delete().eq('user_id', user.id);
        await supabase.from('users').delete().eq('id', user.id);
        console.log('✅ Тестовые данные очищены');
        
      } else {
        console.log('❌ Пользователь НЕ найден в БД');
      }
      
    } else {
      console.log('❌ Регистрация не удалась');
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
  
  console.log('\n=== ЗАКЛЮЧЕНИЕ ===');
  console.log('Если тест показал "ПОЛНЫЙ УСПЕХ", то динамический импорт');
  console.log('успешно заменен на статический и реферальная система работает.');
}

testReferralFix().catch(console.error);