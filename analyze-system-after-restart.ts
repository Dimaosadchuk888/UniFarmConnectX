import { supabase } from './core/supabase';

async function analyzeSystemAfterRestart() {
  console.log('=== АНАЛИЗ СИСТЕМЫ ПОСЛЕ ПЕРЕЗАПУСКА ===\n');
  console.log(`Время анализа: ${new Date().toLocaleString()}\n`);

  try {
    // 1. Проверяем последние начисления
    console.log('📊 1. ПОСЛЕДНИЕ НАЧИСЛЕНИЯ TON BOOST:\n');
    
    const { data: rewards, error: rewardError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!rewardError && rewards) {
      const now = new Date();
      const lastReward = rewards[0];
      const timeSinceLastReward = lastReward 
        ? (now.getTime() - new Date(lastReward.created_at).getTime()) / 60000
        : 999;

      console.log(`Последнее начисление: ${timeSinceLastReward.toFixed(1)} минут назад`);
      
      if (timeSinceLastReward > 10) {
        console.log('⚠️  Планировщик НЕ работает (должен запускаться каждые 5 минут)');
      } else {
        console.log('✅ Планировщик работает');
      }

      // Анализируем суммы начислений
      if (rewards.length > 1) {
        const user74Rewards = rewards.filter(r => r.user_id === 74);
        if (user74Rewards.length > 0) {
          console.log(`\nНачисления пользователя 74:`);
          user74Rewards.slice(0, 3).forEach(r => {
            console.log(`  ${new Date(r.created_at).toLocaleString()}: +${r.amount} TON`);
          });
          
          // Проверяем сумму начисления
          const amount = parseFloat(user74Rewards[0].amount);
          if (amount > 0.01) {
            console.log(`\n❌ СУММА ЗАВЫШЕНА: ${amount} TON за 5 минут`);
            console.log(`   Это указывает на расчет от всего баланса!`);
          }
        }
      }
    }

    // 2. Проверяем состояние ton_farming_data для пользователя 74
    console.log('\n📋 2. СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ 74:\n');
    
    const { data: user74Data, error: user74Error } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', 74)
      .single();

    if (!user74Error && user74Data) {
      console.log(`farming_balance: ${user74Data.farming_balance} TON ${user74Data.farming_balance > 0 ? '✅' : '❌'}`);
      console.log(`boost_active: ${user74Data.boost_active}`);
      console.log(`boost_package_id: ${user74Data.boost_package_id}`);
      console.log(`farming_rate: ${user74Data.farming_rate}%`);
      console.log(`updated_at: ${new Date(user74Data.updated_at).toLocaleString()}`);
      
      if (parseFloat(user74Data.farming_balance) === 0) {
        console.log('\n⚠️  farming_balance = 0, это означает:');
        console.log('   - Изменения НЕ применились ИЛИ');
        console.log('   - Новых покупок после перезапуска не было');
      }
    }

    // 3. Проверяем данные из users таблицы
    console.log('\n🔍 3. ДАННЫЕ ИЗ ТАБЛИЦЫ USERS:\n');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, balance_ton, ton_boost_active, ton_boost_package_id, ton_farming_balance')
      .eq('id', 74)
      .single();

    if (!userError && userData) {
      console.log(`balance_ton: ${userData.balance_ton} TON`);
      console.log(`ton_boost_active: ${userData.ton_boost_active}`);
      console.log(`ton_boost_package_id: ${userData.ton_boost_package_id}`);
      console.log(`ton_farming_balance: ${userData.ton_farming_balance || 'NULL'}`);
    }

    // 4. Проверяем метаданные транзакций
    console.log('\n💾 4. ПРОВЕРКА METADATA В ТРАНЗАКЦИЯХ:\n');
    
    const { data: lastPurchase, error: purchaseError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'BOOST_PURCHASE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!purchaseError && lastPurchase) {
      console.log(`Последняя покупка: ${new Date(lastPurchase.created_at).toLocaleString()}`);
      console.log(`Сумма: ${lastPurchase.amount} TON`);
      
      if (lastPurchase.metadata) {
        console.log('✅ Metadata присутствует');
        const metadata = typeof lastPurchase.metadata === 'string' 
          ? JSON.parse(lastPurchase.metadata) 
          : lastPurchase.metadata;
        console.log('Содержимое:', JSON.stringify(metadata, null, 2));
      } else {
        console.log('❌ Metadata отсутствует');
      }
    }

    // 5. Проверяем исходный код
    console.log('\n📄 5. ПРОВЕРКА ИСХОДНОГО КОДА:\n');
    
    // Читаем ключевые файлы чтобы убедиться что изменения на месте
    console.log('Проверяем наличие изменений в файлах:');
    console.log('  - modules/boost/TonFarmingRepository.ts (activateBoost)');
    console.log('  - modules/boost/service.ts (purchaseBoost)');
    console.log('  - modules/scheduler/tonBoostIncomeScheduler.ts');

    // 6. Итоговый диагноз
    console.log('\n🏁 6. ИТОГОВЫЙ ДИАГНОЗ:\n');
    
    const problems = [];
    
    if (user74Data && parseFloat(user74Data.farming_balance) === 0) {
      problems.push('farming_balance = 0 для пользователя 74');
    }
    
    if (timeSinceLastReward > 10) {
      problems.push('Планировщик не работает');
    }
    
    if (rewards && rewards.length > 0) {
      const lastAmount = parseFloat(rewards[0].amount);
      if (lastAmount > 0.01) {
        problems.push('Суммы начислений завышены');
      }
    }
    
    if (!lastPurchase || !lastPurchase.metadata) {
      problems.push('Metadata не сохраняется в транзакциях');
    }
    
    if (problems.length === 0) {
      console.log('✅ Система работает корректно после перезапуска!');
    } else {
      console.log('❌ Обнаружены проблемы:');
      problems.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
      
      console.log('\n📌 Вероятная причина:');
      console.log('   Изменения в коде НЕ применились при перезапуске.');
      console.log('   Сервер загрузил старую версию файлов.');
    }

  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  }
}

analyzeSystemAfterRestart();