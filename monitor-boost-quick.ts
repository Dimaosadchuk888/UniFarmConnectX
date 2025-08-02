import { supabase } from './core/supabaseClient';

async function quickMonitor() {
  const userId = '184';
  
  console.log('=== БЫСТРЫЙ МОНИТОРИНГ TON BOOST ===\n');
  
  // Начальное состояние
  const { data: before } = await supabase
    .from('users')
    .select('balance_ton, ton_farming_balance')
    .eq('id', userId)
    .single();
    
  console.log('ДО ПОКУПКИ:');
  console.log(`├── balance_ton: ${before.balance_ton} TON`);
  console.log(`├── ton_farming_balance: ${before.ton_farming_balance} TON`);
  console.log(`└── ИТОГО: ${parseFloat(before.balance_ton) + parseFloat(before.ton_farming_balance)} TON\n`);
  
  console.log('⚠️  ТЕПЕРЬ КУПИТЕ BOOST ПАКЕТ В ПРИЛОЖЕНИИ!\n');
  console.log('Ожидание изменений...');
  
  // Проверка каждую секунду
  let found = false;
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: after } = await supabase
      .from('users')
      .select('balance_ton, ton_farming_balance, ton_boost_active, ton_boost_package')
      .eq('id', userId)
      .single();
      
    if (after.balance_ton !== before.balance_ton || after.ton_farming_balance !== before.ton_farming_balance) {
      console.log(`\n✅ ОБНАРУЖЕНЫ ИЗМЕНЕНИЯ (через ${i} сек):\n`);
      
      console.log('ПОСЛЕ ПОКУПКИ:');
      console.log(`├── balance_ton: ${before.balance_ton} → ${after.balance_ton} (${parseFloat(after.balance_ton) - parseFloat(before.balance_ton)} TON)`);
      console.log(`├── ton_farming_balance: ${before.ton_farming_balance} → ${after.ton_farming_balance} (${parseFloat(after.ton_farming_balance) - parseFloat(before.ton_farming_balance)} TON)`);
      console.log(`├── ton_boost_active: ${after.ton_boost_active ? '✅' : '❌'}`);
      console.log(`├── ton_boost_package: ${after.ton_boost_package || 'нет'}`);
      console.log(`└── ИТОГО: ${parseFloat(after.balance_ton) + parseFloat(after.ton_farming_balance)} TON`);
      
      const totalDiff = (parseFloat(after.balance_ton) + parseFloat(after.ton_farming_balance)) - (parseFloat(before.balance_ton) + parseFloat(before.ton_farming_balance));
      
      console.log(`\n📊 АНАЛИЗ:`);
      if (Math.abs(totalDiff) > 0.01) {
        console.log(`❌ ПРОБЛЕМА: Общая сумма изменилась на ${totalDiff.toFixed(6)} TON!`);
      } else {
        console.log(`✅ Общая сумма сохранена (изменение: ${totalDiff.toFixed(6)} TON)`);
      }
      
      // Анализ проблемы
      if (parseFloat(after.balance_ton) < 1 && parseFloat(before.balance_ton) > 50) {
        console.log(`\n⚠️  ОБНАРУЖЕНА ПРОБЛЕМА: Весь баланс (${before.balance_ton} TON) переместился в farming!`);
        console.log(`Вместо списания только стоимости пакета (1-10 TON), был перемещен весь баланс.`);
      }
      
      found = true;
      break;
    }
    
    if (i % 5 === 0 && i > 0) {
      process.stdout.write('.');
    }
  }
  
  if (!found) {
    console.log('\n\nИзменений не обнаружено за 60 секунд.');
  }
  
  process.exit(0);
}

quickMonitor();