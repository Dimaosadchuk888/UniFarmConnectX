/**
 * Детальная диагностика проблемы с передачей balanceUpdate
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6NDgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE1Njc2OTQsImV4cCI6MTc1MjE3MjQ5NH0.bPym5CivrrxUYvwghEkKvFcNmwqQ3qUWXQ85S-7A-wc';

async function makeRequest(url, options) {
  console.log(`🔍 Отправка запроса: ${url}`);
  console.log(`📋 Данные запроса:`, JSON.stringify(options.body, null, 2));
  
  const response = await fetch(url, options);
  
  console.log(`📊 Статус ответа: ${response.status} ${response.statusText}`);
  
  const responseText = await response.text();
  console.log(`📝 Ответ сервера (raw):`, responseText);
  
  try {
    const responseJson = JSON.parse(responseText);
    console.log(`📦 Ответ сервера (parsed):`, JSON.stringify(responseJson, null, 2));
    return responseJson;
  } catch (error) {
    console.log(`❌ Ошибка парсинга JSON:`, error.message);
    return { error: 'Invalid JSON', raw: responseText };
  }
}

async function debugBalanceUpdate() {
  console.log('=== ДИАГНОСТИКА BALANCE UPDATE ===\n');

  try {
    // 1. Проверим баланс перед покупкой
    console.log('1. Получение баланса перед покупкой...');
    const balanceBefore = await makeRequest(`${BASE_URL}/api/v2/wallet/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`💰 Баланс ДО: UNI=${balanceBefore.data?.uniBalance}, TON=${balanceBefore.data?.tonBalance}\n`);

    // 2. Получим пакеты
    console.log('2. Получение доступных пакетов...');
    const packages = await makeRequest(`${BASE_URL}/api/v2/boost/packages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const firstPackage = packages.data?.[0];
    console.log(`📦 Первый пакет:`, JSON.stringify(firstPackage, null, 2));
    console.log('');

    // 3. Сделаем покупку с детальным логированием
    console.log('3. Покупка пакета с детальным анализом...');
    const purchaseData = {
      user_id: "48",
      boost_id: "1", 
      payment_method: "wallet"
    };
    
    const purchaseResult = await makeRequest(`${BASE_URL}/api/v2/boost/purchase`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(purchaseData)
    });

    // 4. Анализ результата покупки
    console.log('\n4. АНАЛИЗ РЕЗУЛЬТАТА ПОКУПКИ:');
    console.log(`✅ Успех: ${purchaseResult.success}`);
    console.log(`📝 Сообщение: ${purchaseResult.data?.message}`);
    console.log(`🔍 Есть purchase: ${!!purchaseResult.data?.purchase}`);
    console.log(`🔍 Есть balanceUpdate: ${!!purchaseResult.data?.balanceUpdate}`);
    
    if (purchaseResult.data?.balanceUpdate) {
      console.log(`💎 balanceUpdate:`, JSON.stringify(purchaseResult.data.balanceUpdate, null, 2));
    } else {
      console.log(`❌ balanceUpdate отсутствует в ответе API`);
    }

    // 5. Проверим баланс после покупки
    console.log('\n5. Получение баланса после покупки...');
    const balanceAfter = await makeRequest(`${BASE_URL}/api/v2/wallet/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`💰 Баланс ПОСЛЕ: UNI=${balanceAfter.data?.uniBalance}, TON=${balanceAfter.data?.tonBalance}`);

    // 6. Анализ изменений
    if (balanceBefore.data && balanceAfter.data) {
      const tonChange = balanceAfter.data.tonBalance - balanceBefore.data.tonBalance;
      const uniChange = balanceAfter.data.uniBalance - balanceBefore.data.uniBalance;
      
      console.log('\n6. АНАЛИЗ ИЗМЕНЕНИЙ:');
      console.log(`💎 TON изменение: ${tonChange > 0 ? '+' : ''}${tonChange}`);
      console.log(`🌾 UNI изменение: ${uniChange > 0 ? '+' : ''}${uniChange}`);
      
      if (tonChange === -1) {
        console.log(`✅ TON списание корректное`);
      } else {
        console.log(`❌ TON списание некорректное (ожидалось -1, получено ${tonChange})`);
      }
      
      if (uniChange === 10000) {
        console.log(`✅ UNI бонус корректный`);
      } else {
        console.log(`❌ UNI бонус некорректный (ожидалось +10000, получено ${uniChange})`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  }
}

debugBalanceUpdate();