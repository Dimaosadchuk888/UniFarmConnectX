/**
 * ДИАГНОСТИКА ОТОБРАЖЕНИЯ TON BOOST ПАКЕТА В UI
 * Пользователь 184: TON списан, UNI бонус получен, но не отображается информация о пакете
 */

import { supabase } from './core/supabase.js';
import { BoostService } from './modules/boost/service.js';

async function diagnoseTonBoostUIDisplay() {
  console.log('🔍 ДИАГНОСТИКА ОТОБРАЖЕНИЯ TON BOOST ПАКЕТА В UI');
  console.log('=================================================\n');
  
  const userId = '184';
  
  try {
    // 1. Проверяем состояние пользователя в базе
    console.log('1️⃣ ПРОВЕРКА СОСТОЯНИЯ ПОЛЬЗОВАТЕЛЯ В БАЗЕ:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_ton, balance_uni, ton_boost_package, ton_boost_rate, uni_farming_active')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.log(`❌ Ошибка получения пользователя: ${userError.message}`);
      return;
    }
    
    console.log('📊 Состояние пользователя в базе:');
    console.log(`   User ID: ${user.id}`);
    console.log(`   TON баланс: ${user.balance_ton} TON`);
    console.log(`   UNI баланс: ${user.balance_uni} UNI`);
    console.log(`   TON Boost пакет: ${user.ton_boost_package || 'НЕТ'}`);
    console.log(`   TON Boost ставка: ${user.ton_boost_rate || 'НЕТ'}`);
    console.log(`   UNI фарминг активен: ${user.uni_farming_active}`);
    
    // 2. Проверяем ton_farming_data
    console.log('\n2️⃣ ПРОВЕРКА TON_FARMING_DATA:');
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (farmingError) {
      console.log(`❌ Ошибка получения farming data: ${farmingError.message}`);
    } else if (farmingData && farmingData.length > 0) {
      const data = farmingData[0];
      console.log('📊 Последняя запись ton_farming_data:');
      console.log(`   User ID: ${data.user_id}`);
      console.log(`   Farming баланс: ${data.farming_balance}`);
      console.log(`   Boost активен: ${data.boost_active}`);
      console.log(`   Boost пакет ID: ${data.boost_package_id}`);
      console.log(`   Дневная ставка: ${data.daily_rate}`);
      console.log(`   Создана: ${data.created_at}`);
      console.log(`   Истекает: ${data.expires_at || 'НЕ УСТАНОВЛЕНО'}`);
    } else {
      console.log('⚠️ Записи ton_farming_data НЕ НАЙДЕНЫ');
    }
    
    // 3. Проверяем boost_purchases
    console.log('\n3️⃣ ПРОВЕРКА BOOST_PURCHASES:');
    const { data: purchases, error: purchasesError } = await supabase
      .from('boost_purchases')
      .select('*')
      .eq('user_id', parseInt(userId))
      .order('created_at', { ascending: false })
      .limit(3);
      
    if (purchasesError) {
      console.log(`❌ Ошибка получения покупок: ${purchasesError.message}`);
    } else if (purchases && purchases.length > 0) {
      console.log(`📊 Найдено покупок boost: ${purchases.length}`);
      purchases.forEach((purchase, index) => {
        console.log(`   Покупка ${index + 1}:`);
        console.log(`     ID: ${purchase.id}`);
        console.log(`     Boost пакет ID: ${purchase.boost_package_id}`);
        console.log(`     Статус: ${purchase.status}`);
        console.log(`     Метод: ${purchase.payment_method}`);
        console.log(`     Создана: ${purchase.created_at}`);
        console.log(`     Подтверждена: ${purchase.confirmed_at || 'НЕТ'}`);
      });
    } else {
      console.log('⚠️ Записи boost_purchases НЕ НАЙДЕНЫ');
    }
    
    // 4. Тестируем BoostService методы
    console.log('\n4️⃣ ТЕСТИРОВАНИЕ BOOST SERVICE МЕТОДОВ:');
    const boostService = new BoostService();
    
    // Тестируем getUserActiveBoosts
    console.log('🔧 Тестирование getUserActiveBoosts():');
    try {
      const activeBoosts = await boostService.getUserActiveBoosts(userId);
      console.log(`   Результат: найдено ${activeBoosts.length} активных буст(ов)`);
      if (activeBoosts.length > 0) {
        activeBoosts.forEach((boost, index) => {
          console.log(`   Boost ${index + 1}:`);
          console.log(`     ID: ${boost.id}`);
          console.log(`     Название: ${boost.package_name || boost.name}`);
          console.log(`     Статус: ${boost.status}`);
          console.log(`     Истекает: ${boost.expires_at || 'НЕ УСТАНОВЛЕНО'}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Ошибка getUserActiveBoosts: ${error.message}`);
    }
    
    // Тестируем getTonBoostFarmingStatus
    console.log('\n🔧 Тестирование getTonBoostFarmingStatus():');
    try {
      const farmingStatus = await boostService.getTonBoostFarmingStatus(userId);
      console.log('   Результат фарминг статуса:');
      console.log(`     TON ставка в секунду: ${farmingStatus.totalTonRatePerSecond}`);
      console.log(`     UNI ставка в секунду: ${farmingStatus.totalUniRatePerSecond}`);
      console.log(`     Дневной доход TON: ${farmingStatus.dailyIncomeTon}`);
      console.log(`     Дневной доход UNI: ${farmingStatus.dailyIncomeUni}`);
      console.log(`     Количество депозитов: ${farmingStatus.deposits.length}`);
      
      if (farmingStatus.deposits.length > 0) {
        farmingStatus.deposits.forEach((deposit, index) => {
          console.log(`     Депозит ${index + 1}:`);
          console.log(`       Сумма: ${deposit.amount}`);
          console.log(`       Пакет: ${deposit.package_name}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Ошибка getTonBoostFarmingStatus: ${error.message}`);
    }
    
    // 5. Проверяем последние UNI транзакции (должен быть бонус)
    console.log('\n5️⃣ ПРОВЕРКА ПОСЛЕДНИХ UNI ТРАНЗАКЦИЙ:');
    const { data: uniTransactions, error: uniTxError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('currency', 'UNI')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (uniTxError) {
      console.log(`❌ Ошибка получения UNI транзакций: ${uniTxError.message}`);
    } else if (uniTransactions && uniTransactions.length > 0) {
      console.log(`📊 Последние UNI транзакции (${uniTransactions.length}):`);
      uniTransactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.created_at}: ${tx.amount} UNI`);
        console.log(`      Тип: ${tx.type}, Описание: ${tx.description}`);
        console.log(`      Статус: ${tx.status}`);
      });
    } else {
      console.log('⚠️ UNI транзакции НЕ НАЙДЕНЫ');
    }
    
    // 6. ДИАГНОЗ UI ПРОБЛЕМЫ
    console.log('\n🎯 ДИАГНОЗ UI ПРОБЛЕМЫ:');
    console.log('========================');
    
    if (user.ton_boost_package && user.ton_boost_rate) {
      console.log('✅ БАЗА ДАННЫХ: ton_boost_package и ton_boost_rate установлены');
    } else {
      console.log('❌ БАЗА ДАННЫХ: ton_boost_package или ton_boost_rate НЕ установлены');
    }
    
    if (farmingData && farmingData.length > 0) {
      console.log('✅ FARMING DATA: записи существуют');
    } else {
      console.log('❌ FARMING DATA: записи отсутствуют');
    }
    
    if (purchases && purchases.length > 0) {
      console.log('✅ PURCHASES: записи покупок существуют');
    } else {
      console.log('❌ PURCHASES: записи покупок отсутствуют');
    }
    
    console.log('\n🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ UI ПРОБЛЕМЫ:');
    console.log('==================================');
    console.log('1. Frontend не получает данные от getUserActiveBoosts()');
    console.log('2. Frontend не получает данные от getTonBoostFarmingStatus()');
    console.log('3. UI компонент не обновляется после покупки');
    console.log('4. Кэширование данных в React Query');
    console.log('5. Проблема в mapping данных в UI компоненте');
    
    console.log('\n📋 РЕКОМЕНДАЦИИ ДЛЯ UI:');
    console.log('=======================');
    console.log('1. Проверить вызовы API в браузере (Network tab)');
    console.log('2. Проверить ответы от /api/boost/user/:userId');
    console.log('3. Проверить ответы от /api/boost/farming-status');
    console.log('4. Очистить кэш React Query после покупки');
    console.log('5. Проверить обновление состояния в UI компонентах');
    
  } catch (error) {
    console.error('💥 Критическая ошибка диагностики:', error);
  }
}

// Запуск диагностики
diagnoseTonBoostUIDisplay()
  .then(() => {
    console.log('\n✅ Диагностика UI отображения завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Ошибка:', error);
    process.exit(1);
  });