import { supabase } from './core/supabase.js';

async function diagnoseTonBoost() {
  console.log('🔍 Диагностика системы TON Boost\n');
  
  // 1. Проверка активных пользователей
  console.log('1. Активные пользователи TON Boost:');
  const { data: activeUsers } = await supabase
    .from('ton_farming_data')
    .select('*')
    .not('boost_package_id', 'is', null)
    .gt('farming_balance', 0);
    
  if (activeUsers && activeUsers.length > 0) {
    console.log(`   ✅ Найдено ${activeUsers.length} активных пользователей`);
    
    let totalBalance = 0;
    activeUsers.forEach(user => {
      totalBalance += Number(user.farming_balance);
      console.log(`   - User ${user.user_id}: ${user.farming_balance} TON (Package ${user.boost_package_id})`);
    });
    
    const dailyIncome = totalBalance * 0.01;
    const fiveMinIncome = dailyIncome / 288;
    console.log(`   💰 Ожидаемый доход: ${fiveMinIncome.toFixed(6)} TON каждые 5 минут`);
  } else {
    console.log('   ❌ Нет активных пользователей');
  }
  
  // 2. Проверка последних транзакций
  console.log('\n2. Последние транзакции TON доходов:');
  const { data: lastTransactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .gt('amount_ton', 0)
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (lastTransactions && lastTransactions.length > 0) {
    lastTransactions.forEach(tx => {
      const time = new Date(tx.created_at);
      console.log(`   - ${time.toLocaleTimeString()}: User ${tx.user_id} +${tx.amount_ton} TON`);
      if (tx.metadata?.original_type) {
        console.log(`     ✨ Metadata: ${JSON.stringify(tx.metadata)}`);
      }
    });
    
    const lastTime = new Date(lastTransactions[0].created_at);
    const timeSinceLastTx = (Date.now() - lastTime.getTime()) / 1000 / 60;
    console.log(`\n   ⏱️ Время с последней транзакции: ${timeSinceLastTx.toFixed(1)} минут`);
    
    if (timeSinceLastTx > 10) {
      console.log('   ⚠️ Возможна проблема - транзакции не создаются более 10 минут');
    }
  } else {
    console.log('   ❌ Транзакции не найдены');
  }
  
  // 3. Проверка транзакций с новым типом
  console.log('\n3. Проверка транзакций с исправлением:');
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: newTransactions } = await supabase
    .from('transactions')
    .select('metadata')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .gte('created_at', tenMinutesAgo)
    .not('metadata', 'is', null);
    
  if (newTransactions && newTransactions.length > 0) {
    const withOriginalType = newTransactions.filter(tx => tx.metadata?.original_type === 'TON_BOOST_INCOME');
    if (withOriginalType.length > 0) {
      console.log(`   ✅ ИСПРАВЛЕНИЕ РАБОТАЕТ! Найдено ${withOriginalType.length} транзакций с metadata`);
    } else {
      console.log('   ⚠️ Новые транзакции найдены, но без original_type в metadata');
    }
  } else {
    console.log('   ❌ Новых транзакций с metadata не найдено');
  }
  
  console.log('\n4. Статус системы:');
  console.log(`   Текущее время: ${new Date().toLocaleTimeString()}`);
  console.log('   Планировщик должен запускаться каждые 5 минут');
  console.log('   Следующий запуск примерно через:', (5 - (new Date().getMinutes() % 5)), 'минут');
}

diagnoseTonBoost().catch(console.error);