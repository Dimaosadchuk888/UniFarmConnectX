/**
 * ТЕСТ РЕФЕРАЛЬНОЙ СИСТЕМЫ С ЛОГИРОВАНИЕМ
 * Проверяем динамический импорт и логи сервера
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testReferralWithLogs() {
  console.log('=== ТЕСТ РЕФЕРАЛЬНОЙ СИСТЕМЫ С ЛОГИРОВАНИЕМ ===\n');
  
  try {
    // Проверяем статус сервера
    const healthResponse = await fetch('http://localhost:3000/health');
    if (!healthResponse.ok) {
      console.log('❌ Сервер не отвечает');
      return;
    }
    
    console.log('✅ Сервер работает');
    
    // Создаем валидный initData для тестирования
    const testUser = {
      id: 999999227,
      username: 'TestReferralUser227',
      first_name: 'Test',
      language_code: 'en',
      auth_date: Math.floor(Date.now() / 1000),
      hash: 'test_hash_123'
    };
    
    const initData = `user=${encodeURIComponent(JSON.stringify(testUser))}&auth_date=${testUser.auth_date}&hash=${testUser.hash}`;
    const refCode = 'REF_1750079004411_nddfp2';
    
    console.log('📝 Отправка запроса аутентификации...');
    console.log(`   Telegram ID: ${testUser.id}`);
    console.log(`   Реферальный код: ${refCode}`);
    
    // Отправляем запрос
    const response = await fetch('http://localhost:3000/api/v2/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        initData: initData,
        ref_by: refCode
      })
    });
    
    const result = await response.json();
    
    console.log('\n📊 РЕЗУЛЬТАТ АУТЕНТИФИКАЦИИ:');
    console.log('Статус:', response.status);
    console.log('Ответ:', JSON.stringify(result, null, 2));
    
    if (result.success && result.user) {
      const userId = result.user.id;
      console.log(`\n✅ Пользователь создан с ID: ${userId}`);
      
      // Проверяем реферальную связь
      console.log('\n🔍 ПРОВЕРКА РЕФЕРАЛЬНОЙ СВЯЗИ:');
      
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, telegram_id, username, referred_by')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.log('❌ Ошибка получения пользователя:', userError.message);
      } else {
        console.log('Пользователь:', user);
        
        if (user.referred_by) {
          console.log('✅ Поле referred_by заполнено:', user.referred_by);
        } else {
          console.log('❌ Поле referred_by НЕ заполнено');
        }
      }
      
      // Проверяем referrals таблицу
      const { data: referralRecord, error: referralError } = await supabase
        .from('referrals')
        .select('*')
        .eq('user_id', userId);
      
      if (referralError) {
        console.log('❌ Ошибка проверки referrals:', referralError.message);
      } else if (referralRecord.length > 0) {
        console.log('✅ Запись в referrals найдена:', referralRecord[0]);
      } else {
        console.log('❌ Запись в referrals НЕ найдена');
      }
      
      // Очистка тестовых данных
      console.log('\n🧹 ОЧИСТКА ТЕСТОВЫХ ДАННЫХ:');
      
      await supabase.from('users').delete().eq('id', userId);
      await supabase.from('referrals').delete().eq('user_id', userId);
      
      console.log('✅ Тестовые данные очищены');
      
    } else {
      console.log('❌ Ошибка создания пользователя');
    }
    
    // Проверяем логи сервера
    console.log('\n📋 ПРОВЕРКА ЛОГОВ СЕРВЕРА:');
    
    setTimeout(async () => {
      try {
        const { execSync } = require('child_process');
        const logs = execSync('tail -50 server.log 2>/dev/null || echo "Нет логов"', { encoding: 'utf8' });
        
        if (logs.includes('AuthService')) {
          console.log('✅ Найдены логи AuthService');
          
          // Извлекаем логи реферальной системы
          const referralLogs = logs.split('\n').filter(line => 
            line.includes('реферальной связи') || 
            line.includes('ReferralService') ||
            line.includes('processReferral')
          );
          
          if (referralLogs.length > 0) {
            console.log('📝 Логи реферальной системы:');
            referralLogs.forEach(log => console.log(`   ${log}`));
          } else {
            console.log('❌ Логи реферальной системы не найдены');
          }
        } else {
          console.log('❌ Логи AuthService не найдены');
        }
        
      } catch (error) {
        console.log('❌ Ошибка чтения логов:', error.message);
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

testReferralWithLogs();