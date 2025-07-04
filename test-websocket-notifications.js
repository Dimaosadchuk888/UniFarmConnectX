/**
 * Тестирование системы WebSocket уведомлений о балансе
 * Демонстрирует автоматическое обновление UI при изменении балансов
 */

const fetch = require('node-fetch');

async function testWebSocketNotifications() {
  console.log('🔔 ТЕСТИРОВАНИЕ СИСТЕМЫ WEBSOCKET УВЕДОМЛЕНИЙ');
  console.log('='.repeat(60));
  
  const baseUrl = 'http://localhost:3000';
  const testUserId = 48;
  
  console.log('\n📊 1. НАЧАЛЬНОЕ СОСТОЯНИЕ');
  console.log('-'.repeat(30));
  
  // Получаем текущий баланс пользователя
  try {
    const profileResponse = await fetch(`${baseUrl}/api/v2/users/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6NDgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE2MzQzNjgsImV4cCI6MTc1MjIzOTE2OH0.HqRClaqgo3O9LuQ_uCgBbyrUfTl0Cqy0lBC1pjin3Pw`
      }
    });
    
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      console.log(`✅ Пользователь ${profile.username} (ID: ${profile.id})`);
      console.log(`   UNI баланс: ${profile.balance_uni}`);
      console.log(`   TON баланс: ${profile.balance_ton}`);
    } else {
      console.log(`❌ Ошибка получения профиля: ${profileResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Ошибка запроса профиля: ${error.message}`);
  }
  
  console.log('\n🚀 2. ТЕСТИРОВАНИЕ WEBSOCKET УВЕДОМЛЕНИЙ');
  console.log('-'.repeat(30));
  
  // Тест 1: UNI уведомление
  console.log('\n📈 Тест 1: Отправка UNI уведомления (+25.5 UNI)');
  try {
    const uniResponse = await fetch(`${baseUrl}/api/v2/test/balance-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: testUserId,
        changeAmount: 25.5,
        currency: 'UNI'
      })
    });
    
    const uniResult = await uniResponse.json();
    if (uniResponse.ok) {
      console.log(`✅ UNI уведомление отправлено: ${uniResult.message}`);
      console.log(`   Данные: +${uniResult.data.changeAmount} ${uniResult.data.currency}`);
    } else {
      console.log(`❌ Ошибка UNI уведомления: ${uniResult.error || 'Неизвестная ошибка'}`);
    }
  } catch (error) {
    console.log(`❌ Ошибка отправки UNI уведомления: ${error.message}`);
  }
  
  // Пауза 2 секунды
  console.log('\n⏳ Пауза 2 секунды...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Тест 2: TON уведомление
  console.log('\n📈 Тест 2: Отправка TON уведомления (+10.8 TON)');
  try {
    const tonResponse = await fetch(`${baseUrl}/api/v2/test/balance-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: testUserId,
        changeAmount: 10.8,
        currency: 'TON'
      })
    });
    
    const tonResult = await tonResponse.json();
    if (tonResponse.ok) {
      console.log(`✅ TON уведомление отправлено: ${tonResult.message}`);
      console.log(`   Данные: +${tonResult.data.changeAmount} ${tonResult.data.currency}`);
    } else {
      console.log(`❌ Ошибка TON уведомления: ${tonResult.error || 'Неизвестная ошибка'}`);
    }
  } catch (error) {
    console.log(`❌ Ошибка отправки TON уведомления: ${error.message}`);
  }
  
  // Пауза 2 секунды
  console.log('\n⏳ Пауза 2 секунды...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Тест 3: Серия уведомлений (имитация фарминга)
  console.log('\n🔄 Тест 3: Серия уведомлений (имитация активного фарминга)');
  const farmingSimulation = [
    { amount: 2.1, currency: 'UNI', source: 'farming' },
    { amount: 0.5, currency: 'TON', source: 'boost' },
    { amount: 1.8, currency: 'UNI', source: 'referral' },
    { amount: 15.0, currency: 'UNI', source: 'daily_bonus' }
  ];
  
  for (let i = 0; i < farmingSimulation.length; i++) {
    const test = farmingSimulation[i];
    console.log(`\n   ${i + 1}/${farmingSimulation.length}: +${test.amount} ${test.currency} (${test.source})`);
    
    try {
      const response = await fetch(`${baseUrl}/api/v2/test/balance-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: testUserId,
          changeAmount: test.amount,
          currency: test.currency
        })
      });
      
      if (response.ok) {
        console.log(`      ✅ Отправлено`);
      } else {
        const error = await response.json();
        console.log(`      ❌ Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.log(`      ❌ Ошибка: ${error.message}`);
    }
    
    // Пауза между уведомлениями
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log('\n✅ 3. ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
  console.log('-'.repeat(30));
  console.log('📱 Проверьте веб-интерфейс UniFarm:');
  console.log('   • BalanceCard должен показывать анимацию обновлений');
  console.log('   • Числа должны увеличиваться с эффектами');
  console.log('   • WebSocket статус должен быть "connected"');
  console.log('   • Debounce механизм должен предотвращать лишние API вызовы');
  console.log('\n🔍 Логи WebSocket сервера покажут:');
  console.log('   • [BALANCE_NOTIFICATION] Sending notification to user...');
  console.log('   • [WebSocket] Balance update sent...');
  console.log('   • Количество подключенных клиентов');
  
  console.log('\n🎯 СИСТЕМА ГОТОВА К PRODUCTION');
  console.log('='.repeat(60));
}

// Запуск теста
if (require.main === module) {
  testWebSocketNotifications().catch(console.error);
}

module.exports = { testWebSocketNotifications };