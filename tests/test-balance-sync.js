#!/usr/bin/env node

/**
 * Тест синхронизации баланса после фарминг депозита
 * Проверяет что баланс обновляется во frontend после операции
 */

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld190ZXN0IiwiZmlyc3RfbmFtZSI6IlByZXZpZXciLCJyZWZfY29kZSI6IlJFRl8xNzUxNzgwNTIxOTE4X2UxdjYyZCIsImlhdCI6MTc1MTg3MTA2MywiZXhwIjoxNzUyNDc1ODYzfQ.NKbyJiXtLnGzyr0w-C1oR658X5TzDO6EkKU8Ie5zgE0';

async function testBalanceSync() {
  console.log('=== ТЕСТ СИНХРОНИЗАЦИИ БАЛАНСА ===\n');
  
  // Импортируем fetch для Node.js
  const { default: fetch } = await import('node-fetch');
  
  const headers = {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  try {
    // 1. Получаем текущий баланс
    console.log('1. Получаем текущий баланс...');
    const balanceResponse = await fetch('http://localhost:3000/api/v2/wallet/balance?user_id=62', {
      method: 'GET',
      headers
    });
    
    const balanceData = await balanceResponse.json();
    console.log('✅ Баланс до депозита:', balanceData.data.uniBalance);
    
    // 2. Создаем тестовый депозит
    console.log('\n2. Создаем тестовый депозит 5 UNI...');
    const depositResponse = await fetch('http://localhost:3000/api/v2/uni-farming/deposit', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: '5',
        user_id: 62
      })
    });
    
    const depositData = await depositResponse.json();
    if (depositData.success) {
      console.log('✅ Депозит создан успешно');
    } else {
      console.log('❌ Ошибка создания депозита:', depositData.error);
      return;
    }
    
    // 3. Проверяем баланс после депозита
    console.log('\n3. Проверяем баланс после депозита...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Ждем 1 секунду
    
    const newBalanceResponse = await fetch('http://localhost:3000/api/v2/wallet/balance?user_id=62', {
      method: 'GET',
      headers
    });
    
    const newBalanceData = await newBalanceResponse.json();
    console.log('✅ Баланс после депозита:', newBalanceData.data.uniBalance);
    
    // 4. Проверяем статус фарминга
    console.log('\n4. Проверяем статус фарминга...');
    const farmingResponse = await fetch('http://localhost:3000/api/v2/uni-farming/status?user_id=62', {
      method: 'GET',
      headers
    });
    
    const farmingData = await farmingResponse.json();
    console.log('✅ Фарминг статус:', {
      depositAmount: farmingData.data.uni_deposit_amount,
      farmingRate: farmingData.data.uni_farming_rate,
      balance: farmingData.data.balance_uni
    });
    
    console.log('\n=== РЕЗУЛЬТАТЫ ТЕСТА ===');
    console.log('• Баланс до депозита:', balanceData.data.uniBalance);
    console.log('• Баланс после депозита:', newBalanceData.data.uniBalance);
    console.log('• Разница:', (balanceData.data.uniBalance - newBalanceData.data.uniBalance).toFixed(6));
    console.log('• Общий депозит в фарминге:', farmingData.data.uni_deposit_amount);
    
    if (balanceData.data.uniBalance > newBalanceData.data.uniBalance) {
      console.log('✅ Тест пройден: баланс корректно списан');
    } else {
      console.log('❌ Тест провален: баланс не изменился');
    }
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
  }
}

testBalanceSync();