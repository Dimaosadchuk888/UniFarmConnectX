/**
 * Тест TON Boost API для пользователя 48
 */

import fetch from 'node-fetch';

async function testTonBoostUser48() {
  try {
    console.log('🔍 Тестирование TON Boost API для пользователя 48...\n');
    
    const url = 'https://9e8e72ca-ad0e-4d1b-b689-b91a4832fe73-00-7a29dnah0ryx.spock.replit.dev/api/v2/boost/farming-status?user_id=48';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('📊 Результат API запроса:');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      const farmingData = data.data;
      
      console.log('\n✅ Анализ данных TON Boost:');
      console.log('- Доход в секунду TON:', farmingData.totalTonRatePerSecond);
      console.log('- Доход в день TON:', farmingData.dailyIncomeTon);
      console.log('- Доход в секунду UNI:', farmingData.totalUniRatePerSecond);
      console.log('- Доход в день UNI:', farmingData.dailyIncomeUni);
      console.log('- Количество депозитов:', farmingData.deposits.length);
      
      if (farmingData.deposits.length > 0) {
        console.log('\n📦 Депозиты:');
        farmingData.deposits.forEach((deposit, index) => {
          console.log(`  ${index + 1}. ID: ${deposit.id}, Пакет: ${deposit.package_name}, Сумма: ${deposit.amount}, Ставка: ${deposit.rate}%`);
        });
      }
    } else {
      console.log('❌ Ошибка в ответе API:', data.error || 'Неизвестная ошибка');
    }
    
  } catch (error) {
    console.error('🚫 Ошибка выполнения теста:', error.message);
  }
}

testTonBoostUser48();