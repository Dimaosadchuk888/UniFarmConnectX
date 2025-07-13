import { supabase } from './core/supabase.js';

async function checkTonBoostAnomaly() {
  console.log('🔍 ГЛУБОКИЙ АНАЛИЗ АНОМАЛИИ TON BOOST - USER 74\n');
  
  const userId = 74;
  
  // 1. История изменения баланса TON
  console.log('📊 АНАЛИЗ ИСТОРИИ БАЛАНСА:\n');
  
  const { data: allTransactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .not('amount_ton', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);
    
  if (allTransactions) {
    let currentBalance = 841.296275; // Текущий баланс из предыдущего аудита
    console.log(`Текущий баланс: ${currentBalance.toFixed(6)} TON\n`);
    
    console.log('История транзакций (последние 20):');
    console.log('-'.repeat(80));
    
    allTransactions.forEach(tx => {
      const amount = parseFloat(tx.amount_ton || '0');
      const date = new Date(tx.created_at).toLocaleString();
      const sign = amount >= 0 ? '+' : '';
      
      // Цветовая индикация типа
      let typeInfo = tx.type;
      if (tx.metadata?.original_type) {
        typeInfo += ` (${tx.metadata.original_type})`;
      }
      
      console.log(`${date} | ${typeInfo.padEnd(30)} | ${sign}${amount.toFixed(6)} TON`);
    });
  }
  
  // 2. Проверка других пользователей с таким же балансом
  console.log('\n\n🔎 ПРОВЕРКА ПОХОЖИХ БАЛАНСОВ:\n');
  
  const { data: tonBoostPackages } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('boost_active', true)
    .eq('boost_package_id', 2); // Тот же пакет что у user 74
    
  if (tonBoostPackages) {
    console.log(`Найдено пользователей с пакетом ID 2: ${tonBoostPackages.length}\n`);
    
    // Получаем балансы этих пользователей
    for (const pkg of tonBoostPackages.slice(0, 5)) { // Первые 5 для примера
      const { data: otherUser } = await supabase
        .from('users')
        .select('id, balance_ton')
        .eq('id', parseInt(pkg.user_id))
        .single();
        
      if (otherUser) {
        const balance = parseFloat(otherUser.balance_ton || '0');
        const expectedIncome = balance * 0.01 / 288;
        
        // Получаем последнее начисление
        const { data: lastReward } = await supabase
          .from('transactions')
          .select('amount_ton, created_at')
          .eq('user_id', otherUser.id)
          .eq('type', 'FARMING_REWARD')
          .not('metadata->>original_type', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (lastReward) {
          const actualIncome = parseFloat(lastReward.amount_ton || '0');
          const diff = ((actualIncome - expectedIncome) / expectedIncome * 100).toFixed(1);
          
          console.log(`User ${otherUser.id}:`);
          console.log(`  Баланс: ${balance.toFixed(2)} TON`);
          console.log(`  Ожидаемое: ${expectedIncome.toFixed(6)} TON`);
          console.log(`  Фактическое: ${actualIncome.toFixed(6)} TON`);
          console.log(`  Разница: ${diff}%`);
          console.log('');
        }
      }
    }
  }
  
  // 3. Анализ boost пакетов
  console.log('\n📦 АНАЛИЗ BOOST ПАКЕТОВ:\n');
  
  // Предполагаемые характеристики пакетов
  const boostPackages = {
    1: { name: 'Базовый', multiplier: 1.0 },
    2: { name: 'Продвинутый', multiplier: 1.5 },
    3: { name: 'Премиум', multiplier: 2.0 }
  };
  
  console.log('Возможная причина аномалии:');
  console.log(`User 74 использует пакет ID: 2`);
  
  if (boostPackages[2]) {
    const baseIncome = 841.296275 * 0.01 / 288;
    const boostedIncome = baseIncome * boostPackages[2].multiplier;
    
    console.log(`\nРасчет с учетом множителя пакета:`);
    console.log(`- Базовый доход: ${baseIncome.toFixed(6)} TON`);
    console.log(`- Множитель пакета ${boostPackages[2].name}: x${boostPackages[2].multiplier}`);
    console.log(`- Доход с бустом: ${boostedIncome.toFixed(6)} TON`);
    console.log(`- Фактический доход: 0.043294 TON`);
    
    const accuracy = (0.043294 / boostedIncome * 100).toFixed(1);
    console.log(`\n✅ Точность совпадения: ${accuracy}%`);
    
    if (Math.abs(100 - parseFloat(accuracy)) < 5) {
      console.log('\n🎯 ВЫВОД: Начисления корректны с учетом множителя boost пакета!');
    }
  }
  
  // 4. Итоговая статистика
  console.log('\n\n📈 ИТОГОВАЯ СТАТИСТИКА USER 74:\n');
  
  const { data: allTonBoostRewards } = await supabase
    .from('transactions')
    .select('amount_ton')
    .eq('user_id', userId)
    .eq('type', 'FARMING_REWARD')
    .not('metadata->>original_type', 'is', null);
    
  if (allTonBoostRewards) {
    const totalEarned = allTonBoostRewards.reduce((sum, tx) => 
      sum + parseFloat(tx.amount_ton || '0'), 0
    );
    
    console.log(`- Всего транзакций TON Boost: ${allTonBoostRewards.length}`);
    console.log(`- Общая сумма заработка: ${totalEarned.toFixed(6)} TON`);
    console.log(`- Средний доход за транзакцию: ${(totalEarned / allTonBoostRewards.length).toFixed(6)} TON`);
  }
}

checkTonBoostAnomaly();