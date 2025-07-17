import { supabase } from './core/supabase';

async function testTonBoostScheduler() {
  console.log('\n=== ПРОВЕРКА TON BOOST SCHEDULER ===\n');

  // 1. Проверяем активных пользователей с TON Boost
  const { data: activeUsers, error } = await supabase
    .from('ton_farming_data')
    .select('*')
    .not('boost_package_id', 'is', null);

  console.log('Активные пользователи TON Boost:');
  if (error) {
    console.error('Ошибка:', error);
    return;
  }

  console.log(`Найдено ${activeUsers?.length || 0} пользователей с активным TON Boost\n`);

  if (activeUsers && activeUsers.length > 0) {
    for (const user of activeUsers.slice(0, 3)) {
      console.log(`User ${user.user_id}:`);
      console.log(`  - Пакет: ${user.boost_package_id}`);
      console.log(`  - Депозит: ${user.farming_balance} TON`);
      console.log(`  - Ставка: ${user.ton_boost_rate * 100}% в день`);
      
      // Проверяем последние транзакции
      const { data: lastTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', parseInt(user.user_id))
        .eq('currency', 'TON')
        .eq('type', 'FARMING_REWARD')
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastTx && lastTx.length > 0) {
        const tx = lastTx[0];
        const timeDiff = Date.now() - new Date(tx.created_at).getTime();
        const minutesAgo = Math.floor(timeDiff / (1000 * 60));
        console.log(`  - Последнее начисление: ${minutesAgo} минут назад (${tx.amount} TON)`);
      } else {
        console.log(`  - Начислений не найдено!`);
      }
      console.log('');
    }
  }

  // 2. Проверяем работу планировщика
  console.log('\n=== СТАТУС ПЛАНИРОВЩИКА ===');
  console.log('Планировщик должен запускаться автоматически при старте сервера');
  console.log('Периодичность: каждые 5 минут');
  console.log('Проверьте логи сервера на наличие "[TON_BOOST_SCHEDULER]"');
}

testTonBoostScheduler()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Ошибка:', err);
    process.exit(1);
  });