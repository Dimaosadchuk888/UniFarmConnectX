import { supabase } from './core/supabase';

async function checkTonBoostAfterFix() {
  console.log('=== ПРОВЕРКА TON BOOST ПОСЛЕ ИСПРАВЛЕНИЯ ===\n');
  console.log(`Время: ${new Date().toLocaleString()}\n`);
  
  // Ждем 30 секунд для полного запуска сервера
  console.log('⏳ Ожидание запуска сервера (30 секунд)...\n');
  await new Promise(resolve => setTimeout(resolve, 30000));

  try {
    // 1. Проверяем новые транзакции TON Boost
    console.log('📊 1. НОВЫЕ ТРАНЗАКЦИИ TON BOOST:\n');
    
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const { data: tonTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .eq('type', 'FARMING_REWARD')
      .gt('created_at', fiveMinutesAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!txError && tonTransactions) {
      console.log(`Найдено новых TON транзакций: ${tonTransactions.length}`);
      
      if (tonTransactions.length > 0) {
        console.log('✅ TON BOOST РАБОТАЕТ!');
        console.log('\nПримеры транзакций:');
        tonTransactions.slice(0, 3).forEach(tx => {
          console.log(`  User ${tx.user_id}: +${tx.amount} TON в ${new Date(tx.created_at).toLocaleTimeString()}`);
        });
      } else {
        console.log('❌ Новых транзакций пока нет');
      }
    }

    // 2. Проверяем farming_balance
    console.log('\n💰 2. ПРОВЕРКА farming_balance:\n');
    
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, boost_package_id')
      .eq('boost_active', true)
      .order('farming_balance', { ascending: false })
      .limit(5);

    if (!farmingError && farmingData) {
      console.log('Топ-5 пользователей по farming_balance:');
      farmingData.forEach(user => {
        const balance = parseFloat(user.farming_balance);
        console.log(`  User ${user.user_id}: ${balance} TON (пакет #${user.boost_package_id}) ${balance > 0 ? '✅' : '❌'}`);
      });
    }

    // 3. Проверяем активность планировщика
    console.log('\n⚙️ 3. АКТИВНОСТЬ ПЛАНИРОВЩИКА:\n');
    
    const { data: recentActivity, error: actError } = await supabase
      .from('ton_farming_data')
      .select('user_id, updated_at')
      .eq('boost_active', true)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (!actError && recentActivity) {
      console.log('Последние обновления:');
      recentActivity.forEach(user => {
        const updatedAt = new Date(user.updated_at);
        const minutesAgo = (new Date().getTime() - updatedAt.getTime()) / 60000;
        console.log(`  User ${user.user_id}: обновлен ${minutesAgo.toFixed(1)} мин назад ${minutesAgo < 10 ? '✅' : '⚠️'}`);
      });
    }

    // 4. Итоговый статус
    console.log('\n📈 4. ИТОГОВЫЙ СТАТУС:\n');
    
    const hasNewTransactions = tonTransactions && tonTransactions.length > 0;
    const hasPositiveBalances = farmingData && farmingData.some(u => parseFloat(u.farming_balance) > 0);
    
    if (hasNewTransactions) {
      console.log('🎉 УСПЕХ! TON Boost планировщик работает!');
      console.log('   Транзакции создаются, пользователи получают доход.');
    } else if (hasPositiveBalances) {
      console.log('⏳ Частичный успех: farming_balance обновляется');
      console.log('   Ждем первого цикла начисления (каждые 5 минут)');
    } else {
      console.log('⚠️ Требуется больше времени для проверки');
      console.log('   Запустите скрипт через 5-10 минут');
    }

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

checkTonBoostAfterFix();