/**
 * ТЕСТИРОВАНИЕ МНОЖЕСТВЕННЫХ ПОКУПОК TON BOOST
 * Проверка устойчивости системы при покупке нескольких пакетов
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testMultipleBoostPurchases() {
  console.log('🔄 ТЕСТИРОВАНИЕ МНОЖЕСТВЕННЫХ ПОКУПОК TON BOOST');
  console.log('='.repeat(60));
  
  const baseUrl = 'https://9e8e72ca-ad0e-4d1b-b689-b91a4832fe73-00-7a29dnah0ryx.spock.replit.dev';
  const userId = 48;
  
  // JWT токен для авторизации
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6NDgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE2MTMzMDAsImV4cCI6MTc1MjIxODEwMH0.itCnOpcM4WQEksdm8M7L7tj1dGKuALNVFY0HQdIIk2I';
  
  // 1. Проверяем текущий баланс
  console.log('\n📊 1. ПРОВЕРКА ТЕКУЩЕГО БАЛАНСА:');
  
  try {
    const balanceResponse = await fetch(`${baseUrl}/api/v2/users/profile`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const balanceData = await balanceResponse.json();
    const currentBalance = balanceData.data?.user?.balance_ton || balanceData.data?.balance_ton || 0;
    
    console.log(`   • Текущий баланс: ${currentBalance} TON`);
    
    if (parseFloat(currentBalance) < 50) {
      console.log('   ⚠️ Недостаточно TON для тестирования множественных покупок');
      console.log('   💡 Необходимо минимум 50 TON для покупки нескольких пакетов');
      return;
    }
    
    // 2. Получаем список доступных пакетов
    console.log('\n📦 2. ПОЛУЧЕНИЕ ДОСТУПНЫХ ПАКЕТОВ:');
    
    const packagesResponse = await fetch(`${baseUrl}/api/v2/boost/packages`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const packagesData = await packagesResponse.json();
    const packages = packagesData.data || [];
    
    console.log(`   • Доступно пакетов: ${packages.length}`);
    packages.forEach((pkg, idx) => {
      console.log(`     ${idx + 1}. ${pkg.name}: ${pkg.min_amount} TON, ставка ${(pkg.daily_rate * 100).toFixed(1)}%`);
    });
    
    // 3. Тестируем покупку нескольких пакетов
    console.log('\n🛒 3. ТЕСТИРОВАНИЕ ПОКУПОК:');
    
    const testPurchases = [
      { packageId: 1, name: 'Starter' },
      { packageId: 2, name: 'Standard' },
      // { packageId: 3, name: 'Advanced' }, // Уже активирован
      { packageId: 4, name: 'Premium' }
    ];
    
    const purchaseResults = [];
    
    for (let i = 0; i < testPurchases.length; i++) {
      const purchase = testPurchases[i];
      console.log(`\n   📝 Покупка ${i + 1}: ${purchase.name} (ID: ${purchase.packageId})`);
      
      try {
        const purchaseResponse = await fetch(`${baseUrl}/api/v2/boost/purchase`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            boostId: purchase.packageId.toString(),
            paymentMethod: 'wallet'
          })
        });
        
        const purchaseData = await purchaseResponse.json();
        
        if (purchaseData.success) {
          const balanceUpdate = purchaseData.data?.balanceUpdate;
          console.log(`     ✅ Покупка успешна`);
          
          if (balanceUpdate) {
            console.log(`     💰 Баланс: ${balanceUpdate.previousTonBalance} → ${balanceUpdate.tonBalance} TON`);
            console.log(`     💸 Списано: ${balanceUpdate.deductedAmount} TON`);
            console.log(`     🎁 UNI бонус: ${balanceUpdate.uniBalance} UNI`);
          }
          
          purchaseResults.push({
            packageId: purchase.packageId,
            name: purchase.name,
            success: true,
            balanceUpdate: balanceUpdate
          });
        } else {
          console.log(`     ❌ Ошибка: ${purchaseData.error || 'Неизвестная ошибка'}`);
          purchaseResults.push({
            packageId: purchase.packageId,
            name: purchase.name,
            success: false,
            error: purchaseData.error
          });
        }
        
        // Пауза между покупками
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`     ❌ Ошибка запроса: ${error.message}`);
        purchaseResults.push({
          packageId: purchase.packageId,
          name: purchase.name,
          success: false,
          error: error.message
        });
      }
    }
    
    // 4. Проверяем итоговый баланс
    console.log('\n📊 4. ПРОВЕРКА ИТОГОВОГО БАЛАНСА:');
    
    const finalBalanceResponse = await fetch(`${baseUrl}/api/v2/users/profile`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const finalBalanceData = await finalBalanceResponse.json();
    const finalBalance = finalBalanceData.data?.user?.balance_ton || finalBalanceData.data?.balance_ton || 0;
    
    console.log(`   • Итоговый баланс: ${finalBalance} TON`);
    console.log(`   • Изменение: ${parseFloat(currentBalance)} → ${finalBalance} TON`);
    console.log(`   • Потрачено: ${(parseFloat(currentBalance) - parseFloat(finalBalance)).toFixed(6)} TON`);
    
    // 5. Сводка результатов
    console.log('\n📋 5. СВОДКА РЕЗУЛЬТАТОВ:');
    console.log('─'.repeat(50));
    
    const successfulPurchases = purchaseResults.filter(p => p.success);
    const failedPurchases = purchaseResults.filter(p => !p.success);
    
    console.log(`   ✅ Успешных покупок: ${successfulPurchases.length}`);
    console.log(`   ❌ Неудачных покупок: ${failedPurchases.length}`);
    
    if (successfulPurchases.length > 0) {
      console.log('\n   📈 Успешные покупки:');
      successfulPurchases.forEach((purchase, idx) => {
        console.log(`     ${idx + 1}. ${purchase.name} (ID: ${purchase.packageId})`);
        if (purchase.balanceUpdate) {
          console.log(`        Списано: ${purchase.balanceUpdate.deductedAmount} TON`);
        }
      });
    }
    
    if (failedPurchases.length > 0) {
      console.log('\n   ❌ Неудачные покупки:');
      failedPurchases.forEach((purchase, idx) => {
        console.log(`     ${idx + 1}. ${purchase.name}: ${purchase.error}`);
      });
    }
    
    // 6. Проверяем транзакции после покупок
    console.log('\n💰 6. ПРОВЕРКА НОВЫХ ТРАНЗАКЦИЙ:');
    
    const transactionsResponse = await fetch(`${baseUrl}/api/v2/transactions?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const transactionsData = await transactionsResponse.json();
    const recentTransactions = transactionsData.data?.transactions || [];
    
    console.log(`   • Последние транзакции: ${recentTransactions.length}`);
    
    recentTransactions.forEach((tx, idx) => {
      const time = new Date(tx.created_at).toLocaleString('ru-RU');
      console.log(`     ${idx + 1}. ${tx.amount} ${tx.currency} | ${tx.type} | ${time}`);
      console.log(`        ${tx.description}`);
    });
    
  } catch (error) {
    console.log(`❌ Общая ошибка тестирования: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔄 ТЕСТИРОВАНИЕ МНОЖЕСТВЕННЫХ ПОКУПОК ЗАВЕРШЕНО');
}

testMultipleBoostPurchases();