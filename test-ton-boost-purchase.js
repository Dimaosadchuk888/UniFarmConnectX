/**
 * Тестовый скрипт для проверки покупки TON Boost
 * от имени пользователя 50
 */
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = 'http://localhost:3000';

// JWT токен для пользователя 50
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUwLCJ0ZWxlZ3JhbV9pZCI6NDMsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MTQzMjExODAxM194MDZ0c3oiLCJpYXQiOjE3NTE0Mzc0NTEsImV4cCI6MTc1MjA0MjI1MX0.yAGFPB-TdNzSYDY2ec0pCwokDcOiEv4clSw1u9Hz3a0';

async function testTonBoostPurchase() {
  console.log('🔍 Тестируем покупку TON Boost для пользователя 50...\n');
  
  try {
    // 1. Проверяем баланс перед покупкой
    console.log('1. Проверяем баланс пользователя 50...');
    const balanceResponse = await fetch(`${API_BASE_URL}/api/v2/wallet/balance?user_id=50`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Dev-Mode': 'true'
      }
    });
    
    const balanceData = await balanceResponse.json();
    console.log('   Баланс:', balanceData);
    console.log('   UNI:', balanceData.data?.uni || 0);
    console.log('   TON:', balanceData.data?.ton || 0);
    console.log('');
    
    // 2. Получаем доступные пакеты
    console.log('2. Получаем доступные TON Boost пакеты...');
    const packagesResponse = await fetch(`${API_BASE_URL}/api/v2/boost/packages`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Dev-Mode': 'true'
      }
    });
    
    const packagesData = await packagesResponse.json();
    console.log('   Найдено пакетов:', packagesData.data?.packages?.length || 0);
    
    if (packagesData.data?.packages?.length > 0) {
      const firstPackage = packagesData.data.packages[0];
      console.log('   Первый пакет:', {
        id: firstPackage.id,
        name: firstPackage.name,
        minAmount: firstPackage.min_amount || firstPackage.priceTon,
        bonusUni: firstPackage.uni_bonus || firstPackage.bonusUni
      });
      console.log('');
      
      // 3. Пытаемся купить пакет
      console.log('3. Отправляем запрос на покупку TON Boost...');
      console.log('   Данные запроса:', {
        user_id: '50',
        boost_id: firstPackage.id.toString(),
        payment_method: 'wallet'
      });
      
      const purchaseResponse = await fetch(`${API_BASE_URL}/api/v2/boost/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true'
        },
        body: JSON.stringify({
          user_id: '50',
          boost_id: firstPackage.id.toString(),
          payment_method: 'wallet'
        })
      });
      
      const purchaseData = await purchaseResponse.json();
      console.log('   Статус ответа:', purchaseResponse.status);
      console.log('   Ответ сервера:', purchaseData);
      console.log('');
      
      // 4. Проверяем баланс после покупки
      console.log('4. Проверяем баланс после покупки...');
      const newBalanceResponse = await fetch(`${API_BASE_URL}/api/v2/wallet/balance?user_id=50`, {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true'
        }
      });
      
      const newBalanceData = await newBalanceResponse.json();
      console.log('   Новый баланс:', newBalanceData);
      console.log('   UNI:', newBalanceData.data?.uni || 0);
      console.log('   TON:', newBalanceData.data?.ton || 0);
      console.log('');
      
      // 5. Проверяем транзакции
      console.log('5. Проверяем последние транзакции...');
      const transactionsResponse = await fetch(`${API_BASE_URL}/api/v2/transactions?user_id=50&limit=5`, {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true'
        }
      });
      
      const transactionsData = await transactionsResponse.json();
      if (transactionsData.data?.transactions?.length > 0) {
        console.log('   Последние транзакции:');
        transactionsData.data.transactions.forEach((tx, index) => {
          console.log(`   ${index + 1}. Тип: ${tx.type}, Сумма: ${tx.amount} ${tx.currency}, Статус: ${tx.status}`);
          console.log(`      Описание: ${tx.description || 'Нет описания'}`);
        });
      }
      
    } else {
      console.log('❌ Пакеты не найдены');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

// Запускаем тест
testTonBoostPurchase();