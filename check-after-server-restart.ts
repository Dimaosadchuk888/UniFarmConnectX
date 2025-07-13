import { supabase } from './core/supabase';

async function checkAfterServerRestart() {
  console.log('=== ПРОВЕРКА ПОСЛЕ ПЕРЕЗАПУСКА СЕРВЕРА ===\n');
  console.log(`Время проверки: ${new Date().toLocaleString()}\n`);

  try {
    // 1. Проверяем последние начисления TON Boost
    console.log('🕐 1. ПОСЛЕДНИЕ НАЧИСЛЕНИЯ TON BOOST:\n');
    
    const { data: lastRewards, error: rewardError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(5);

    if (rewardError) {
      console.error('❌ Ошибка получения начислений:', rewardError.message);
    } else if (lastRewards && lastRewards.length > 0) {
      const serverRestartTime = new Date('2025-07-13T15:08:00'); // Примерное время перезапуска
      
      console.log('Начисления после перезапуска:\n');
      
      let hasNewRewards = false;
      for (const reward of lastRewards) {
        const rewardTime = new Date(reward.created_at);
        const isAfterRestart = rewardTime > serverRestartTime;
        
        if (isAfterRestart) {
          hasNewRewards = true;
          console.log(`✅ НОВОЕ начисление после перезапуска:`);
        } else {
          console.log(`⏱️  Старое начисление до перезапуска:`);
        }
        
        console.log(`  Время: ${rewardTime.toLocaleString()}`);
        console.log(`  User ${reward.user_id}: +${reward.amount} TON`);
        console.log(`  Описание: ${reward.description}`);
        
        if (reward.metadata) {
          const metadata = typeof reward.metadata === 'string' ? JSON.parse(reward.metadata) : reward.metadata;
          if (metadata.deposit_amount !== undefined) {
            console.log(`  📊 Депозит в metadata: ${metadata.deposit_amount} TON`);
          }
          if (metadata.calculation_details) {
            console.log(`  📐 Детали расчета:`, metadata.calculation_details);
          }
        }
        console.log('  ---');
      }
      
      if (!hasNewRewards) {
        console.log('\n⚠️  НЕТ НОВЫХ НАЧИСЛЕНИЙ после перезапуска!');
        console.log('   Возможно планировщик еще не запустился (ждет 5 минут)');
      }
    }

    // 2. Проверяем текущее состояние ton_farming_data
    console.log('\n📊 2. СОСТОЯНИЕ TON_FARMING_DATA:\n');
    
    const { data: tonData, error: tonError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('boost_active', true)
      .order('farming_balance', { ascending: false });

    if (tonError) {
      console.error('❌ Ошибка получения ton_farming_data:', tonError.message);
    } else if (tonData && tonData.length > 0) {
      console.log(`Активных пользователей: ${tonData.length}\n`);
      
      let usersWithBalance = 0;
      for (const user of tonData) {
        const balance = parseFloat(user.farming_balance || '0');
        if (balance > 0) usersWithBalance++;
        
        const status = balance > 0 ? '✅' : '❌';
        console.log(`User ${user.user_id}: ${balance} TON ${status} (пакет ${user.boost_package_id})`);
        
        if (user.user_id === '74') {
          console.log(`  Последнее обновление: ${new Date(user.updated_at).toLocaleString()}`);
        }
      }
      
      console.log(`\n📈 Пользователей с балансом: ${usersWithBalance}/${tonData.length}`);
    }

    // 3. Проверяем новые покупки после перезапуска
    console.log('\n🛒 3. НОВЫЕ ПОКУПКИ ПОСЛЕ ПЕРЕЗАПУСКА:\n');
    
    const { data: newPurchases, error: purchaseError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'BOOST_PURCHASE')
      .gt('created_at', '2025-07-13T15:08:00')
      .order('created_at', { ascending: false });

    if (purchaseError) {
      console.error('❌ Ошибка получения покупок:', purchaseError.message);
    } else if (newPurchases && newPurchases.length > 0) {
      console.log(`✅ Найдено новых покупок: ${newPurchases.length}\n`);
      
      for (const purchase of newPurchases) {
        console.log(`User ${purchase.user_id}: ${purchase.amount} TON`);
        console.log(`  Время: ${new Date(purchase.created_at).toLocaleString()}`);
        console.log(`  Описание: ${purchase.description}`);
        
        // Проверяем обновился ли farming_balance для этого пользователя
        const { data: userData } = await supabase
          .from('ton_farming_data')
          .select('farming_balance')
          .eq('user_id', purchase.user_id)
          .single();
          
        if (userData) {
          const balance = parseFloat(userData.farming_balance || '0');
          if (balance > 0) {
            console.log(`  ✅ farming_balance обновлен: ${balance} TON`);
          } else {
            console.log(`  ❌ farming_balance НЕ обновлен: 0 TON`);
          }
        }
        console.log('  ---');
      }
    } else {
      console.log('Новых покупок после перезапуска не найдено');
    }

    // 4. Проверяем логи сервера (если доступны)
    console.log('\n🔍 4. АНАЛИЗ ПРИМЕНЕНИЯ ИЗМЕНЕНИЙ:\n');
    
    // Проверяем есть ли изменения в коде
    const codeCheck = {
      'TonFarmingRepository.activateBoost': 'должен обновлять farming_balance',
      'BoostService.purchaseBoost': 'должен передавать depositAmount',
      'tonBoostIncomeScheduler': 'должен использовать farming_balance'
    };
    
    console.log('Ожидаемые изменения в коде:');
    for (const [file, expected] of Object.entries(codeCheck)) {
      console.log(`  ${file}: ${expected}`);
    }
    
    // 5. Итоговый анализ
    console.log('\n📋 5. ИТОГОВЫЙ АНАЛИЗ:\n');
    
    const issues = [];
    
    if (tonData && tonData.every(u => parseFloat(u.farming_balance || '0') === 0)) {
      issues.push('❌ ВСЕ farming_balance = 0 (изменения НЕ применились)');
    }
    
    if (!hasNewRewards) {
      issues.push('⚠️  Нет новых начислений после перезапуска');
    }
    
    if (issues.length > 0) {
      console.log('Обнаруженные проблемы:');
      issues.forEach(issue => console.log(`  ${issue}`));
      
      console.log('\nВозможные причины:');
      console.log('  1. Изменения в коде не сохранились');
      console.log('  2. Сервер загрузил старую версию кода');
      console.log('  3. Кеш не очистился при перезапуске');
      console.log('  4. Планировщик еще не запустился (ждет 5 минут)');
    } else {
      console.log('✅ Изменения применились успешно!');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

checkAfterServerRestart();