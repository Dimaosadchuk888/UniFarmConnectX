import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/v2';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUwLCJ0ZWxlZ3JhbV9pZCI6NDMsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MTQzMjExODAxM194MDZ0c3oiLCJpYXQiOjE3NTE0MzQzNjksImV4cCI6MTc1MjAzOTE2OX0.Q-wk2OM7BI8_E0xAVC9vI10I4cJECoIpdgLb4t6_AzU';

async function testTonBoostPurchase() {
  try {
    console.log('=== Тест покупки TON Boost для пользователя 50 ===\n');

    // 1. Проверяем баланс перед покупкой
    console.log('1. Проверяем баланс пользователя 50...');
    const balanceRes = await fetch(`${API_URL}/wallet/balance`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    const balanceData = await balanceRes.json();
    console.log('Баланс до покупки:', balanceData);

    // 2. Получаем список доступных TON Boost пакетов
    console.log('\n2. Получаем список TON Boost пакетов...');
    const packagesRes = await fetch(`${API_URL}/boost/packages`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    const packagesData = await packagesRes.json();
    console.log('Доступные пакеты:', JSON.stringify(packagesData, null, 2));

    // 3. Выбираем самый дешевый пакет (Starter)
    const starterPackage = packagesData.data?.packages?.find(p => p.name === 'Starter');
    if (!starterPackage) {
      console.error('Не найден Starter пакет!');
      return;
    }
    console.log('\n3. Выбран пакет:', starterPackage.name, 'Цена:', starterPackage.min_amount, 'TON');

    // 4. Покупаем TON Boost через внутренний баланс
    console.log('\n4. Покупаем TON Boost через внутренний баланс...');
    const purchaseRes = await fetch(`${API_URL}/boost/purchase`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: '50',
        boost_id: starterPackage.id.toString(),
        payment_method: 'wallet'
      })
    });
    const purchaseData = await purchaseRes.json();
    console.log('Результат покупки:', purchaseData);

    // 5. Проверяем баланс после покупки
    console.log('\n5. Проверяем баланс после покупки...');
    const balanceAfterRes = await fetch(`${API_URL}/wallet/balance`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    const balanceAfterData = await balanceAfterRes.json();
    console.log('Баланс после покупки:', balanceAfterData);

    // 6. Сравниваем балансы
    console.log('\n6. Сравнение балансов:');
    if (balanceData.data && balanceAfterData.data) {
      const tonBefore = balanceData.data.balance_ton || 0;
      const tonAfter = balanceAfterData.data.balance_ton || 0;
      const tonSpent = tonBefore - tonAfter;
      console.log(`TON до: ${tonBefore}, TON после: ${tonAfter}, Потрачено: ${tonSpent}`);
      
      if (tonSpent === 0) {
        console.error('❌ ОШИБКА: TON баланс не изменился!');
      } else {
        console.log('✅ TON баланс успешно списан!');
      }
    }

    // 7. Проверяем последние транзакции
    console.log('\n7. Проверяем последние транзакции...');
    const transRes = await fetch(`${API_URL}/transactions?limit=5`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    const transData = await transRes.json();
    console.log('Последние транзакции:', JSON.stringify(transData, null, 2));

  } catch (error) {
    console.error('Ошибка тестирования:', error);
  }
}

testTonBoostPurchase();