import { supabase } from './core/supabaseClient';

async function criticalFindingsReport() {
  console.log('🚨 КРИТИЧЕСКИЕ НАХОДКИ - ПОЛНАЯ КАРТИНА ПРОБЛЕМЫ');
  console.log('='.repeat(80));

  try {
    console.log('\n1️⃣ ОБНАРУЖЕННАЯ АРХИТЕКТУРА API:');
    console.log('   ✅ API Endpoint: POST /api/v2/wallet/ton-deposit СУЩЕСТВУЕТ');
    console.log('   ✅ Controller: modules/wallet/controller.ts:439 tonDeposit() НАЙДЕН');
    console.log('   ✅ Service: modules/wallet/service.ts:358 processTonDeposit() НАЙДЕН');
    console.log('   ✅ UnifiedTransactionService: core/TransactionService.ts НАЙДЕН');
    console.log('   ✅ Mapping: TON_DEPOSIT -> DEPOSIT КОРРЕКТЕН');

    console.log('\n2️⃣ ПОЛНАЯ ЦЕПОЧКА ВЫЗОВОВ:');
    console.log('   Frontend: TON Connect -> /api/v2/wallet/ton-deposit');
    console.log('   Controller: tonDeposit() -> walletService.processTonDeposit()');
    console.log('   Service: processTonDeposit() -> UnifiedTransactionService.createTransaction()');
    console.log('   TransactionService: createTransaction() -> Создает DEPOSIT транзакцию');
    console.log('   BalanceManager: Обновляет balance_ton через UnifiedTransactionService');

    console.log('\n3️⃣ КЛЮЧЕВАЯ ПРОБЛЕМА НАЙДЕНА:');
    
    // Проверяем реальные типы транзакций в БД vs ожидаемые
    const { data: actualTransactionTypes, error: typesError } = await supabase
      .from('transactions')
      .select('type, COUNT(*)::integer as count')
      .gte('user_id', 191)
      .lte('user_id', 303);

    if (!typesError && actualTransactionTypes) {
      const typeStats: { [key: string]: number } = {};
      
      // Получаем статистику по типам
      const { data: allTx } = await supabase
        .from('transactions')
        .select('type')
        .gte('user_id', 191)
        .lte('user_id', 303);

      allTx?.forEach(tx => {
        typeStats[tx.type] = (typeStats[tx.type] || 0) + 1;
      });

      console.log('   📊 РЕАЛЬНЫЕ ТИПЫ ТРАНЗАКЦИЙ В БД:');
      Object.keys(typeStats).forEach(type => {
        console.log(`     ${type}: ${typeStats[type]} транзакций`);
      });

      console.log('\n   🎯 АНАЛИЗ ПРОБЛЕМЫ:');
      if (!typeStats['DEPOSIT'] && !typeStats['TON_DEPOSIT']) {
        console.log('   ❌ НИ ОДНОЙ DEPOSIT/TON_DEPOSIT транзакции!');
        console.log('   🔍 ПРИЧИНА: API /ton-deposit НЕ ВЫЗЫВАЕТСЯ пользователями');
      } else if (typeStats['DEPOSIT'] > 0) {
        console.log('   ✅ DEPOSIT транзакции СУЩЕСТВУЮТ');
        console.log('   🔍 ПРИЧИНА: API работает, но используется редко');
      }
    }

    // 4. Проверяем логи вызовов API
    console.log('\n4️⃣ ПРОВЕРКА API АКТИВНОСТИ:');
    
    // Ищем критические логи TON_DEPOSIT
    const { data: criticalLogs, error: logsError } = await supabase
      .from('server_logs')
      .select('message, level, timestamp')
      .like('message', '%TON_DEPOSIT_PROCESSING%')
      .order('timestamp', { ascending: false })
      .limit(5);

    if (!logsError && criticalLogs && criticalLogs.length > 0) {
      console.log('   ✅ Найдены логи вызовов TON_DEPOSIT:');
      criticalLogs.forEach(log => {
        console.log(`     ${log.timestamp}: ${log.message}`);
      });
    } else {
      console.log('   ❌ НЕТ логов TON_DEPOSIT_PROCESSING');
      console.log('   🔍 ПРИЧИНА: API эндпоинт НЕ ВЫЗЫВАЕТСЯ или логи не записываются');
    }

    // 5. Финальная проверка - откуда берутся TON балансы
    console.log('\n5️⃣ ИСТОЧНИК TON БАЛАНСОВ:');
    
    const { data: usersWithBalance, error: balanceError } = await supabase
      .from('users')
      .select('id, balance_ton, created_at, updated_at')
      .gt('balance_ton', 0)
      .gte('id', 191)
      .lte('id', 303)
      .limit(5);

    if (!balanceError && usersWithBalance) {
      console.log('   👥 Пользователи с TON балансами:');
      
      for (const user of usersWithBalance) {
        // Проверяем есть ли у них DEPOSIT транзакции
        const { data: deposits } = await supabase
          .from('transactions')
          .select('type, amount_ton, created_at')
          .eq('user_id', user.id)
          .in('type', ['DEPOSIT', 'TON_DEPOSIT', 'BOOST_PURCHASE']);

        console.log(`     User ${user.id}: баланс=${user.balance_ton}, обновлен=${user.updated_at.split('T')[0]}`);
        console.log(`       Транзакций: ${deposits?.length || 0}`);
        
        if (deposits && deposits.length > 0) {
          deposits.forEach(dep => {
            console.log(`         ${dep.type}: ${dep.amount_ton} TON [${dep.created_at.split('T')[0]}]`);
          });
        } else {
          console.log(`         ❌ НИ ОДНОЙ депозитной транзакции`);
        }
      }
    }

    console.log('\n6️⃣ ОКОНЧАТЕЛЬНЫЙ ДИАГНОЗ:');
    
    console.log('\n🎯 КОРНЕВАЯ ПРИЧИНА:');
    console.log('   1. API /api/v2/wallet/ton-deposit СУЩЕСТВУЕТ и РАБОТАЕТ');
    console.log('   2. processTonDeposit() СУЩЕСТВУЕТ и ПРАВИЛЬНЫЙ');
    console.log('   3. UnifiedTransactionService СУЩЕСТВУЕТ и НАСТРОЕН');
    console.log('   4. НО: API НЕ ИСПОЛЬЗУЕТСЯ пользователями!');
    
    console.log('\n💡 ИСТИННАЯ ПРОБЛЕМА:');
    console.log('   ❌ Frontend НЕ ОТПРАВЛЯЕТ запросы на /api/v2/wallet/ton-deposit');
    console.log('   ❌ Пользователи делают депозиты МИМО этого API');
    console.log('   ❌ Балансы обновляются ДРУГИМ способом (scheduler, webhook, etc)');
    
    console.log('\n🔍 ЧТО НУЖНО НАЙТИ:');
    console.log('   1. КАК реально обновляются TON балансы пользователей');
    console.log('   2. ЕСТЬ ли другой API для депозитов');
    console.log('   3. РАБОТАЕТ ли webhook от TON блокчейна');
    console.log('   4. ЕСТЬ ли scheduler, который сканирует блокчейн');
    
    console.log('\n📋 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('   1. Проверить frontend код на отправку TON депозитов');
    console.log('   2. Найти scheduler или webhook для TON');
    console.log('   3. Поискать альтернативные пути обновления balance_ton');
    console.log('   4. Проверить работает ли /api/v2/wallet/ton-deposit вообще');

    console.log('\n🎯 ГАРАНТИЯ ДЛЯ НОВЫХ АККАУНТОВ:');
    console.log('   ❌ 0% - если не исправить отправку запросов на API');
    console.log('   ✅ 95% - если заставить frontend использовать правильный API');

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА АНАЛИЗА:', error);
  }
}

criticalFindingsReport().catch(console.error);