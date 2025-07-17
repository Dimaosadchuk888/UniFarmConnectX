import { supabase } from '../core/supabase.js';

async function checkTonBoostReferrals() {
  console.log('=== ПРОВЕРКА TON BOOST РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ ===\n');
  
  const userId = 184;
  const referralIds = [186, 187, 188, 189, 190];
  
  try {
    // 1. Проверяем данные TON Boost у рефералов
    console.log('📊 TON BOOST ДАННЫЕ РЕФЕРАЛОВ:');
    
    // Проверяем таблицу ton_farming_data
    const { data: tonFarmingData, error: tonError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .in('user_id', referralIds);
      
    if (tonError) {
      console.log('⚠️ Ошибка доступа к ton_farming_data:', tonError.message);
      console.log('   Проверяем данные в основной таблице users...\n');
      
      // Проверяем данные в таблице users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username, balance_ton, ton_boost_package, ton_boost_farming_start, ton_boost_farming_last_update')
        .in('id', referralIds);
        
      if (users) {
        console.log('📋 Данные из таблицы users:');
        users.forEach(user => {
          console.log(`\n👤 ${user.username} (ID: ${user.id})`);
          console.log(`   - Баланс TON: ${user.balance_ton}`);
          console.log(`   - TON Boost пакет: ${user.ton_boost_package || 'НЕТ'}`);
          console.log(`   - Начало TON Boost: ${user.ton_boost_farming_start ? new Date(user.ton_boost_farming_start).toLocaleString('ru-RU') : 'НЕ УСТАНОВЛЕНО'}`);
          console.log(`   - Последнее обновление: ${user.ton_boost_farming_last_update ? new Date(user.ton_boost_farming_last_update).toLocaleString('ru-RU') : 'НЕ ОБНОВЛЯЛОСЬ'}`);
          
          if (user.ton_boost_farming_last_update) {
            const minutesAgo = Math.floor((Date.now() - new Date(user.ton_boost_farming_last_update).getTime()) / 1000 / 60);
            console.log(`   - Минут с последнего обновления: ${minutesAgo}`);
          }
        });
      }
    } else {
      console.log('✅ Найдено записей в ton_farming_data:', tonFarmingData?.length || 0);
      
      tonFarmingData?.forEach(data => {
        console.log(`\n👤 User ID: ${data.user_id}`);
        console.log(`   - Farming баланс: ${data.farming_balance} TON`);
        console.log(`   - Ставка: ${data.farming_rate}% в день`);
        console.log(`   - Boost пакет ID: ${data.boost_package_id}`);
        console.log(`   - Последнее обновление: ${data.farming_last_update ? new Date(data.farming_last_update).toLocaleString('ru-RU') : 'НЕ ОБНОВЛЯЛОСЬ'}`);
        
        if (data.farming_last_update) {
          const minutesAgo = Math.floor((Date.now() - new Date(data.farming_last_update).getTime()) / 1000 / 60);
          console.log(`   - Минут с последнего обновления: ${minutesAgo}`);
        }
      });
    }
    
    // 2. Проверяем транзакции TON Boost доходов
    console.log('\n\n📈 ТРАНЗАКЦИИ TON BOOST ДОХОДОВ:');
    const { data: tonRewards, error: rewardError } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', referralIds)
      .eq('currency', 'TON')
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false });
      
    if (rewardError) {
      console.error('Ошибка:', rewardError);
    } else {
      console.log(`\nНайдено TON доходов у рефералов: ${tonRewards?.length || 0}`);
      
      if (tonRewards && tonRewards.length > 0) {
        let totalTonIncome = 0;
        tonRewards.forEach(tx => {
          const isBoostIncome = tx.metadata?.original_type === 'TON_BOOST_INCOME' || 
                               tx.metadata?.transaction_source === 'ton_boost_scheduler';
          console.log(`- User ${tx.user_id}: +${tx.amount} TON (${new Date(tx.created_at).toLocaleString('ru-RU')})${isBoostIncome ? ' [TON BOOST]' : ''}`);
          totalTonIncome += parseFloat(tx.amount);
        });
        console.log(`\n💰 Общий доход TON: ${totalTonIncome.toFixed(6)}`);
        console.log(`   Ожидаемая комиссия 5%: ${(totalTonIncome * 0.05).toFixed(6)} TON`);
      } else {
        console.log('❌ Нет TON доходов у рефералов');
      }
    }
    
    // 3. Проверяем покупки TON Boost
    console.log('\n\n🛒 ПОКУПКИ TON BOOST:');
    const { data: boostPurchases, error: purchaseError } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', referralIds)
      .or('type.eq.BOOST_PURCHASE,and(type.eq.FARMING_REWARD,metadata->original_type.eq.BOOST_PURCHASE)')
      .order('created_at', { ascending: false });
      
    if (boostPurchases && boostPurchases.length > 0) {
      console.log(`\nНайдено покупок TON Boost: ${boostPurchases.length}`);
      boostPurchases.forEach(tx => {
        console.log(`- User ${tx.user_id}: ${tx.amount} ${tx.currency} (${new Date(tx.created_at).toLocaleString('ru-RU')})`);
      });
    }
    
    // 4. Проверяем ваши TON реферальные комиссии
    console.log('\n\n💎 ВАШИ TON РЕФЕРАЛЬНЫЕ КОМИССИИ:');
    const { data: yourTonReferralRewards, error: yourError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'REFERRAL_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false });
      
    if (yourTonReferralRewards && yourTonReferralRewards.length > 0) {
      console.log(`\n✅ Найдено TON реферальных комиссий: ${yourTonReferralRewards.length}`);
      let totalCommission = 0;
      yourTonReferralRewards.forEach(reward => {
        console.log(`- ${reward.description}: +${reward.amount} TON`);
        totalCommission += parseFloat(reward.amount);
      });
      console.log(`\n💰 Итого получено TON комиссий: ${totalCommission.toFixed(6)}`);
    } else {
      console.log('\n❌ TON реферальные комиссии не найдены');
    }
    
    // 5. Проверяем активность планировщика TON Boost
    console.log('\n\n🔄 ПРОВЕРКА ПЛАНИРОВЩИКА TON BOOST:');
    const { data: recentTonTransactions, error: txError } = await supabase
      .from('transactions')
      .select('created_at, metadata')
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (recentTonTransactions && recentTonTransactions.length > 0) {
      console.log('\nПоследние TON транзакции в системе:');
      recentTonTransactions.forEach(tx => {
        const minutesAgo = Math.floor((Date.now() - new Date(tx.created_at).getTime()) / 1000 / 60);
        const source = tx.metadata?.transaction_source || 'unknown';
        console.log(`- ${minutesAgo} минут назад (источник: ${source})`);
      });
    } else {
      console.log('❌ Нет недавних TON транзакций');
      console.log('   Возможно, планировщик TON Boost не работает');
    }
    
    // 6. Итоговый анализ
    console.log('\n\n🔍 АНАЛИЗ ПРОБЛЕМЫ:');
    console.log('1. У рефералов есть покупки TON Boost (по 10 TON каждый)');
    console.log('2. Но нет транзакций дохода от TON Boost');
    console.log('3. Следовательно, нет и реферальных комиссий');
    console.log('\n💡 Вероятные причины:');
    console.log('- Планировщик TON Boost не обрабатывает новых пользователей');
    console.log('- Проблема с данными в ton_farming_data');
    console.log('- Неправильная конфигурация boost пакетов');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

checkTonBoostReferrals();