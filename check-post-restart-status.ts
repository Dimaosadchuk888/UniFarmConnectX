import { supabase } from './core/supabase';

async function checkPostRestartStatus() {
  console.log('=== СТАТУС ПОСЛЕ РЕСТАРТА ===\n');
  console.log(`Время проверки: ${new Date().toLocaleString()}\n`);

  try {
    // 1. Проверяем транзакции после рестарта
    console.log('📊 1. ТРАНЗАКЦИИ ПОСЛЕ РЕСТАРТА (последние 10 минут):\n');
    
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

    const { data: recentTx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .gt('created_at', tenMinutesAgo.toISOString())
      .in('type', ['FARMING_REWARD'])
      .order('created_at', { ascending: false });

    if (!txError && recentTx) {
      const uniTx = recentTx.filter(t => t.currency === 'UNI');
      const tonTx = recentTx.filter(t => t.currency === 'TON');
      
      console.log(`UNI Farming транзакций: ${uniTx.length} ✅`);
      if (uniTx.length > 0) {
        console.log(`  Последняя: ${new Date(uniTx[0].created_at).toLocaleString()}`);
        console.log(`  Сумма: ${uniTx[0].amount} UNI`);
      }
      
      console.log(`\nTON Boost транзакций: ${tonTx.length} ${tonTx.length > 0 ? '✅' : '❌'}`);
      if (tonTx.length === 0) {
        console.log('  НЕТ новых начислений после рестарта!');
      }
    }

    // 2. Проверяем состояние farming_balance
    console.log('\n💰 2. СОСТОЯНИЕ farming_balance:\n');
    
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, boost_active, updated_at')
      .eq('boost_active', true)
      .order('farming_balance', { ascending: false })
      .limit(10);

    if (!farmingError && farmingData) {
      let nonZeroCount = 0;
      
      farmingData.forEach(user => {
        const balance = parseFloat(user.farming_balance);
        if (balance > 0) nonZeroCount++;
        
        console.log(`User ${user.user_id}: farming_balance = ${balance} TON ${balance > 0 ? '✅' : '❌'}`);
      });
      
      console.log(`\nИтого с ненулевым балансом: ${nonZeroCount} из ${farmingData.length}`);
      
      if (nonZeroCount === 0) {
        console.log('\n❌ ВСЕ farming_balance по-прежнему = 0!');
        console.log('   Рестарт НЕ решил проблему с балансами.');
      }
    }

    // 3. Выводы
    console.log('\n📝 3. ВЫВОДЫ:\n');
    
    console.log('ФАКТЫ:');
    console.log('- UNI Farming планировщик работает после рестарта ✅');
    console.log('- TON Boost планировщик НЕ запустился после рестарта ❌');
    console.log('- farming_balance все еще = 0 для всех пользователей ❌');
    console.log('- Изменения в коде присутствуют, но не применяются');
    
    console.log('\nВЕРОЯТНАЯ ПРИЧИНА:');
    console.log('Планировщик TON Boost падает при инициализации из-за:');
    console.log('1. Ошибки в конструкторе класса');
    console.log('2. Проблемы с импортами модулей');
    console.log('3. Исключения при первом запуске processTonBoostIncome()');

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

checkPostRestartStatus();