/**
 * ТЕСТИРОВАНИЕ НОВОГО API ENDPOINT ДЛЯ РЕАЛЬНОЙ СТАТИСТИКИ ПАРТНЕРСКОЙ ПРОГРАММЫ
 */

import fetch from 'node-fetch';

async function testRealReferralAPI() {
  console.log('🔍 ТЕСТИРОВАНИЕ API /api/v2/referrals/stats ДЛЯ USER_ID=48');
  console.log('='.repeat(70));
  
  const baseUrl = 'http://localhost:3000'; // Replit Preview URL
  const url = `${baseUrl}/api/v2/referrals/stats?user_id=48`;
  
  try {
    console.log('\n📡 Отправка запроса:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6NDgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE2MTgyNjEsImV4cCI6MTc1MjIyMzA2MX0.-9-tDYq86Imbu-DnOFIx4smMKPR02vFkmKxWS26PT0o'
      }
    });
    
    console.log('📊 Статус ответа:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Ошибка запроса:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n✅ ОТВЕТ API:');
    console.log(JSON.stringify(data, null, 2));
    
    // Анализируем структуру ответа
    if (data.success && data.data) {
      const statsData = data.data;
      
      console.log('\n📈 АНАЛИЗ ДАННЫХ:');
      console.log('-'.repeat(50));
      
      console.log(`👥 Общее количество партнеров: ${statsData.total_referrals}`);
      
      if (statsData.level_income && Object.keys(statsData.level_income).length > 0) {
        console.log('\n💰 ДОХОДЫ ПО УРОВНЯМ:');
        Object.keys(statsData.level_income).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
          const income = statsData.level_income[level];
          console.log(`   Уровень ${level}: ${income.uni.toFixed(6)} UNI + ${income.ton.toFixed(6)} TON`);
        });
        
        // Подсчитываем общий доход
        const totalUni = Object.values(statsData.level_income).reduce((sum, income) => sum + income.uni, 0);
        const totalTon = Object.values(statsData.level_income).reduce((sum, income) => sum + income.ton, 0);
        
        console.log(`\n💎 Общий доход: ${totalUni.toFixed(6)} UNI + ${totalTon.toFixed(6)} TON`);
      } else {
        console.log('\n💰 ДОХОДЫ: Нет данных о доходах');
      }
      
      if (statsData.referral_counts && Object.keys(statsData.referral_counts).length > 0) {
        console.log('\n👥 ПАРТНЕРЫ ПО УРОВНЯМ:');
        for (let level = 1; level <= 9; level++) {
          const count = statsData.referral_counts[level] || 0;
          if (count > 0) {
            console.log(`   Уровень ${level}: ${count} партнеров`);
          }
        }
      }
      
      console.log('\n🎯 ГОТОВНОСТЬ ДЛЯ FRONTEND:');
      console.log(`   ✅ Структура данных корректна: ${!!statsData.referral_counts}`);
      console.log(`   ✅ Доходы по уровням: ${!!statsData.level_income}`);
      console.log(`   ✅ Общий count партнеров: ${!!statsData.total_referrals}`);
      console.log(`   ✅ Список партнеров: ${Array.isArray(statsData.referrals)}`);
      
    } else {
      console.log('❌ Неожиданная структура ответа');
    }
    
  } catch (error) {
    console.log('❌ Ошибка запроса:', error.message);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🔍 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
}

testRealReferralAPI().catch(console.error);