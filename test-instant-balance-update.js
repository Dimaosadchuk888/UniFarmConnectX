/**
 * Тест мгновенного обновления TON баланса после покупки Boost-пакета
 * Проверяет работу нового механизма балансовых обновлений
 */

const API_BASE_URL = 'http://localhost:3000';

// JWT токен пользователя 48
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6NDgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE1Njc2OTQsImV4cCI6MTc1MjE3MjQ5NH0.bPym5CivrrxUYvwghEkKvFcNmwqQ3qUWXQ85S-7A-wc';

async function testInstantBalanceUpdate() {
  try {
    console.log('=== ТЕСТ МГНОВЕННОГО ОБНОВЛЕНИЯ TON БАЛАНСА ===');
    console.log('');
    
    // 1. Получаем баланс ДО покупки
    console.log('1. Получаем баланс ДО покупки...');
    const initialBalanceResponse = await fetch(`${API_BASE_URL}/api/v2/wallet/balance?user_id=48`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const initialBalanceText = await initialBalanceResponse.text();
    console.log('   Ответ сервера (raw):', initialBalanceText);
    
    let initialBalance;
    try {
      initialBalance = JSON.parse(initialBalanceText);
    } catch (parseError) {
      console.log('   ❌ Ошибка парсинга JSON, статус ответа:', initialBalanceResponse.status);
      return;
    }
    console.log('   Начальный баланс:', {
      uni: initialBalance.data?.uniBalance || initialBalance.data?.uni_balance || 0,
      ton: initialBalance.data?.tonBalance || initialBalance.data?.ton_balance || 0
    });
    console.log('');
    
    // 2. Получаем список доступных TON Boost пакетов
    console.log('2. Загружаем доступные TON Boost пакеты...');
    const packagesResponse = await fetch(`${API_BASE_URL}/api/v2/boost/packages`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const packagesData = await packagesResponse.json();
    if (!packagesData.success || !packagesData.data?.packages?.length) {
      throw new Error('Не удалось загрузить TON Boost пакеты');
    }
    
    const firstPackage = packagesData.data.packages[0];
    console.log('   Выбран пакет для покупки:', {
      id: firstPackage.id,
      name: firstPackage.name,
      cost: firstPackage.min_amount + ' TON',
      bonus: firstPackage.uni_bonus + ' UNI'
    });
    console.log('');
    
    // 3. Покупаем TON Boost пакет через внутренний баланс
    console.log('3. Покупка TON Boost пакета...');
    console.log('   Отправляем запрос на покупку...');
    
    const purchaseResponse = await fetch(`${API_BASE_URL}/api/v2/boost/purchase`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: '48',
        boost_id: firstPackage.id.toString(),
        payment_method: 'wallet'
      })
    });
    
    const purchaseData = await purchaseResponse.json();
    console.log('   Статус покупки:', purchaseResponse.status);
    console.log('   Ответ сервера:', purchaseData);
    
    if (purchaseData.success) {
      console.log('   ✅ Покупка успешна!');
      
      // 4. Проверяем наличие balanceUpdate в ответе
      if (purchaseData.balanceUpdate) {
        console.log('   ✅ Получена информация об обновлении баланса:');
        console.log('      Предыдущий TON баланс:', purchaseData.balanceUpdate.previousTonBalance);
        console.log('      Новый TON баланс:', purchaseData.balanceUpdate.tonBalance);
        console.log('      Списано TON:', purchaseData.balanceUpdate.deductedAmount);
        console.log('      Новый UNI баланс:', purchaseData.balanceUpdate.uniBalance);
      } else {
        console.log('   ❌ Информация об обновлении баланса отсутствует');
      }
      
      console.log('');
      
      // 5. Проверяем баланс ПОСЛЕ покупки
      console.log('4. Проверяем баланс ПОСЛЕ покупки...');
      const finalBalanceResponse = await fetch(`${API_BASE_URL}/api/v2/wallet/balance?user_id=48`, {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      const finalBalance = await finalBalanceResponse.json();
      console.log('   Финальный баланс:', {
        uni: finalBalance.data?.uniBalance || finalBalance.data?.uni_balance || 0,
        ton: finalBalance.data?.tonBalance || finalBalance.data?.ton_balance || 0
      });
      
      // 6. Анализ изменений
      console.log('');
      console.log('5. АНАЛИЗ ИЗМЕНЕНИЙ:');
      const tonDifference = (finalBalance.data?.tonBalance || finalBalance.data?.ton_balance || 0) - (initialBalance.data?.tonBalance || initialBalance.data?.ton_balance || 0);
      const uniDifference = (finalBalance.data?.uniBalance || finalBalance.data?.uni_balance || 0) - (initialBalance.data?.uniBalance || initialBalance.data?.uni_balance || 0);
      
      console.log('   TON изменение:', tonDifference.toFixed(3), 'TON');
      console.log('   UNI изменение:', uniDifference.toFixed(3), 'UNI');
      
      if (Math.abs(tonDifference + firstPackage.min_amount) < 0.001) {
        console.log('   ✅ TON списание корректное');
      } else {
        console.log('   ❌ TON списание некорректное');
      }
      
      if (Math.abs(uniDifference - firstPackage.uni_bonus) < 0.001) {
        console.log('   ✅ UNI бонус начислен корректно');
      } else {
        console.log('   ❌ UNI бонус начислен некорректно');
      }
      
    } else {
      console.log('   ❌ Ошибка покупки:', purchaseData.message);
    }
    
  } catch (error) {
    console.error('❌ Ошибка выполнения теста:', error.message);
  }
}

// Запускаем тест
testInstantBalanceUpdate();