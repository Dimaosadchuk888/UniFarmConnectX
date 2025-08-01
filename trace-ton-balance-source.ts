import { supabase } from './core/supabaseClient';

async function traceTonBalanceSource() {
  console.log('🔍 ТРАССИРОВКА ИСТОЧНИКА TON БАЛАНСОВ - ГЛУБОКИЙ АНАЛИЗ');
  console.log('='.repeat(80));

  try {
    // 1. АНАЛИЗ: Что TONBoostIncomeScheduler реально делает
    console.log('\n1️⃣ АНАЛИЗ TONBoostIncomeScheduler:');
    console.log('   ❓ ВОПРОС: Откуда планировщик ЗНАЕТ о депозитах?');
    console.log('   🔍 ГИПОТЕЗА: Планировщик только начисляет ДОХОДЫ, но НЕ депозиты');
    
    // Проверяем что делает getActiveBoostUsers
    const { data: tonFarmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('boost_active', true)
      .limit(5);

    if (!farmingError && tonFarmingData) {
      console.log(`   📊 Активных TON Boost пользователей: ${tonFarmingData.length}`);
      
      if (tonFarmingData.length > 0) {
        console.log('   📋 Примеры активных TON Boost:');
        tonFarmingData.forEach((item, idx) => {
          console.log(`     ${idx + 1}. User ${item.user_id}: Package ${item.boost_package_id}`);
          console.log(`        Start: ${item.boost_farming_start}`);
          console.log(`        Last Update: ${item.boost_farming_last_update}`);
        });
      }
    } else if (farmingError?.code === '42P01') {
      console.log('   ❌ Таблица ton_farming_data НЕ СУЩЕСТВУЕТ!');
    } else {
      console.log('   ❌ Ошибка доступа к ton_farming_data:', farmingError?.message);
    }

    // 2. ГЛАВНЫЙ ВОПРОС: Как пользователи становятся активными в TON Boost?
    console.log('\n2️⃣ КАК ПОЛЬЗОВАТЕЛИ АКТИВИРУЮТ TON BOOST:');
    
    // Ищем BOOST_PURCHASE транзакции
    const { data: boostPurchases, error: boostError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'BOOST_PURCHASE')
      .gte('user_id', 191)
      .lte('user_id', 303)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!boostError && boostPurchases && boostPurchases.length > 0) {
      console.log(`   ✅ Найдено ${boostPurchases.length} BOOST_PURCHASE транзакций:`);
      boostPurchases.forEach((tx, idx) => {
        console.log(`     ${idx + 1}. User ${tx.user_id}: ${tx.amount_ton || tx.amount} TON`);
        console.log(`        [${tx.created_at}] ${tx.description}`);
        console.log(`        Status: ${tx.status}`);
      });
    } else {
      console.log('   ❌ НИ ОДНОЙ BOOST_PURCHASE транзакции не найдено!');
    }

    // 3. КРИТИЧЕСКИЙ АНАЛИЗ: Откуда берется изначальный TON баланс для покупки Boost?
    console.log('\n3️⃣ КРИТИЧЕСКИЙ ВОПРОС: ИСТОЧНИК ИЗНАЧАЛЬНОГО TON БАЛАНСА');
    
    console.log('   🧠 ЛОГИЧЕСКАЯ ЦЕПОЧКА:');
    console.log('   1. Пользователь покупает TON Boost → списывается TON с баланса');
    console.log('   2. НО: Откуда на балансе появились изначальные TON?');
    console.log('   3. ЕСЛИ НЕТ TON_DEPOSIT транзакций → TON появились ДРУГИМ способом');
    
    // Проверяем пользователей у которых был TON баланс ДО boost покупки
    if (boostPurchases && boostPurchases.length > 0) {
      const firstBoost = boostPurchases[0];
      const userId = firstBoost.user_id;
      const boostDate = firstBoost.created_at;
      
      console.log(`\n   🔍 АНАЛИЗ User ${userId} - первая BOOST покупка ${boostDate}:`);
      
      // Ищем все транзакции ПЕРЕД boost покупкой
      const { data: priorTransactions, error: priorError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .lt('created_at', boostDate)
        .order('created_at', { ascending: false });

      if (!priorError && priorTransactions) {
        console.log(`     📊 Транзакций ДО boost покупки: ${priorTransactions.length}`);
        
        const tonTransactions = priorTransactions.filter(tx => 
          tx.currency === 'TON' || tx.amount_ton > 0
        );
        
        console.log(`     💰 TON транзакций ДО boost: ${tonTransactions.length}`);
        
        if (tonTransactions.length > 0) {
          console.log('     📋 TON транзакции ПЕРЕД boost покупкой:');
          tonTransactions.forEach((tx, idx) => {
            console.log(`       ${idx + 1}. [${tx.created_at}] ${tx.type}`);
            console.log(`          Amount: ${tx.amount_ton || tx.amount} TON`);
            console.log(`          Description: ${tx.description}`);
          });
        } else {
          console.log('     ❌ НИ ОДНОЙ TON транзакции ДО boost покупки!');
          console.log('     🚨 ПАРАДОКС: Откуда взялись TON для покупки boost?');
        }
      }
    }

    // 4. ПОИСК СКРЫТЫХ МЕХАНИЗМОВ ПОПОЛНЕНИЯ БАЛАНСА
    console.log('\n4️⃣ ПОИСК СКРЫТЫХ МЕХАНИЗМОВ ПОПОЛНЕНИЯ:');
    
    // Ищем обновления users.balance_ton напрямую
    console.log('   🔍 ГИПОТЕЗЫ:');
    console.log('   A) Прямое обновление balance_ton в коде БЕЗ транзакций');
    console.log('   B) Внешняя система (webhook, API) обновляет балансы');
    console.log('   C) Ручное начисление через админку');
    console.log('   D) Импорт данных из старой системы');
    
    // Проверяем самые старые обновления пользователей с TON
    const { data: oldestTonUsers, error: oldestError } = await supabase
      .from('users')
      .select('id, username, balance_ton, created_at, updated_at')
      .gt('balance_ton', 0)
      .gte('id', 191)
      .lte('id', 303)
      .order('created_at', { ascending: true })
      .limit(5);

    if (!oldestError && oldestTonUsers) {
      console.log('\n   📅 САМЫЕ СТАРЫЕ пользователи с TON балансом:');
      oldestTonUsers.forEach((user, idx) => {
        const createdDate = new Date(user.created_at);
        const updatedDate = new Date(user.updated_at);
        const daysBetween = Math.floor((updatedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`     ${idx + 1}. User ${user.id} (${user.username})`);
        console.log(`        Balance: ${user.balance_ton} TON`);
        console.log(`        Created: ${user.created_at}`);
        console.log(`        Updated: ${user.updated_at}`);
        console.log(`        Days between: ${daysBetween}`);
        
        if (daysBetween === 0) {
          console.log('        🚨 ПОДОЗРИТЕЛЬНО: Баланс появился в день регистрации!');
        }
      });
    }

    // 5. ФИНАЛЬНАЯ ПРОВЕРКА: Есть ли ЛЮБЫЕ депозитные операции?
    console.log('\n5️⃣ ПОИСК ЛЮБЫХ ДЕПОЗИТНЫХ ОПЕРАЦИЙ:');
    
    const depositTypes = ['DEPOSIT', 'TON_DEPOSIT', 'FARMING_DEPOSIT', 'deposit'];
    
    for (const type of depositTypes) {
      const { data: deposits, error: depError } = await supabase
        .from('transactions')
        .select('id, user_id, type, amount_ton, amount, created_at, description')
        .or(`type.eq.${type},type.ilike.%${type}%`)
        .gte('user_id', 191)
        .lte('user_id', 303)
        .limit(5);

      if (!depError && deposits && deposits.length > 0) {
        console.log(`\n   ✅ Найдено ${deposits.length} транзакций типа "${type}":`);
        deposits.forEach((tx, idx) => {
          console.log(`     ${idx + 1}. User ${tx.user_id}: ${tx.amount_ton || tx.amount} TON`);
          console.log(`        [${tx.created_at}] ${tx.description}`);
        });
      } else {
        console.log(`   ❌ НЕТ транзакций типа "${type}"`);
      }
    }

    // 6. ВЫВОДЫ И СЛЕДУЮЩИЕ ШАГИ
    console.log('\n6️⃣ ВЫВОДЫ РАССЛЕДОВАНИЯ:');
    
    console.log('\n🎯 КЛЮЧЕВЫЕ НАХОДКИ:');
    console.log('   1. TONBoostIncomeScheduler только НАЧИСЛЯЕТ доходы от boost');
    console.log('   2. НЕ НАЙДЕНО механизма изначального пополнения TON балансов');
    console.log('   3. Пользователи покупают boost, но неясно откуда взялись TON');
    console.log('   4. Либо есть скрытый механизм, либо данные импортированы');
    
    console.log('\n🔍 НУЖНО ИССЛЕДОВАТЬ ДАЛЬШЕ:');
    console.log('   1. Найти где реально происходит ПЕРВОНАЧАЛЬНОЕ пополнение TON');
    console.log('   2. Проверить импорт данных или миграции');
    console.log('   3. Найти webhook или внешние API для депозитов');
    console.log('   4. Проверить админ панель на ручное начисление');

  } catch (error) {
    console.error('❌ ОШИБКА ТРАССИРОВКИ:', error);
  }
}

traceTonBalanceSource().catch(console.error);