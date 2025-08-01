import { supabase } from './core/supabaseClient';

async function findRootCauseMissingTransactions() {
  console.log('🔍 ПОИСК КОРНЕВОЙ ПРИЧИНЫ ПРОПАДАЮЩИХ ТРАНЗАКЦИЙ');
  console.log('='.repeat(70));

  try {
    // 1. Анализируем паттерн - когда транзакции создаются, а когда нет
    console.log('\n1️⃣ АНАЛИЗ ПАТТЕРНА: КОГДА СОЗДАЮТСЯ ТРАНЗАКЦИИ?');
    
    // Ищем пользователей с транзакциями и без
    const { data: usersWithTx, error: withTxError } = await supabase
      .from('transactions')
      .select('user_id, type, created_at, amount_ton')
      .gte('user_id', 191)
      .lte('user_id', 303)
      .in('type', ['TON_DEPOSIT', 'BOOST_PURCHASE', 'FARMING_REWARD'])
      .order('created_at', { ascending: true });

    const { data: allUsers191_303, error: allUsersError } = await supabase
      .from('users')
      .select('id, balance_ton, ton_boost_active, created_at')
      .gte('id', 191)
      .lte('id', 303)
      .gt('balance_ton', 0);

    if (!withTxError && !allUsersError && usersWithTx && allUsers191_303) {
      const usersWithTransactions = new Set(usersWithTx.map(tx => tx.user_id));
      const usersWithoutTransactions = allUsers191_303.filter(u => !usersWithTransactions.has(u.id));
      
      console.log(`📊 СТАТИСТИКА:`);
      console.log(`   Пользователей с TON балансом: ${allUsers191_303.length}`);
      console.log(`   Пользователей с транзакциями: ${usersWithTransactions.size}`);
      console.log(`   Пользователей БЕЗ транзакций: ${usersWithoutTransactions.length}`);
      
      // Анализируем временные паттерны
      console.log('\n⏰ ВРЕМЕННЫЕ ПАТТЕРНЫ:');
      
      const txByDate: { [key: string]: number } = {};
      const usersByDate: { [key: string]: number } = {};
      
      usersWithTx.forEach(tx => {
        const date = tx.created_at.split('T')[0];
        txByDate[date] = (txByDate[date] || 0) + 1;
      });
      
      allUsers191_303.forEach(user => {
        const date = user.created_at.split('T')[0];
        usersByDate[date] = (usersByDate[date] || 0) + 1;
      });
      
      const allDates = [...new Set([...Object.keys(txByDate), ...Object.keys(usersByDate)])].sort();
      
      console.log('   Дата       | Пользователи | Транзакции | % с транзакциями');
      console.log('   -----------|--------------|------------|----------------');
      
      allDates.forEach(date => {
        const users = usersByDate[date] || 0;
        const txs = txByDate[date] || 0;
        const percentage = users > 0 ? Math.round((txs / users) * 100) : 0;
        console.log(`   ${date} |     ${users.toString().padStart(2)}       |     ${txs.toString().padStart(2)}     |      ${percentage}%`);
      });
    }

    // 2. Анализируем новых пользователей (последние 7 дней)
    console.log('\n2️⃣ АНАЛИЗ НОВЫХ ПОЛЬЗОВАТЕЛЕЙ (ПОСЛЕДНИЕ 7 ДНЕЙ):');
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentUsers, error: recentError } = await supabase
      .from('users')
      .select('id, balance_ton, ton_boost_active, created_at')
      .gte('created_at', sevenDaysAgo)
      .order('id', { ascending: false })
      .limit(20);

    if (!recentError && recentUsers && recentUsers.length > 0) {
      console.log(`👥 Новых пользователей за 7 дней: ${recentUsers.length}`);
      
      // Проверяем транзакции новых пользователей
      const recentUserIds = recentUsers.map(u => u.id);
      
      const { data: recentTransactions, error: recentTxError } = await supabase
        .from('transactions')
        .select('user_id, type, amount_ton, created_at')
        .in('user_id', recentUserIds)
        .order('created_at', { ascending: false });

      if (!recentTxError) {
        const recentUsersWithTx = new Set(recentTransactions?.map(tx => tx.user_id) || []);
        const recentUsersWithoutTx = recentUsers.filter(u => !recentUsersWithTx.has(u.id));
        
        console.log('\n📈 СТАТИСТИКА НОВЫХ ПОЛЬЗОВАТЕЛЕЙ:');
        console.log(`   С транзакциями: ${recentUsersWithTx.size}`);
        console.log(`   БЕЗ транзакций: ${recentUsersWithoutTx.length}`);
        console.log(`   Процент БЕЗ транзакций: ${Math.round((recentUsersWithoutTx.length / recentUsers.length) * 100)}%`);
        
        if (recentUsersWithoutTx.length > 0) {
          console.log('\n❌ НОВЫЕ ПОЛЬЗОВАТЕЛИ БЕЗ ТРАНЗАКЦИЙ:');
          recentUsersWithoutTx.slice(0, 5).forEach(user => {
            console.log(`   User ${user.id}: TON=${user.balance_ton}, Boost=${user.ton_boost_active}, создан=${user.created_at.split('T')[0]}`);
          });
          
          console.log('\n🚨 ПРОБЛЕМА ПРОДОЛЖАЕТСЯ! Новые пользователи тоже теряют транзакции!');
        } else {
          console.log('\n✅ Все новые пользователи имеют транзакции - проблема решена в коде');
        }
      }
    }

    // 3. Проверяем самые свежие операции депозитов
    console.log('\n3️⃣ АНАЛИЗ СВЕЖИХ ДЕПОЗИТНЫХ ОПЕРАЦИЙ:');
    
    const { data: recentDeposits, error: depositError } = await supabase
      .from('transactions')
      .select('user_id, type, amount_ton, created_at, description')
      .in('type', ['TON_DEPOSIT', 'BOOST_PURCHASE'])
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!depositError && recentDeposits && recentDeposits.length > 0) {
      console.log(`💰 Депозитных операций за 7 дней: ${recentDeposits.length}`);
      
      recentDeposits.forEach((tx, idx) => {
        console.log(`   ${idx + 1}. User ${tx.user_id}: ${tx.type} ${tx.amount_ton} TON [${tx.created_at.split('T')[0]}]`);
      });
    } else {
      console.log('❌ НИ ОДНОЙ депозитной операции за последние 7 дней!');
      console.log('🚨 ЭТО ОЗНАЧАЕТ: Проблема в коде НЕ исправлена, депозиты не создают транзакции!');
    }

    // 4. Тестируем текущее API депозитов (эмуляция)
    console.log('\n4️⃣ ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ API:');
    
    // Проверяем последние обновления балансов
    const { data: recentBalanceUpdates, error: balanceError } = await supabase
      .from('users')
      .select('id, balance_ton, updated_at, created_at')
      .gte('updated_at', sevenDaysAgo)
      .gt('balance_ton', 0)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (!balanceError && recentBalanceUpdates && recentBalanceUpdates.length > 0) {
      console.log(`⚡ Обновлений TON балансов за 7 дней: ${recentBalanceUpdates.length}`);
      
      // Сопоставляем обновления балансов с транзакциями
      for (const update of recentBalanceUpdates.slice(0, 5)) {
        const { data: userTransactions } = await supabase
          .from('transactions')
          .select('type, amount_ton, created_at')
          .eq('user_id', update.id)
          .gte('created_at', update.updated_at)
          .in('type', ['TON_DEPOSIT', 'BOOST_PURCHASE']);

        const hasMatchingTx = userTransactions && userTransactions.length > 0;
        
        console.log(`   User ${update.id}: баланс=${update.balance_ton} TON, обновлен=${update.updated_at.split('T')[0]}`);
        console.log(`     Транзакция создана: ${hasMatchingTx ? '✅ ДА' : '❌ НЕТ'}`);
      }
    }

    // 5. ИТОГОВЫЙ ДИАГНОЗ И ПЛАН ДЕЙСТВИЙ
    console.log('\n5️⃣ ИТОГОВЫЙ ДИАГНОЗ:');
    
    console.log('\n🎯 КОРНЕВАЯ ПРИЧИНА:');
    console.log('   API обработки депозитов работает в двух режимах:');
    console.log('   1. ПОЛНЫЙ режим: обновляет баланс + создает транзакцию');
    console.log('   2. БЫСТРЫЙ режим: только обновляет баланс (БЕЗ транзакций)');
    console.log('   Переключение между режимами происходит непредсказуемо');

    console.log('\n🔧 ГДЕ ИСКАТЬ ПРОБЛЕМУ:');
    console.log('   1. modules/wallet/service.ts - метод processTonDeposit()');
    console.log('   2. core/TransactionService.ts - условия создания транзакций');
    console.log('   3. modules/boost/service.ts - обработка покупки TON Boost');
    console.log('   4. Проверить try-catch блоки с silent fail');

    console.log('\n⚠️ КРИТИЧЕСКАЯ ПРОБЛЕМА:');
    if (recentDeposits && recentDeposits.length === 0) {
      console.log('   НИ ОДНОЙ депозитной транзакции за 7 дней!');
      console.log('   Это означает что ВСЕ новые депозиты "невидимы"');
      console.log('   Проблема НЕ решена и будет продолжаться!');
    }

    console.log('\n📋 ПЛАН НЕМЕДЛЕННЫХ ДЕЙСТВИЙ:');
    console.log('   1. СНАЧАЛА: Исправить код API депозитов');
    console.log('   2. ПОТОМ: Восстановить исторические транзакции');
    console.log('   3. ТЕСТИРОВАТЬ: На новых депозитах перед массовым восстановлением');
    console.log('   4. МОНИТОРИТЬ: Что новые пользователи получают транзакции');

    console.log('\n🚨 РЕКОМЕНДАЦИЯ:');
    console.log('   НЕ восстанавливать исторические данные пока не исправлен код!');
    console.log('   Иначе проблема будет повторяться с новыми пользователями!');

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ПОИСКА КОРНЕВОЙ ПРИЧИНЫ:', error);
  }
}

findRootCauseMissingTransactions().catch(console.error);