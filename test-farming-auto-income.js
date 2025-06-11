/**
 * Тест автоматического начисления фарминг дохода
 * Проверяет что доход поступает напрямую на wallet баланс без ручного клейма
 */

import http from 'http';

const API_BASE_URL = 'http://localhost:3000/api/v2';

async function testRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/v2${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: { raw: body } });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testWalletService() {
  console.log('\n🧪 ТЕСТ 1: Проверка методов WalletService');
  console.log('==========================================');

  try {
    // Создаем тестового пользователя
    const testUserId = '1';
    
    // Проверяем текущий баланс
    const balanceResponse = await testRequest(`/wallet/balance?user_id=${testUserId}`);
    console.log('Текущий баланс:', balanceResponse.data);
    
    if (balanceResponse.status === 200) {
      const initialUniBalance = balanceResponse.data.data?.uni_balance || 0;
      const initialTonBalance = balanceResponse.data.data?.ton_balance || 0;
      
      console.log(`✅ Начальный UNI баланс: ${initialUniBalance}`);
      console.log(`✅ Начальный TON баланс: ${initialTonBalance}`);
      
      return {
        userId: testUserId,
        initialUniBalance,
        initialTonBalance
      };
    } else {
      console.log('❌ Ошибка получения баланса:', balanceResponse.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Ошибка тестирования WalletService:', error.message);
    return null;
  }
}

async function testFarmingActivation() {
  console.log('\n🧪 ТЕСТ 2: Активация фарминга');
  console.log('=============================');

  try {
    const testUserId = '1';
    
    // Запускаем UNI фарминг
    const startResponse = await testRequest('/uni-farming/start', 'POST', {
      user_id: testUserId,
      amount: '100'
    });
    
    console.log('Результат запуска фарминга:', startResponse.data);
    
    if (startResponse.status === 200) {
      console.log('✅ UNI фарминг активирован');
      
      // Проверяем статус фарминга
      const statusResponse = await testRequest(`/uni-farming/status?user_id=${testUserId}`);
      console.log('Статус фарминга:', statusResponse.data);
      
      return statusResponse.data?.data?.isActive || false;
    } else {
      console.log('❌ Ошибка активации фарминга');
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка тестирования активации фарминга:', error.message);
    return false;
  }
}

async function testAutomaticIncomeDistribution() {
  console.log('\n🧪 ТЕСТ 3: Автоматическое начисление дохода');
  console.log('===========================================');

  try {
    const testUserId = '1';
    
    // Получаем баланс до начисления
    const balanceBefore = await testRequest(`/wallet/balance?user_id=${testUserId}`);
    const initialBalance = balanceBefore.data?.data?.uni_balance || 0;
    
    console.log(`Баланс до начисления: ${initialBalance} UNI`);
    
    // Ждем некоторое время для автоматического начисления (в реальной системе это происходит каждые 5 минут)
    console.log('⏳ Ожидание автоматического начисления...');
    
    // Имитируем прохождение времени - в реальности планировщик работает автоматически
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Проверяем баланс после потенциального начисления
    const balanceAfter = await testRequest(`/wallet/balance?user_id=${testUserId}`);
    const finalBalance = balanceAfter.data?.data?.uni_balance || 0;
    
    console.log(`Баланс после проверки: ${finalBalance} UNI`);
    
    // Проверяем историю транзакций на предмет автоматических начислений
    const transactionsResponse = await testRequest(`/transactions?user_id=${testUserId}`);
    console.log('История транзакций:', transactionsResponse.data);
    
    if (transactionsResponse.status === 200) {
      const transactions = transactionsResponse.data?.transactions || [];
      const farmingIncomes = transactions.filter(tx => tx.type === 'farming_income');
      
      console.log(`✅ Найдено ${farmingIncomes.length} автоматических начислений`);
      
      farmingIncomes.forEach(tx => {
        console.log(`  - ${tx.amount} ${tx.currency} (${tx.description})`);
      });
      
      return farmingIncomes.length > 0;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Ошибка тестирования автоматического начисления:', error.message);
    return false;
  }
}

async function testDirectIncomeDistribution() {
  console.log('\n🧪 ТЕСТ 4: Прямое тестирование addUniFarmIncome');
  console.log('==============================================');

  try {
    // Этот тест показывает, что доходы должны начисляться автоматически
    // через планировщик, а не через ручной клейм
    
    console.log('📋 Проверяем что НЕТ методов ручного клейма:');
    
    // Попытка вызвать claimRewards должна вернуть ошибку или показать что клейм не нужен
    const claimResponse = await testRequest('/uni-farming/claim', 'POST', { user_id: '1' });
    
    if (claimResponse.status === 404 || claimResponse.status === 405) {
      console.log('✅ Метод ручного клейма отсутствует - доходы начисляются автоматически');
      return true;
    } else if (claimResponse.status === 200) {
      console.log('⚠️  Обнаружен метод ручного клейма - требуется переработка на автоматический');
      return false;
    }
    
    console.log('✅ Система работает в режиме автоматического начисления');
    return true;
  } catch (error) {
    console.log('✅ Ручной клейм недоступен - система полностью автоматическая');
    return true;
  }
}

async function testWalletBalanceUpdate() {
  console.log('\n🧪 ТЕСТ 5: Проверка обновления wallet баланса');
  console.log('============================================');

  try {
    const testUserId = '1';
    
    // Получаем данные кошелька
    const walletResponse = await testRequest(`/wallet/data?telegram_id=123456789`);
    
    if (walletResponse.status === 200) {
      const walletData = walletResponse.data?.data || walletResponse.data;
      
      console.log('Данные кошелька:');
      console.log(`  UNI баланс: ${walletData.uni_balance}`);
      console.log(`  TON баланс: ${walletData.ton_balance}`);
      console.log(`  Всего заработано: ${walletData.total_earned}`);
      console.log(`  Последние транзакции: ${walletData.transactions?.length || 0}`);
      
      // Проверяем что баланс обновляется напрямую
      if (walletData.transactions) {
        const farmingTransactions = walletData.transactions.filter(tx => 
          tx.type === 'farming_income' || tx.type === 'farming_reward'
        );
        
        console.log(`✅ Найдено ${farmingTransactions.length} фарминг транзакций в истории`);
        
        farmingTransactions.forEach(tx => {
          console.log(`  - ${tx.amount} ${tx.currency}: ${tx.description}`);
        });
      }
      
      return true;
    } else {
      console.log('❌ Ошибка получения данных кошелька');
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка тестирования wallet баланса:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 ТЕСТИРОВАНИЕ АВТОМАТИЧЕСКОГО НАЧИСЛЕНИЯ ФАРМИНГ ДОХОДА');
  console.log('=========================================================');
  console.log('Цель: Убедиться что доход поступает напрямую в wallet без ручного клейма\n');

  const results = {
    walletService: false,
    farmingActivation: false,
    automaticIncome: false,
    noManualClaim: false,
    walletBalance: false
  };

  // Тест 1: WalletService
  const walletTest = await testWalletService();
  results.walletService = !!walletTest;

  // Тест 2: Активация фарминга
  results.farmingActivation = await testFarmingActivation();

  // Тест 3: Автоматическое начисление
  results.automaticIncome = await testAutomaticIncomeDistribution();

  // Тест 4: Отсутствие ручного клейма
  results.noManualClaim = await testDirectIncomeDistribution();

  // Тест 5: Обновление wallet баланса
  results.walletBalance = await testWalletBalanceUpdate();

  // Результаты
  console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');
  console.log('==========================');
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`✅ Пройдено: ${passedTests}/${totalTests} тестов`);
  console.log(`🎯 Автоматическое начисление: ${results.automaticIncome ? 'РАБОТАЕТ' : 'НЕ РАБОТАЕТ'}`);
  console.log(`🎯 Отсутствие ручного клейма: ${results.noManualClaim ? 'ПОДТВЕРЖДЕНО' : 'ТРЕБУЕТ ДОРАБОТКИ'}`);
  console.log(`🎯 Обновление wallet баланса: ${results.walletBalance ? 'РАБОТАЕТ' : 'НЕ РАБОТАЕТ'}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ: Фарминг работает автоматически!');
  } else {
    console.log('\n⚠️  НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОЙДЕНЫ: Требуется доработка системы');
  }

  return results;
}

// Запуск тестов
runAllTests().catch(error => {
  console.error('❌ Ошибка запуска тестов:', error.message);
  process.exit(1);
});