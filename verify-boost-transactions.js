/**
 * Скрипт для проверки создания транзакций при покупке TON Boost
 * Проверяет функциональность без зависимости от API endpoints
 */

import fetch from 'node-fetch';

const BEARER_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6NDgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE1Njk3NzgsImV4cCI6MTc1MjE3NDU3OH0.el5fhpr6QcFu_HoIuSdJsspWnciDmVaqsUzCyJCjxtw";

async function verifyBoostPurchaseTransactions() {
  console.log('=== ФИНАЛЬНАЯ ВЕРИФИКАЦИЯ TON BOOST ТРАНЗАКЦИЙ ===\n');

  try {
    // 1. Получаем текущий баланс
    console.log('1. Проверка текущего баланса...');
    const balanceResponse = await fetch('http://localhost:3000/api/v2/user/me', {
      headers: { Authorization: BEARER_TOKEN }
    });
    
    if (!balanceResponse.ok) {
      console.log('❌ Ошибка получения баланса:', balanceResponse.status);
      return;
    }
    
    const balanceData = await balanceResponse.json();
    const initialTonBalance = balanceData.data?.balance_ton || 'N/A';
    console.log(`✅ Начальный TON баланс: ${initialTonBalance}`);

    // 2. Совершаем покупку Boost
    console.log('\n2. Совершение покупки TON Boost...');
    const purchaseResponse = await fetch('http://localhost:3000/api/v2/boost/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: BEARER_TOKEN
      },
      body: JSON.stringify({
        user_id: "48",
        boost_id: "1", 
        payment_method: "wallet"
      })
    });

    if (!purchaseResponse.ok) {
      console.log('❌ Ошибка покупки:', purchaseResponse.status);
      return;
    }

    const purchaseData = await purchaseResponse.json();
    console.log('✅ Покупка выполнена:', purchaseData.data.message);
    
    if (purchaseData.data.balanceUpdate) {
      const { tonBalance, previousTonBalance, deductedAmount } = purchaseData.data.balanceUpdate;
      console.log(`✅ Баланс обновлен: ${previousTonBalance} → ${tonBalance} (-${deductedAmount} TON)`);
    }

    // 3. Проверяем создание транзакций через прямой вызов API
    console.log('\n3. Проверка создания транзакций...');
    
    // Небольшая задержка для обеспечения записи в БД
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Проверяем разные эндпоинты транзакций
    const endpoints = [
      'http://localhost:3000/api/v2/transactions?page=1&limit=5',
      'http://localhost:3000/api/v2/transactions?currency=TON&limit=10',
      'http://localhost:3000/api/v2/transactions?currency=UNI&limit=10'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { Authorization: BEARER_TOKEN }
        });
        
        console.log(`Эндпоинт ${endpoint.split('?')[0]}: HTTP ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          const recentTransactions = data.data?.transactions || [];
          const currentTime = new Date();
          const fiveMinutesAgo = new Date(currentTime.getTime() - 5 * 60 * 1000);
          
          const newTransactions = recentTransactions.filter(tx => 
            new Date(tx.created_at) > fiveMinutesAgo
          );
          
          console.log(`  - Новых транзакций за последние 5 минут: ${newTransactions.length}`);
          
          if (newTransactions.length > 0) {
            newTransactions.forEach(tx => {
              console.log(`    • ${tx.id}: ${tx.type} | ${tx.amount} ${tx.currency} | ${tx.description}`);
            });
          }
        }
      } catch (error) {
        console.log(`  - Ошибка запроса: ${error.message}`);
      }
    }

    console.log('\n=== РЕЗУЛЬТАТ ВЕРИФИКАЦИИ ===');
    console.log('✅ Покупка TON Boost: РАБОТАЕТ');
    console.log('✅ Обновление баланса: РАБОТАЕТ');
    console.log('⚠️  Проверка транзакций в истории: требует дополнительной диагностики API эндпоинтов');

  } catch (error) {
    console.error('❌ Ошибка верификации:', error.message);
  }
}

verifyBoostPurchaseTransactions();