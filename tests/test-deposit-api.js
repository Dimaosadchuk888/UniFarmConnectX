/**
 * Тест API депозитов и проверка баланса
 */

const API_BASE = 'https://uni-farm-connect-unifarm01010101.replit.app';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld190ZXN0IiwiZmlyc3RfbmFtZSI6IlByZXZpZXciLCJyZWZfY29kZSI6IlJFRl8xNzUxNzgwNTIxOTE4X2UxdjYyZCIsImlhdCI6MTc1MTg3MTA2MywiZXhwIjoxNzUyNDc1ODYzfQ.NKbyJiXtLnGzyr0w-C1oR658X5TzDO6EkKU8Ie5zgE0';

async function testDepositAPI() {
  console.log('=== ТЕСТ API ДЕПОЗИТОВ ===');
  
  // 1. Проверим состояние фарминга
  console.log('\n1. Проверка статуса фарминга...');
  
  try {
    const farmingResponse = await fetch(`${API_BASE}/api/v2/uni-farming/status?user_id=62`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!farmingResponse.ok) {
      console.error('Ошибка запроса фарминга:', farmingResponse.status, farmingResponse.statusText);
      return;
    }
    
    const farmingData = await farmingResponse.json();
    console.log('Статус фарминга:', JSON.stringify(farmingData, null, 2));
    
    if (farmingData.success) {
      console.log(`✅ Баланс UNI: ${farmingData.data.balance_uni}`);
      console.log(`✅ Депозит в фарминге: ${farmingData.data.uni_deposit_amount}`);
      console.log(`✅ Ставка фарминга: ${farmingData.data.uni_farming_rate}`);
    }
  } catch (error) {
    console.error('Ошибка при проверке фарминга:', error);
  }
  
  // 2. Проверим баланс через wallet API
  console.log('\n2. Проверка баланса через wallet API...');
  
  try {
    const balanceResponse = await fetch(`${API_BASE}/api/v2/wallet/balance?user_id=62`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Статус ответа wallet:', balanceResponse.status);
    
    if (!balanceResponse.ok) {
      const errorText = await balanceResponse.text();
      console.error('❌ Ошибка wallet API:', balanceResponse.status, errorText);
    } else {
      const balanceData = await balanceResponse.json();
      console.log('✅ Баланс через wallet API:', JSON.stringify(balanceData, null, 2));
    }
  } catch (error) {
    console.error('Ошибка при проверке баланса:', error);
  }
  
  // 3. Проверим последние транзакции
  console.log('\n3. Проверка последних транзакций...');
  
  try {
    const transactionsResponse = await fetch(`${API_BASE}/api/v2/transactions/history?user_id=62&limit=10`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!transactionsResponse.ok) {
      console.error('Ошибка запроса транзакций:', transactionsResponse.status);
    } else {
      const transactionsData = await transactionsResponse.json();
      console.log('Последние транзакции:', JSON.stringify(transactionsData, null, 2));
      
      if (transactionsData.success && transactionsData.data.transactions) {
        console.log('\n📋 ПОСЛЕДНИЕ ТРАНЗАКЦИИ:');
        transactionsData.data.transactions.forEach((tx, i) => {
          console.log(`  ${i + 1}. ${tx.type} - ${tx.amount} ${tx.currency} (${tx.created_at})`);
        });
        
        // Найдем депозиты
        const deposits = transactionsData.data.transactions.filter(tx => 
          tx.type === 'FARMING_REWARD' && parseFloat(tx.amount) < 0
        );
        
        console.log('\n📥 ДЕПОЗИТЫ:');
        deposits.forEach((deposit, i) => {
          console.log(`  ${i + 1}. ${Math.abs(deposit.amount)} UNI депозит (${deposit.created_at})`);
        });
      }
    }
  } catch (error) {
    console.error('Ошибка при проверке транзакций:', error);
  }
  
  // 4. Тест нового депозита
  console.log('\n4. Тест нового депозита 3 UNI...');
  
  try {
    const depositResponse = await fetch(`${API_BASE}/api/v2/uni-farming/deposit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: '3',
        user_id: 62
      })
    });
    
    if (!depositResponse.ok) {
      const errorText = await depositResponse.text();
      console.error('❌ Ошибка депозита:', depositResponse.status, errorText);
    } else {
      const depositData = await depositResponse.json();
      console.log('✅ Результат депозита:', JSON.stringify(depositData, null, 2));
      
      // Проверим баланс после депозита
      console.log('\n5. Проверка баланса после депозита...');
      
      const newFarmingResponse = await fetch(`${API_BASE}/api/v2/uni-farming/status?user_id=62`, {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (newFarmingResponse.ok) {
        const newFarmingData = await newFarmingResponse.json();
        console.log(`✅ Новый баланс UNI: ${newFarmingData.data.balance_uni}`);
        console.log(`✅ Новый депозит в фарминге: ${newFarmingData.data.uni_deposit_amount}`);
      }
    }
  } catch (error) {
    console.error('Ошибка при тестовом депозите:', error);
  }
  
  console.log('\n=== ТЕСТ ЗАВЕРШЕН ===');
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testDepositAPI };
}

// Запуск в браузере
if (typeof window !== 'undefined') {
  window.testDepositAPI = testDepositAPI;
}

// Запуск в Node.js
if (typeof process !== 'undefined' && process.argv[1] === __filename) {
  testDepositAPI().catch(console.error);
}