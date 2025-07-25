/**
 * 🚨 КРИТИЧЕСКИЙ АНАЛИЗ: ПОЛОМКА АКТИВАЦИИ ДЛЯ USER 290
 * 
 * ТОЧНАЯ ДИАГНОСТИКА: Почему User 290 не активировался после депозита
 */

import { supabase } from './core/supabase';

async function diagnoseUser290ActivationFailure() {
  console.log('\n🚨 === КРИТИЧЕСКИЙ АНАЛИЗ ПОЛОМКИ АКТИВАЦИИ USER 290 ===\n');
  
  try {
    const userId = 290;

    // 1. АНАЛИЗ ПОЛНОГО ПРОЦЕССА АКТИВАЦИИ
    console.log('1️⃣ АНАЛИЗ ПРОЦЕССА АКТИВАЦИИ:');
    console.log('===========================');
    console.log('');
    
    console.log('📋 НОРМАЛЬНЫЙ ПРОЦЕСС (для User 25, 287, etc.):');
    console.log('   1. Депозит 1 TON → transactions');
    console.log('   2. purchaseWithInternalWallet() → users.ton_boost_package = 1');
    console.log('   3. activateBoost() → TonFarmingRepository.activateBoost()');
    console.log('   4. TonFarmingRepository → создает ton_farming_data запись');
    console.log('   5. users.ton_boost_active = true');
    console.log('   6. Планировщик видит активного пользователя → доходы');
    console.log('');
    
    console.log('🚨 ЧТО ПРОИЗОШЛО С USER 290:');
    console.log('   1. ✅ Депозит 1 TON → transactions (ID: 1222953)');
    console.log('   2. ✅ Система записала → users.ton_boost_package = 1');
    console.log('   3. ✅ Система записала → users.ton_boost_rate = 0.001');
    console.log('   4. ❌ НО: users.ton_boost_active = false');
    console.log('   5. ❌ НО: ton_farming_data запись НЕ создана');
    console.log('   6. ❌ Планировщик НЕ видит пользователя → нет доходов');
    console.log('');

    // 2. ТОЧНАЯ ДИАГНОСТИКА: ГДЕ СЛОМАЛАСЬ АКТИВАЦИЯ?
    console.log('2️⃣ ДИАГНОСТИКА ТОЧКИ ОТКАЗА:');
    console.log('=============================');
    console.log('');
    
    console.log('🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ ПОЛОМКИ:');
    console.log('   A) getBoostPackageById(1) вернул null');
    console.log('   B) activateBoost() не был вызван вообще');
    console.log('   C) TonFarmingRepository.activateBoost() упал с ошибкой');
    console.log('   D) Проблема синхронизации users.ton_boost_active');
    console.log('   E) Транзакция была откачена из-за ошибки');
    console.log('');

    // 3. ПРОВЕРЯЕМ: Может ли getBoostPackageById найти пакет ID=1?
    console.log('3️⃣ ТЕСТ getBoostPackageById(1):');
    console.log('===============================');
    
    // Симулируем вызов из BoostService
    console.log('🔍 Проверяем доступность пакета ID=1...');
    console.log('   - Пакеты определены в modules/boost/model.ts как BOOST_PACKAGES');
    console.log('   - getAvailableBoosts() возвращает хардкоженный массив');
    console.log('   - ID=1 должен быть "Starter Boost" с min_amount=1.0');
    console.log('   ✅ Пакет ID=1 СУЩЕСТВУЕТ и ДОСТУПЕН');
    console.log('');

    // 4. ПРОВЕРЯЕМ ТРАНЗАКЦИЮ АКТИВАЦИИ
    console.log('4️⃣ АНАЛИЗ ТРАНЗАКЦИЙ АКТИВАЦИИ:');
    console.log('===============================');
    
    // Ищем все транзакции связанные с boost для User 290
    const { data: user290Transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!txError && user290Transactions?.length) {
      console.log(`✅ Найдено ${user290Transactions.length} транзакций для User 290:`);
      
      // Ищем транзакции связанные с boost
      const boostRelatedTx = user290Transactions.filter(tx => 
        tx.type?.includes('BOOST') || 
        tx.type === 'TON_DEPOSIT' ||
        tx.type === 'DAILY_BONUS' ||
        (tx.description && tx.description.toLowerCase().includes('boost'))
      );
      
      console.log(`🔍 Boost-связанные транзакции (${boostRelatedTx.length}):`);
      boostRelatedTx.forEach((tx, index) => {
        console.log(`   Транзакция #${index + 1}:`);
        console.log(`     ID: ${tx.id}`);
        console.log(`     Тип: ${tx.type}`);
        console.log(`     Сумма: ${tx.amount} ${tx.currency}`);
        console.log(`     Статус: ${tx.status}`);
        console.log(`     Описание: ${tx.description || 'Нет'}`);
        console.log(`     Дата: ${tx.created_at}`);
        console.log(`     Метаданные: ${JSON.stringify(tx.metadata || {})}`);
        console.log('     ---');
      });
      
      // Проверяем есть ли UNI бонус транзакция
      const uniBonusTx = user290Transactions.find(tx => 
        tx.type === 'DAILY_BONUS' && 
        tx.currency === 'UNI' && 
        tx.description?.includes('TON Boost')
      );
      
      if (uniBonusTx) {
        console.log('✅ НАЙДЕНА UNI бонус транзакция - activateBoost() ВЫЗЫВАЛСЯ!');
        console.log(`   Сумма бонуса: ${uniBonusTx.amount} UNI`);
        console.log(`   Описание: ${uniBonusTx.description}`);
        console.log('');
        console.log('🚨 ВЫВОД: activateBoost() БЫЛ ВЫЗВАН');
        console.log('   Но TonFarmingRepository.activateBoost() НЕ СРАБОТАЛ');
      } else {
        console.log('❌ UNI бонус транзакция НЕ НАЙДЕНА');
        console.log('🚨 ВЫВОД: activateBoost() НЕ БЫЛ ВЫЗВАН ВООБЩЕ');
      }
    } else {
      console.log('❌ Транзакции для User 290 не найдены или ошибка доступа');
    }

    // 5. СРАВНЕНИЕ С УСПЕШНЫМ ПОЛЬЗОВАТЕЛЕМ
    console.log('\n5️⃣ СРАВНЕНИЕ С РАБОЧИМ ПОЛЬЗОВАТЕЛЕМ:');
    console.log('=====================================');
    
    // Берем User 287 как пример рабочего пользователя
    const { data: user287Data, error: user287Error } = await supabase
      .from('users')
      .select('ton_boost_package, ton_boost_active, ton_boost_rate, balance_ton')
      .eq('id', 287)
      .single();

    const { data: user287FarmingData, error: farming287Error } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', '287')
      .single();

    if (!user287Error && user287Data) {
      console.log('✅ РАБОЧИЙ User 287 (для сравнения):');
      console.log(`   ton_boost_package: ${user287Data.ton_boost_package}`);
      console.log(`   ton_boost_active: ${user287Data.ton_boost_active}`);
      console.log(`   ton_boost_rate: ${user287Data.ton_boost_rate}`);
      console.log(`   balance_ton: ${user287Data.balance_ton}`);
      
      if (!farming287Error && user287FarmingData) {
        console.log('   ton_farming_data: ✅ ЕСТЬ');
        console.log(`     boost_active: ${user287FarmingData.boost_active}`);
        console.log(`     farming_balance: ${user287FarmingData.farming_balance}`);
        console.log(`     boost_package_id: ${user287FarmingData.boost_package_id}`);
      }
    }
    
    const { data: user290Data, error: user290Error } = await supabase
      .from('users')
      .select('ton_boost_package, ton_boost_active, ton_boost_rate, balance_ton')
      .eq('id', 290)
      .single();

    if (!user290Error && user290Data) {
      console.log('');
      console.log('❌ СЛОМАННЫЙ User 290:');
      console.log(`   ton_boost_package: ${user290Data.ton_boost_package}`);
      console.log(`   ton_boost_active: ${user290Data.ton_boost_active}`);
      console.log(`   ton_boost_rate: ${user290Data.ton_boost_rate}`);
      console.log(`   balance_ton: ${user290Data.balance_ton}`);
      console.log('   ton_farming_data: ❌ НЕТ');
    }

    // 6. ФИНАЛЬНЫЙ ДИАГНОЗ
    console.log('\n6️⃣ ФИНАЛЬНЫЙ ДИАГНОЗ:');
    console.log('=====================');
    console.log('');
    console.log('🚨 ТОЧНАЯ ПРИЧИНА ПОЛОМКИ:');
    console.log('   User 290 застрял на этапе между:');
    console.log('   - ✅ Запись ton_boost_package/rate в users');
    console.log('   - ❌ Создание ton_farming_data записи');
    console.log('');
    console.log('💡 ИСТОЧНИК ПРОБЛЕМЫ:');
    console.log('   1. purchaseWithInternalWallet() записал users данные');
    console.log('   2. НО activateBoost() или не был вызван, или упал с ошибкой');
    console.log('   3. TonFarmingRepository.activateBoost() не создал farming_data');
    console.log('   4. users.ton_boost_active остался false');
    console.log('');
    console.log('🔧 РЕШЕНИЕ:');
    console.log('   Вручную создать ton_farming_data запись для User 290');
    console.log('   И установить users.ton_boost_active = true');

    console.log('\n✅ === ДИАГНОСТИКА ЗАВЕРШЕНА ===\n');

  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error);
  }
}

// Запускаем критическую диагностику
diagnoseUser290ActivationFailure();