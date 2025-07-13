import { supabase } from './core/supabase';

async function checkTonBoostAfterFix() {
  console.log('=== Проверка TON Boost после исправления ===\n');

  try {
    // 1. Проверяем активных пользователей ton_farming_data
    const { data: tonFarmingUsers, error: tfError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('boost_active', true);

    if (tfError) {
      console.log('❌ Ошибка при получении ton_farming_data:', tfError.message);
      // Проверяем fallback на users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, telegram_id, balance_ton, ton_boost_active, ton_boost_package_id, ton_farming_rate, ton_farming_balance')
        .eq('ton_boost_active', true);

      if (usersError) {
        console.error('❌ Ошибка при получении данных из users:', usersError.message);
        return;
      }

      console.log(`\n📊 Активные TON Boost пользователи (из таблицы users):`);
      console.log(`Найдено: ${usersData?.length || 0} пользователей\n`);

      if (usersData && usersData.length > 0) {
        for (const user of usersData) {
          console.log(`User ID: ${user.id}`);
          console.log(`  Balance TON: ${user.balance_ton}`);
          console.log(`  TON Farming Balance: ${user.ton_farming_balance || '0'} ⚠️`);
          console.log(`  Package ID: ${user.ton_boost_package_id}`);
          console.log(`  Rate: ${user.ton_farming_rate}%`);
          
          const depositAmount = parseFloat(user.ton_farming_balance || '0');
          const rate = parseFloat(user.ton_farming_rate || '0');
          const dailyIncome = depositAmount * rate;
          
          console.log(`  📈 Ожидаемый доход: ${dailyIncome.toFixed(6)} TON/день`);
          console.log(`  ${depositAmount === 0 ? '❌ ВНИМАНИЕ: farming_balance = 0, доход не будет начислен!' : '✅ farming_balance установлен'}`);
          console.log('---');
        }
      }
    } else {
      console.log(`\n📊 Активные TON Boost пользователи (из таблицы ton_farming_data):`);
      console.log(`Найдено: ${tonFarmingUsers?.length || 0} пользователей\n`);

      if (tonFarmingUsers && tonFarmingUsers.length > 0) {
        for (const user of tonFarmingUsers) {
          console.log(`User ID: ${user.user_id}`);
          console.log(`  Farming Balance: ${user.farming_balance || '0'} TON`);
          console.log(`  Package ID: ${user.boost_package_id}`);
          console.log(`  Rate: ${user.farming_rate}%`);
          
          const depositAmount = parseFloat(user.farming_balance || '0');
          const rate = parseFloat(user.farming_rate || '0');
          const dailyIncome = depositAmount * rate;
          
          console.log(`  📈 Ожидаемый доход: ${dailyIncome.toFixed(6)} TON/день`);
          console.log(`  ${depositAmount === 0 ? '❌ ВНИМАНИЕ: farming_balance = 0, доход не будет начислен!' : '✅ farming_balance установлен'}`);
          console.log('---');
        }
      }
    }

    // 2. Проверяем последние транзакции TON Boost
    console.log('\n📝 Последние транзакции TON Boost:');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(5);

    if (txError) {
      console.error('❌ Ошибка при получении транзакций:', txError.message);
    } else if (transactions && transactions.length > 0) {
      for (const tx of transactions) {
        const metadata = tx.metadata ? (typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata) : {};
        console.log(`  ${new Date(tx.created_at).toLocaleString()}: User ${tx.user_id} +${tx.amount} TON`);
        if (metadata.deposit_amount) {
          console.log(`    Депозит: ${metadata.deposit_amount} TON`);
        }
      }
    } else {
      console.log('  Транзакции не найдены');
    }

    console.log('\n✨ Рекомендации:');
    console.log('1. Существующие активные пакеты имеют farming_balance = 0');
    console.log('2. Они не будут давать доход до новой покупки');
    console.log('3. Рекомендуется создать миграцию для установки farming_balance');
    console.log('4. Или попросить пользователей перекупить пакеты');

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  }
}

checkTonBoostAfterFix();