import { supabase } from './core/supabaseClient';

async function checkBoostResult() {
  const userId = '184';
  
  // Ожидаемые значения ДО покупки
  const beforeBalanceTon = 100.019965;
  const beforeFarmingBalance = 115;
  const beforeTotal = beforeBalanceTon + beforeFarmingBalance;
  
  console.log('=== ПРОВЕРКА РЕЗУЛЬТАТА ПОКУПКИ BOOST ===\n');
  
  // Текущее состояние
  const { data: current } = await supabase
    .from('users')
    .select('balance_ton, ton_farming_balance, ton_boost_active, ton_boost_package')
    .eq('id', userId)
    .single();
    
  const currentBalanceTon = parseFloat(current.balance_ton);
  const currentFarmingBalance = parseFloat(current.ton_farming_balance);
  const currentTotal = currentBalanceTon + currentFarmingBalance;
  
  console.log('БЫЛО:');
  console.log(`├── balance_ton: ${beforeBalanceTon} TON`);
  console.log(`├── ton_farming_balance: ${beforeFarmingBalance} TON`);
  console.log(`└── ИТОГО: ${beforeTotal} TON\n`);
  
  console.log('СТАЛО:');
  console.log(`├── balance_ton: ${currentBalanceTon} TON (${currentBalanceTon - beforeBalanceTon > 0 ? '+' : ''}${(currentBalanceTon - beforeBalanceTon).toFixed(6)})`);
  console.log(`├── ton_farming_balance: ${currentFarmingBalance} TON (${currentFarmingBalance - beforeFarmingBalance > 0 ? '+' : ''}${(currentFarmingBalance - beforeFarmingBalance).toFixed(6)})`);
  console.log(`├── ton_boost_active: ${current.ton_boost_active ? '✅ Да' : '❌ Нет'}`);
  console.log(`├── ton_boost_package: ${current.ton_boost_package || 'нет'}`);
  console.log(`└── ИТОГО: ${currentTotal} TON (${currentTotal - beforeTotal > 0 ? '+' : ''}${(currentTotal - beforeTotal).toFixed(6)})\n`);
  
  // Анализ
  console.log('📊 АНАЛИЗ:');
  
  const balanceChanged = Math.abs(currentBalanceTon - beforeBalanceTon) > 0.001;
  const farmingChanged = Math.abs(currentFarmingBalance - beforeFarmingBalance) > 0.001;
  
  if (!balanceChanged && !farmingChanged) {
    console.log('❓ Изменений не обнаружено. Возможно, покупка еще не завершена.');
    return;
  }
  
  // Проверка проблемы с переносом всего баланса
  if (currentBalanceTon < 10 && beforeBalanceTon > 50) {
    console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА ОБНАРУЖЕНА!');
    console.log(`   Весь баланс (${beforeBalanceTon} TON) был перемещен в farming!`);
    console.log(`   Ожидалось списание только стоимости пакета (1-10 TON).`);
    console.log(`   Вместо этого: balance_ton → ton_farming_balance`);
  } else if (farmingChanged) {
    const farmingIncrease = currentFarmingBalance - beforeFarmingBalance;
    console.log(`✅ Farming balance увеличился на ${farmingIncrease.toFixed(6)} TON`);
    
    if (Math.abs(farmingIncrease - Math.abs(currentBalanceTon - beforeBalanceTon)) < 0.01) {
      console.log('   Сумма была перемещена из balance_ton в ton_farming_balance');
    }
  }
  
  // Проверка общей суммы
  const totalDiff = currentTotal - beforeTotal;
  if (Math.abs(totalDiff) > 0.01) {
    console.log(`\n⚠️  Общая сумма изменилась на ${totalDiff.toFixed(6)} TON!`);
    console.log('   Это может указывать на проблему с учетом средств.');
  } else {
    console.log(`\n✅ Общая сумма средств сохранена (изменение: ${totalDiff.toFixed(6)} TON)`);
  }
  
  // Проверяем транзакции
  const { data: recentTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log(`\nПоследние TON транзакции:`);
  if (recentTx && recentTx.length > 0) {
    recentTx.forEach(tx => {
      const date = new Date(tx.created_at).toLocaleString('ru-RU');
      console.log(`├── ${tx.type}: ${tx.amount} TON (${tx.status}) - ${date}`);
    });
  } else {
    console.log('└── Нет недавних транзакций');
  }
}

checkBoostResult();