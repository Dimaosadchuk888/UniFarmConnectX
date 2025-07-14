import { supabase } from '../core/supabase';

async function checkTonReferralDeep() {
  console.log('=== ГЛУБОКОЕ ИССЛЕДОВАНИЕ TON РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ ===\n');
  console.log('📊 Проверка работы партнерской программы с TON\n');
  
  try {
    // 1. Проверяем активных TON Boost пользователей
    console.log('1️⃣ АКТИВНЫЕ TON BOOST ПОЛЬЗОВАТЕЛИ:');
    console.log('━'.repeat(50));
    
    const { data: tonBoostUsers, error: tonError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .not('boost_package_id', 'is', null)
      .order('created_at', { ascending: false });
      
    if (tonError) {
      console.log('❌ Ошибка получения TON Boost:', tonError.message);
    } else {
      console.log(`✅ Найдено TON Boost пользователей: ${tonBoostUsers?.length || 0}`);
      
      if (tonBoostUsers && tonBoostUsers.length > 0) {
        console.log('\nАктивные TON Boost депозиты:');
        tonBoostUsers.slice(0, 5).forEach(boost => {
          console.log(`  - User ${boost.user_id}: пакет ${boost.boost_package_id}, депозит ${boost.farming_balance} TON`);
          console.log(`    Дата: ${new Date(boost.created_at).toLocaleString()}`);
        });
      }
    }
    
    // 2. Проверяем TON Boost пользователей с реферерами
    console.log('\n2️⃣ TON BOOST ПОЛЬЗОВАТЕЛИ С РЕФЕРЕРАМИ:');
    console.log('━'.repeat(50));
    
    // Сначала получаем всех TON Boost пользователей
    const tonUserIds = tonBoostUsers?.map(u => u.user_id) || [];
    
    if (tonUserIds.length > 0) {
      const { data: tonUsersWithReferrers, error: refError } = await supabase
        .from('users')
        .select('id, username, referred_by, balance_ton')
        .in('id', tonUserIds)
        .not('referred_by', 'is', null);
        
      if (refError) {
        console.log('❌ Ошибка получения пользователей:', refError.message);
      } else {
        console.log(`✅ TON Boost пользователей с реферерами: ${tonUsersWithReferrers?.length || 0}`);
        
        if (tonUsersWithReferrers && tonUsersWithReferrers.length > 0) {
          console.log('\nПримеры:');
          tonUsersWithReferrers.slice(0, 5).forEach(user => {
            const tonData = tonBoostUsers?.find(t => t.user_id === user.id);
            console.log(`  - User ${user.id} (${user.username})`);
            console.log(`    Реферер: ${user.referred_by}`);
            console.log(`    TON баланс: ${user.balance_ton}`);
            console.log(`    Boost депозит: ${tonData?.farming_balance || 0} TON`);
          });
        }
      }
    }
    
    // 3. Проверяем последние TON транзакции
    console.log('\n3️⃣ ПОСЛЕДНИЕ TON ТРАНЗАКЦИИ:');
    console.log('━'.repeat(50));
    
    const { data: tonTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (txError) {
      console.log('❌ Ошибка получения транзакций:', txError.message);
    } else {
      console.log(`✅ Найдено TON транзакций: ${tonTransactions?.length || 0}`);
      
      if (tonTransactions && tonTransactions.length > 0) {
        console.log('\nПоследние TON транзакции:');
        tonTransactions.slice(0, 5).forEach(tx => {
          console.log(`  - ${new Date(tx.created_at).toLocaleString()}: User ${tx.user_id}`);
          console.log(`    Тип: ${tx.type}, Сумма: ${tx.amount_ton || tx.amount} TON`);
          console.log(`    Описание: ${tx.description}`);
        });
      }
    }
    
    // 4. Проверяем TON Boost income транзакции
    console.log('\n4️⃣ TON BOOST INCOME ТРАНЗАКЦИИ:');
    console.log('━'.repeat(50));
    
    const { data: boostIncome, error: incomeError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .gt('amount_ton', 0)
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (incomeError) {
      console.log('❌ Ошибка получения income:', incomeError.message);
    } else {
      const tonBoostIncome = boostIncome?.filter(tx => 
        tx.metadata?.original_type === 'TON_BOOST_INCOME' ||
        tx.description?.includes('TON Boost')
      );
      
      console.log(`✅ Найдено TON Boost income транзакций: ${tonBoostIncome?.length || 0}`);
      
      if (tonBoostIncome && tonBoostIncome.length > 0) {
        console.log('\nПоследние TON Boost начисления:');
        tonBoostIncome.slice(0, 5).forEach(tx => {
          console.log(`  - ${new Date(tx.created_at).toLocaleString()}: User ${tx.user_id}`);
          console.log(`    Сумма: +${tx.amount_ton} TON`);
          console.log(`    Пакет: ${tx.metadata?.boost_package_id || '?'}`);
        });
      }
    }
    
    // 5. Проверяем реферальные TON награды
    console.log('\n5️⃣ РЕФЕРАЛЬНЫЕ TON НАГРАДЫ:');
    console.log('━'.repeat(50));
    
    const { data: tonReferralRewards, error: refRewardError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .gt('amount_ton', 0)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (refRewardError) {
      console.log('❌ Ошибка получения реферальных наград:', refRewardError.message);
    } else {
      console.log(`✅ Найдено TON реферальных наград: ${tonReferralRewards?.length || 0}`);
      
      if (tonReferralRewards && tonReferralRewards.length > 0) {
        console.log('\nРеферальные TON начисления:');
        tonReferralRewards.forEach(tx => {
          console.log(`  - ${new Date(tx.created_at).toLocaleString()}: User ${tx.user_id}`);
          console.log(`    Сумма: +${tx.amount_ton} TON`);
          console.log(`    Уровень: ${tx.metadata?.level || '?'}`);
          console.log(`    От источника: ${tx.metadata?.sourceUserId || '?'}`);
        });
      } else {
        console.log('⚠️ TON реферальных наград пока нет');
      }
    }
    
    // 6. Проверяем планировщик TON Boost
    console.log('\n6️⃣ АНАЛИЗ РАБОТЫ ПЛАНИРОВЩИКА TON BOOST:');
    console.log('━'.repeat(50));
    
    // Получаем последние логи планировщика из транзакций
    const { data: recentTonBoostTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .gt('amount_ton', 0)
      .like('description', '%TON Boost%')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (recentTonBoostTx && recentTonBoostTx.length > 0) {
      const lastTx = recentTonBoostTx[0];
      const timeSinceLastTx = Date.now() - new Date(lastTx.created_at).getTime();
      const minutesSinceLastTx = Math.floor(timeSinceLastTx / 1000 / 60);
      
      console.log(`✅ Планировщик работает!`);
      console.log(`   - Последнее начисление: ${minutesSinceLastTx} минут назад`);
      console.log(`   - Ожидаемый интервал: 5 минут`);
      
      if (minutesSinceLastTx > 10) {
        console.log('⚠️ Возможно планировщик остановлен (>10 минут без начислений)');
      }
    } else {
      console.log('❌ Нет транзакций от планировщика TON Boost');
    }
    
    // 7. Итоговая статистика
    console.log('\n7️⃣ ИТОГОВАЯ СТАТИСТИКА TON:');
    console.log('━'.repeat(50));
    
    // Считаем общие суммы
    const totalTonBoostUsers = tonBoostUsers?.length || 0;
    const totalTonDeposits = tonBoostUsers?.reduce((sum, u) => sum + parseFloat(u.farming_balance || '0'), 0) || 0;
    const totalTonIncome = boostIncome?.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0) || 0;
    const totalTonReferralRewards = tonReferralRewards?.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0) || 0;
    
    console.log(`📊 TON Boost пользователей: ${totalTonBoostUsers}`);
    console.log(`💰 Общая сумма депозитов: ${totalTonDeposits.toFixed(2)} TON`);
    console.log(`📈 Общий доход начислен: ${totalTonIncome.toFixed(6)} TON`);
    console.log(`🤝 Реферальных наград: ${totalTonReferralRewards.toFixed(6)} TON`);
    
    // Проверяем работоспособность
    console.log('\n📋 ЗАКЛЮЧЕНИЕ ПО TON:');
    console.log('━'.repeat(50));
    
    const hasTonBoostUsers = totalTonBoostUsers > 0;
    const hasTonIncome = totalTonIncome > 0;
    const isSchedulerWorking = recentTonBoostTx && recentTonBoostTx.length > 0;
    
    if (hasTonBoostUsers && hasTonIncome && isSchedulerWorking) {
      console.log('✅ TON Boost система работает корректно!');
      console.log('   - Есть активные пользователи с депозитами');
      console.log('   - Планировщик начисляет доход');
      console.log('   - Транзакции создаются регулярно');
      
      if (totalTonReferralRewards === 0) {
        console.log('\n⚠️ Реферальные TON награды = 0, потому что:');
        console.log('   - Большинство TON Boost пользователей не имеют рефереров');
        console.log('   - Или доход еще слишком мал для заметных реферальных выплат');
      }
    } else {
      console.log('⚠️ Обнаружены проблемы с TON Boost:');
      if (!hasTonBoostUsers) console.log('   - Нет активных пользователей');
      if (!hasTonIncome) console.log('   - Нет начислений дохода');
      if (!isSchedulerWorking) console.log('   - Планировщик не работает');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем проверку
checkTonReferralDeep()
  .then(() => {
    console.log('\n✅ Исследование завершено');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка выполнения:', error);
    process.exit(1);
  });