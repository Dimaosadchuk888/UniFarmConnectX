/**
 * Тест API endpoint баланса для user_id=1
 */

import fetch from 'node-fetch';

async function testBalanceAPI() {
  const baseURL = 'http://localhost:3000';
  const userId = 1;
  
  console.log('🔍 ТЕСТ API ENDPOINT БАЛАНСА\n');
  console.log(`Тестируем: ${baseURL}/api/v2/wallet/balance?user_id=${userId}\n`);
  
  try {
    const response = await fetch(`${baseURL}/api/v2/wallet/balance?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Guest-ID': 'test_guest_id'
      }
    });
    
    console.log('📊 ОТВЕТ СЕРВЕРА:');
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('Data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      console.log('\n✅ УСПЕШНЫЙ ОТВЕТ:');
      console.log(`• UNI Balance: ${data.data.uniBalance || data.data.balance_uni || 'не найден'}`);
      console.log(`• TON Balance: ${data.data.tonBalance || data.data.balance_ton || 'не найден'}`);
      console.log(`• UNI Farming Active: ${data.data.uniFarmingActive || data.data.uni_farming_active || 'не найден'}`);
    } else {
      console.log('\n❌ ОШИБКА В ОТВЕТЕ:', data.error || 'неизвестная ошибка');
    }
    
  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
  }
}

testBalanceAPI();