/**
 * SQL проверки для финальной верификации TON Boost
 * Технический аудитор системы
 */

import { supabase } from './core/supabase.js';

async function runSQLChecks() {
  console.log('=== SQL ПРОВЕРКИ TON BOOST ===');
  console.log('Дата:', new Date().toISOString());
  console.log('\n');

  // 1. Проверка накопления для User 74
  console.log('🔍 1. ДЕТАЛЬНАЯ ПРОВЕРКА USER 74');
  console.log('=' .repeat(50));
  
  // Все транзакции покупок user 74
  const { data: user74Purchases, error: e1 } = await supabase
    .from('transactions')
    .select('id, created_at, amount, amount_ton, description, metadata')
    .eq('user_id', 74)
    .eq('type', 'BOOST_PURCHASE')
    .order('created_at');

  if (!e1 && user74Purchases) {
    console.log(`\nВсе покупки User 74 (${user74Purchases.length} транзакций):`);
    
    let runningTotal = 0;
    let prevBalance = 0;
    
    for (const tx of user74Purchases) {
      const amount = parseFloat(tx.amount_ton || tx.amount || '0');
      runningTotal += amount;
      
      console.log(`\n${tx.created_at}:`);
      console.log(`  ID: ${tx.id}`);
      console.log(`  Сумма: ${amount} TON`);
      console.log(`  Накопленная сумма: ${prevBalance} + ${amount} = ${runningTotal} TON`);
      
      // Проверяем metadata
      if (tx.metadata) {
        try {
          const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
          console.log(`  Package ID: ${meta.boost_package_id}`);
          console.log(`  Накопление должно работать: ${prevBalance > 0 ? 'ДА' : 'НЕТ (первая покупка)'}`);
        } catch (e) {
          console.log(`  ⚠️ Ошибка metadata`);
        }
      }
      
      prevBalance = runningTotal;
    }
    
    console.log(`\n📊 ИТОГО куплено: ${runningTotal} TON`);
    
    // Проверяем текущий farming_balance
    const { data: currentData } = await supabase
      .from('ton_farming_data')
      .select('farming_balance')
      .eq('user_id', 74)
      .single();
    
    if (currentData) {
      console.log(`📊 Текущий farming_balance: ${currentData.farming_balance} TON`);
      console.log(`❗ Разница: ${currentData.farming_balance} - ${runningTotal} = ${parseFloat(currentData.farming_balance) - runningTotal} TON`);
    }
  }

  // 2. Проверка начислений дохода
  console.log('\n\n🔍 2. ПРОВЕРКА РАСЧЕТА ДОХОДА');
  console.log('=' .repeat(50));
  
  // Последние начисления для user 74
  const { data: recentIncomes, error: e2 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .like('description', '%TON Boost%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!e2 && recentIncomes) {
    console.log(`\nПоследние 10 начислений дохода:`);
    
    for (const income of recentIncomes) {
      const amount = parseFloat(income.amount_ton || income.amount || '0');
      console.log(`\n${income.created_at}:`);
      console.log(`  Сумма: ${amount} TON`);
      console.log(`  Описание: ${income.description}`);
      
      // Извлекаем данные из описания
      const packageMatch = income.description.match(/пакет (\d+)/);
      if (packageMatch) {
        console.log(`  Package ID из описания: ${packageMatch[1]}`);
      }
    }
    
    // Рассчитываем средний доход
    if (recentIncomes.length > 0) {
      const totalIncome = recentIncomes.reduce((sum, tx) => 
        sum + parseFloat(tx.amount_ton || tx.amount || '0'), 0
      );
      console.log(`\n📊 Средний доход за транзакцию: ${(totalIncome / recentIncomes.length).toFixed(6)} TON`);
    }
  }

  // 3. Проверка metadata ошибок
  console.log('\n\n🔍 3. АНАЛИЗ METADATA ОШИБОК');
  console.log('=' .repeat(50));
  
  // Получаем примеры проблемных metadata
  const { data: metadataIssues, error: e3 } = await supabase
    .rpc('check_invalid_json_metadata');

  if (e3) {
    console.log('⚠️ Не удалось выполнить RPC, проверяем вручную...');
    
    // Альтернативный метод
    const { data: txWithMeta } = await supabase
      .from('transactions')
      .select('id, metadata')
      .not('metadata', 'is', null)
      .limit(100);
    
    if (txWithMeta) {
      const issues = [];
      for (const tx of txWithMeta) {
        try {
          if (typeof tx.metadata === 'string' && tx.metadata.trim() !== '') {
            JSON.parse(tx.metadata);
          }
        } catch (e) {
          issues.push({ id: tx.id, error: e.message, sample: tx.metadata.substring(0, 50) });
        }
      }
      
      if (issues.length > 0) {
        console.log(`\n❌ Найдено ${issues.length} транзакций с невалидным JSON:`);
        issues.slice(0, 5).forEach(issue => {
          console.log(`  TX ${issue.id}: ${issue.sample}... (${issue.error})`);
        });
      } else {
        console.log('✅ Все metadata валидны');
      }
    }
  }

  // 4. Проверка всех пользователей с расхождениями
  console.log('\n\n🔍 4. ПОЛЬЗОВАТЕЛИ С РАСХОЖДЕНИЯМИ');
  console.log('=' .repeat(50));
  
  // Получаем всех пользователей с активным фармингом
  const { data: allUsers, error: e4 } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance')
    .gt('farming_balance', 0)
    .order('user_id');

  if (!e4 && allUsers) {
    console.log(`\nПроверяем ${allUsers.length} пользователей с farming_balance > 0:`);
    
    const discrepancies = [];
    
    for (const user of allUsers) {
      // Считаем сумму покупок
      const { data: purchases } = await supabase
        .from('transactions')
        .select('amount, amount_ton')
        .eq('user_id', user.user_id)
        .eq('type', 'BOOST_PURCHASE');
      
      if (purchases) {
        const totalPurchased = purchases.reduce((sum, tx) => 
          sum + parseFloat(tx.amount_ton || tx.amount || '0'), 0
        );
        
        const farmingBalance = parseFloat(user.farming_balance);
        const diff = Math.abs(farmingBalance - totalPurchased);
        
        if (diff > 0.01) {
          discrepancies.push({
            user_id: user.user_id,
            farming_balance: farmingBalance,
            total_purchased: totalPurchased,
            difference: farmingBalance - totalPurchased
          });
        }
      }
    }
    
    if (discrepancies.length > 0) {
      console.log(`\n❌ Найдено ${discrepancies.length} пользователей с расхождениями:`);
      discrepancies.slice(0, 10).forEach(d => {
        console.log(`  User ${d.user_id}: farming=${d.farming_balance}, purchased=${d.total_purchased}, diff=${d.difference.toFixed(2)}`);
      });
    } else {
      console.log('✅ Все балансы соответствуют покупкам');
    }
  }

  // 5. Статистика по типам транзакций
  console.log('\n\n🔍 5. СТАТИСТИКА ПО ТИПАМ ТРАНЗАКЦИЙ');
  console.log('=' .repeat(50));
  
  const { data: txStats, error: e5 } = await supabase
    .from('transactions')
    .select('type')
    .in('type', ['BOOST_PURCHASE', 'FARMING_REWARD'])
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (!e5 && txStats) {
    const stats = txStats.reduce((acc, tx) => {
      acc[tx.type] = (acc[tx.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nТранзакции за последние 24 часа:');
    Object.entries(stats).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} транзакций`);
    });
  }

  console.log('\n=== КОНЕЦ SQL ПРОВЕРОК ===');
}

// Запускаем проверки
runSQLChecks()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Критическая ошибка:', err);
    process.exit(1);
  });