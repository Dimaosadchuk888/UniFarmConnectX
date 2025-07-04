/**
 * ТЕСТИРОВАНИЕ API /api/v2/referrals/stats С ПРАВИЛЬНОЙ АВТОРИЗАЦИЕЙ
 */
import fetch from 'node-fetch';

async function testAuthReferralAPI() {
  console.log('🔍 ТЕСТИРОВАНИЕ API /api/v2/referrals/stats С JWT АВТОРИЗАЦИЕЙ');
  console.log('='.repeat(70));

  // JWT токен для пользователя ID=48
  const jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6NDgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE2MTgyNjEsImV4cCI6MTc1MjIyMzA2MX0.-9-tDYq86Imbu-DnOFIx4smMKPR02vFkmKxWS26PT0o";

  // Тестируем endpoint /stats
  const url = 'http://localhost:3000/api/v2/referrals/stats';

  console.log('\n📡 Отправка запроса:', url);
  console.log('🔐 Используем JWT авторизацию для user_id=48');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
        'User-Agent': 'UniFarm-Test/1.0'
      }
    });

    console.log('\n📊 Статус ответа:', response.status, response.statusText);

    const data = await response.text();
    
    if (response.ok) {
      try {
        const jsonData = JSON.parse(data);
        console.log('✅ Успешный ответ:', JSON.stringify(jsonData, null, 2));
        
        if (jsonData.success && jsonData.data) {
          console.log('\n📈 СТАТИСТИКА ПАРТНЕРСКОЙ ПРОГРАММЫ:');
          console.log('=' * 50);
          console.log(`👤 Пользователь: ${jsonData.data.user_id} (${jsonData.data.username || 'Без имени'})`);
          console.log(`🔗 Реферальный код: ${jsonData.data.referral_code || 'Не найден'}`);
          console.log(`👥 Всего рефералов: ${jsonData.data.total_referrals || 0}`);
          console.log(`💰 Общий доход: ${jsonData.data.total_commission_earned || '0'} UNI/TON`);
          
          if (jsonData.data.levels_data && jsonData.data.levels_data.length > 0) {
            console.log('\n📊 ДАННЫЕ ПО УРОВНЯМ:');
            jsonData.data.levels_data.forEach(level => {
              console.log(`  Уровень ${level.level}: ${level.referrals_count} рефералов, ${level.commission_rate}% комиссия, ${level.total_earned} дохода`);
            });
          } else {
            console.log('\n📊 Данные по уровням отсутствуют');
          }
        }
      } catch (parseError) {
        console.log('✅ Ответ (text):', data);
      }
    } else {
      console.log('❌ Ошибка запроса:', data);
    }

  } catch (error) {
    console.error('💥 Ошибка выполнения запроса:', error.message);
  }
}

testAuthReferralAPI();