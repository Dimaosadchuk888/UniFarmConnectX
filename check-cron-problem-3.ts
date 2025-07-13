import { supabase } from './core/supabase';

async function investigateCronProblem3() {
  console.log("=== ИССЛЕДОВАНИЕ ПРОБЛЕМЫ №3: CRON планировщики ===\n");
  
  // 1. Проверяем последние транзакции для понимания работы планировщиков
  console.log("1. Анализ последних транзакций для определения активности планировщиков:");
  
  // Проверяем UNI farming транзакции
  console.log("\n   a) UNI Farming планировщик:");
  const { data: uniRewards, error: error1 } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'UNI')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (uniRewards && uniRewards.length > 0) {
    const latestUni = new Date(uniRewards[0].created_at);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - latestUni.getTime()) / 1000 / 60);
    
    console.log(`   - Последняя транзакция: ${latestUni.toLocaleString()}`);
    console.log(`   - Прошло минут: ${diffMinutes}`);
    console.log(`   - Статус: ${diffMinutes > 10 ? '⚠️ ВОЗМОЖНО НЕ РАБОТАЕТ' : '✅ РАБОТАЕТ'}`);
    
    // Анализируем интервалы между транзакциями
    if (uniRewards.length > 1) {
      console.log("\n   Интервалы между транзакциями:");
      for (let i = 0; i < uniRewards.length - 1; i++) {
        const time1 = new Date(uniRewards[i].created_at).getTime();
        const time2 = new Date(uniRewards[i + 1].created_at).getTime();
        const interval = Math.floor((time1 - time2) / 1000 / 60);
        console.log(`   - Интервал ${i + 1}: ${interval} минут`);
      }
    }
  } else {
    console.log("   - ❌ Транзакций не найдено!");
  }
  
  // Проверяем TON Boost транзакции
  console.log("\n   b) TON Boost планировщик:");
  const { data: tonRewards, error: error2 } = await supabase
    .from('transactions')
    .select('*')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(10);
    
  let tonBoostTransactions: any[] = [];
  if (tonRewards) {
    tonBoostTransactions = tonRewards.filter((tx: any) => 
      tx.metadata && 
      (tx.metadata.original_type === 'TON_BOOST_INCOME' || 
       tx.metadata.transaction_source === 'ton_boost_scheduler')
    );
    
    if (tonBoostTransactions.length > 0) {
      const latestTon = new Date(tonBoostTransactions[0].created_at);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - latestTon.getTime()) / 1000 / 60);
      
      console.log(`   - Последняя транзакция: ${latestTon.toLocaleString()}`);
      console.log(`   - Прошло минут: ${diffMinutes}`);
      console.log(`   - Статус: ${diffMinutes > 10 ? '⚠️ ВОЗМОЖНО НЕ РАБОТАЕТ' : '✅ РАБОТАЕТ'}`);
      
      // Анализируем интервалы
      if (tonBoostTransactions.length > 1) {
        console.log("\n   Интервалы между транзакциями:");
        for (let i = 0; i < Math.min(3, tonBoostTransactions.length - 1); i++) {
          const time1 = new Date(tonBoostTransactions[i].created_at).getTime();
          const time2 = new Date(tonBoostTransactions[i + 1].created_at).getTime();
          const interval = Math.floor((time1 - time2) / 1000 / 60);
          console.log(`   - Интервал ${i + 1}: ${interval} минут`);
        }
      }
    } else {
      console.log("   - ❌ TON Boost транзакций не найдено!");
    }
  }
  
  // 2. Проверяем активных пользователей
  console.log("\n\n2. Проверка активных пользователей для планировщиков:");
  
  // UNI farming активные пользователи
  console.log("\n   a) Активные UNI farmers:");
  const { data: activeUniFarmers, error: error3 } = await supabase
    .from('users')
    .select('id, telegram_id, uni_farming_active, uni_deposit_amount')
    .eq('uni_farming_active', true)
    .gt('uni_deposit_amount', 0);
    
  if (activeUniFarmers) {
    console.log(`   - Всего активных: ${activeUniFarmers.length}`);
    console.log(`   - Примеры: ${activeUniFarmers.slice(0, 3).map(u => `ID ${u.id}`).join(', ')}`);
  }
  
  // TON boost активные пользователи  
  console.log("\n   b) Активные TON boost пользователи:");
  const { data: activeTonUsers, error: error4 } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance, boost_package_id')
    .gt('farming_balance', 0)
    .not('boost_package_id', 'is', null);
    
  if (activeTonUsers) {
    console.log(`   - Всего активных: ${activeTonUsers.length}`);
    console.log(`   - Примеры: ${activeTonUsers.slice(0, 3).map(u => `User ${u.user_id}`).join(', ')}`);
  }
  
  // 3. Анализ паттернов обработки
  console.log("\n\n3. Анализ паттернов обработки:");
  
  // Проверяем обрабатываются ли все пользователи одновременно
  if (uniRewards && uniRewards.length > 0) {
    const latestTime = uniRewards[0].created_at;
    const { data: simultaneousUni } = await supabase
      .from('transactions')
      .select('user_id, created_at')
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .eq('created_at', latestTime);
      
    if (simultaneousUni) {
      console.log(`\n   UNI Farming - пользователей обработано в ${latestTime}:`);
      console.log(`   - Количество: ${simultaneousUni.length}`);
      console.log(`   - Это говорит о ${simultaneousUni.length > 1 ? 'BATCH обработке' : 'индивидуальной обработке'}`);
    }
  }
  
  console.log("\n\n=== ВЫВОДЫ ПО ПРОБЛЕМЕ №3 ===");
  console.log("1. Активность планировщиков: проверены последние транзакции и интервалы");
  console.log("2. Количество активных пользователей: подсчитано для обоих типов");
  console.log("3. Паттерн обработки: проанализирована batch vs индивидуальная обработка");
  
  process.exit(0);
}

investigateCronProblem3().catch(console.error);
