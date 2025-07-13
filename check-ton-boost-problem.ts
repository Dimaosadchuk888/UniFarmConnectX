import { supabase } from './core/supabase.js';

async function checkTonBoostProblem() {
  console.log('=== Диагностика проблемы TON Boost ===\n');

  try {
    // 1. Проверяем логи сервера (если есть)
    console.log('1. Проверка типов транзакций:\n');
    console.log('В коде tonBoostIncomeScheduler.ts используется: TON_BOOST_INCOME');
    console.log('В TransactionService.ts маппинг: TON_BOOST_INCOME → FARMING_REWARD');
    console.log('В БД ошибка: "invalid input value for enum transaction_type: TON_BOOST_INCOME"\n');

    // 2. Проверяем создается ли транзакция FARMING_REWARD для TON
    const { data: farmingRewardTx, error: farmingError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .not('amount_ton', 'is', null)
      .gt('amount_ton', 0)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('2. Транзакции FARMING_REWARD с TON суммами:');
    if (farmingRewardTx && farmingRewardTx.length > 0) {
      farmingRewardTx.forEach(tx => {
        console.log(`- ${tx.created_at}: User ${tx.user_id}, ${tx.amount_ton} TON - ${tx.description}`);
      });
    } else {
      console.log('❌ Нет транзакций FARMING_REWARD с TON суммами');
    }

    // 3. Проверяем metadata транзакций
    console.log('\n3. Проверка metadata для поиска original_type:');
    const { data: metadataTx } = await supabase
      .from('transactions')
      .select('metadata, type, created_at')
      .not('metadata', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (metadataTx) {
      const tonBoostTx = metadataTx.filter(tx => 
        tx.metadata && tx.metadata.original_type === 'TON_BOOST_INCOME'
      );
      
      if (tonBoostTx.length > 0) {
        console.log('✅ Найдены транзакции с original_type = TON_BOOST_INCOME:');
        tonBoostTx.forEach(tx => {
          console.log(`- ${tx.created_at}: type=${tx.type}`);
        });
      } else {
        console.log('❌ Транзакций с original_type = TON_BOOST_INCOME не найдено');
      }
    }

    // 4. Проверяем ошибки в транзакциях
    console.log('\n4. Анализ проблемы:');
    console.log('Похоже, что транзакции TON_BOOST_INCOME не создаются из-за того, что:');
    console.log('- UnifiedTransactionService пытается сохранить тип TON_BOOST_INCOME напрямую');
    console.log('- Маппинг на FARMING_REWARD не срабатывает');
    console.log('- База данных отклоняет транзакции с неизвестным типом');
    
    // 5. Проверим активных пользователей TON Boost
    const { data: activeUsers } = await supabase
      .from('ton_farming_data')
      .select('user_id')
      .not('boost_package_id', 'is', null)
      .limit(3);

    console.log('\n5. Проверка активных пользователей TON Boost:');
    if (activeUsers && activeUsers.length > 0) {
      console.log(`Найдено ${activeUsers.length} активных пользователей`);
      
      // Проверяем есть ли у них транзакции за последний час
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const userIds = activeUsers.map(u => parseInt(u.user_id));
      
      const { data: userTx } = await supabase
        .from('transactions')
        .select('user_id, type, amount_ton, created_at')
        .in('user_id', userIds)
        .gte('created_at', oneHourAgo)
        .not('amount_ton', 'is', null)
        .gt('amount_ton', 0);

      if (userTx && userTx.length > 0) {
        console.log('✅ У активных пользователей есть TON транзакции:');
        userTx.forEach(tx => {
          console.log(`- User ${tx.user_id}: ${tx.type} ${tx.amount_ton} TON`);
        });
      } else {
        console.log('❌ У активных пользователей НЕТ TON транзакций за последний час');
      }
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkTonBoostProblem().catch(console.error);