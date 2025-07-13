import { supabase } from './core/supabase';

async function checkSchedulerStatus() {
  console.log('=== ПРОВЕРКА СТАТУСА ПЛАНИРОВЩИКОВ ===\n');
  
  try {
    // 1. Проверяем последние транзакции UNI farming
    console.log('1. ПОСЛЕДНИЕ UNI FARMING ТРАНЗАКЦИИ:\n');
    
    const { data: uniFarmingTx, error: uniError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!uniError && uniFarmingTx && uniFarmingTx.length > 0) {
      const lastTx = uniFarmingTx[0];
      const now = new Date();
      const lastTime = new Date(lastTx.created_at);
      const diffMinutes = (now.getTime() - lastTime.getTime()) / 60000;
      
      console.log(`Последняя транзакция: ${diffMinutes.toFixed(1)} минут назад`);
      console.log(`Время: ${lastTime.toLocaleString()}`);
      console.log(`Сумма: ${lastTx.amount} UNI`);
      
      if (diffMinutes > 10) {
        console.log('❌ UNI Farming планировщик НЕ работает!\n');
      } else {
        console.log('✅ UNI Farming планировщик работает\n');
      }
    } else {
      console.log('❌ Нет транзакций UNI farming\n');
    }

    // 2. Проверяем последние транзакции TON Boost
    console.log('2. ПОСЛЕДНИЕ TON BOOST ТРАНЗАКЦИИ:\n');
    
    const { data: tonBoostTx, error: tonError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!tonError && tonBoostTx && tonBoostTx.length > 0) {
      const lastTx = tonBoostTx[0];
      const now = new Date();
      const lastTime = new Date(lastTx.created_at);
      const diffMinutes = (now.getTime() - lastTime.getTime()) / 60000;
      
      console.log(`Последняя транзакция: ${diffMinutes.toFixed(1)} минут назад`);
      console.log(`Время: ${lastTime.toLocaleString()}`);
      console.log(`Сумма: ${lastTx.amount} TON`);
      console.log(`User ID: ${lastTx.user_id}`);
      
      if (diffMinutes > 10) {
        console.log('❌ TON Boost планировщик НЕ работает!\n');
      } else {
        console.log('✅ TON Boost планировщик работает\n');
      }
    } else {
      console.log('❌ Нет транзакций TON Boost\n');
    }

    // 3. Проверяем конфигурацию
    console.log('3. КОНФИГУРАЦИЯ:\n');
    
    console.log('Планировщики должны запускаться:');
    console.log('- При старте сервера в server/index.ts');
    console.log('- Строки 942-955 содержат код запуска');
    console.log('- farmingScheduler.start() и tonBoostIncomeScheduler.start()');
    console.log('- Используется node-cron для UNI и setInterval для TON');
    
    console.log('\n4. ДИАГНОЗ:\n');
    console.log('Если планировщики не работают после перезапуска:');
    console.log('1) Проверьте логи сервера на ошибки при старте');
    console.log('2) Убедитесь что процесс node работает');
    console.log('3) Проверьте что cron jobs зарегистрированы');
    console.log('4) Возможно требуется полный рестарт приложения');

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

checkSchedulerStatus();