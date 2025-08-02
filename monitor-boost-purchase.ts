import { supabase } from './core/supabaseClient';

async function monitorBoostPurchase() {
  const userId = '184';
  
  console.log('=== МОНИТОРИНГ ПОКУПКИ TON BOOST ===\n');
  console.log('📌 Инструкция:');
  console.log('1. Откройте приложение и перейдите в раздел TON Boost');
  console.log('2. Попробуйте купить пакет Starter Boost за 1 TON');
  console.log('3. Следите за изменениями в консоли\n');
  
  // Начальное состояние
  const { data: initialState } = await supabase
    .from('users')
    .select('balance_ton, ton_farming_balance')
    .eq('id', userId)
    .single();
    
  console.log('Начальное состояние:');
  console.log(`├── balance_ton: ${initialState.balance_ton} TON`);
  console.log(`└── ton_farming_balance: ${initialState.ton_farming_balance} TON`);
  console.log(`Общая сумма: ${parseFloat(initialState.balance_ton) + parseFloat(initialState.ton_farming_balance)} TON\n`);
  
  // Мониторинг изменений
  let checkCount = 0;
  const interval = setInterval(async () => {
    checkCount++;
    
    const { data: currentState } = await supabase
      .from('users')
      .select('balance_ton, ton_farming_balance, ton_boost_active, ton_boost_package')
      .eq('id', userId)
      .single();
      
    const balanceTonChanged = currentState.balance_ton !== initialState.balance_ton;
    const farmingBalanceChanged = currentState.ton_farming_balance !== initialState.ton_farming_balance;
    
    if (balanceTonChanged || farmingBalanceChanged) {
      console.log(`\n⚠️ ОБНАРУЖЕНЫ ИЗМЕНЕНИЯ (проверка #${checkCount}):`);
      
      if (balanceTonChanged) {
        const diff = parseFloat(currentState.balance_ton) - parseFloat(initialState.balance_ton);
        console.log(`balance_ton: ${initialState.balance_ton} → ${currentState.balance_ton} (${diff > 0 ? '+' : ''}${diff.toFixed(6)} TON)`);
      }
      
      if (farmingBalanceChanged) {
        const diff = parseFloat(currentState.ton_farming_balance) - parseFloat(initialState.ton_farming_balance);
        console.log(`ton_farming_balance: ${initialState.ton_farming_balance} → ${currentState.ton_farming_balance} (${diff > 0 ? '+' : ''}${diff.toFixed(6)} TON)`);
      }
      
      console.log(`\nТекущая общая сумма: ${parseFloat(currentState.balance_ton) + parseFloat(currentState.ton_farming_balance)} TON`);
      console.log(`Boost активен: ${currentState.ton_boost_active ? '✅' : '❌'}`);
      console.log(`Пакет: ${currentState.ton_boost_package || 'нет'}`);
      
      // Проверяем проблему
      const totalBefore = parseFloat(initialState.balance_ton) + parseFloat(initialState.ton_farming_balance);
      const totalAfter = parseFloat(currentState.balance_ton) + parseFloat(currentState.ton_farming_balance);
      const totalDiff = totalAfter - totalBefore;
      
      if (Math.abs(totalDiff) > 0.01) { // Допускаем погрешность в 0.01 TON
        console.log(`\n❌ ПРОБЛЕМА: Общая сумма изменилась на ${totalDiff.toFixed(6)} TON!`);
        console.log('Это может указывать на дублирование или потерю средств!');
      } else {
        console.log(`\n✅ Общая сумма сохранена (изменение: ${totalDiff.toFixed(6)} TON)`);
      }
      
      clearInterval(interval);
      console.log('\n\n=== МОНИТОРИНГ ЗАВЕРШЕН ===');
    } else if (checkCount % 10 === 0) {
      console.log(`Проверка #${checkCount}: изменений нет...`);
    }
  }, 1000);
  
  // Остановка через 2 минуты
  setTimeout(() => {
    clearInterval(interval);
    console.log('\n\nМониторинг остановлен по таймауту (2 минуты)');
  }, 120000);
}

monitorBoostPurchase();