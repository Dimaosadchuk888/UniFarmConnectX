import { supabase } from '../core/supabase';

async function checkReferralSystemComplete() {
  console.log('=== ПОЛНАЯ ПРОВЕРКА РЕФЕРАЛЬНОЙ СИСТЕМЫ ===\n');
  console.log('📊 Чек-лист проверки по запросу пользователя\n');
  
  try {
    // 1. Проверяем таблицу referrals
    console.log('1️⃣ ПРОВЕРКА ТАБЛИЦЫ referrals:');
    console.log('━'.repeat(50));
    
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .limit(10);
      
    if (referralsError) {
      console.log('❌ Ошибка получения referrals:', referralsError.message);
    } else {
      console.log(`✅ Найдено записей в referrals: ${referrals?.length || 0}`);
      if (referrals && referrals.length > 0) {
        console.log('\nПример записей:');
        referrals.slice(0, 3).forEach(ref => {
          console.log(`  - User ${ref.user_id} приглашен ${ref.inviter_id}, уровень ${ref.level}`);
        });
      } else {
        console.log('⚠️ Таблица referrals пуста!');
      }
    }
    
    // 2. Проверяем реферальные связи в таблице users
    console.log('\n2️⃣ ПРОВЕРКА РЕФЕРАЛЬНЫХ СВЯЗЕЙ В users:');
    console.log('━'.repeat(50));
    
    const { data: usersWithReferrers, error: usersError } = await supabase
      .from('users')
      .select('id, username, telegram_id, ref_code, referred_by')
      .not('referred_by', 'is', null)
      .limit(10);
      
    if (usersError) {
      console.log('❌ Ошибка получения users:', usersError.message);
    } else {
      console.log(`✅ Пользователей с реферерами: ${usersWithReferrers?.length || 0}`);
      if (usersWithReferrers && usersWithReferrers.length > 0) {
        console.log('\nПримеры реферальных связей:');
        usersWithReferrers.slice(0, 5).forEach(user => {
          console.log(`  - User ${user.id} (${user.username}) приглашен пользователем ${user.referred_by}`);
        });
      }
    }
    
    // 3. Проверяем транзакции REFERRAL_REWARD
    console.log('\n3️⃣ ПРОВЕРКА ТРАНЗАКЦИЙ REFERRAL_REWARD:');
    console.log('━'.repeat(50));
    
    const { data: referralTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (txError) {
      console.log('❌ Ошибка получения транзакций:', txError.message);
    } else {
      console.log(`✅ Найдено транзакций REFERRAL_REWARD: ${referralTransactions?.length || 0}`);
      if (referralTransactions && referralTransactions.length > 0) {
        console.log('\nПоследние реферальные начисления:');
        referralTransactions.slice(0, 5).forEach(tx => {
          const metadata = tx.metadata || {};
          console.log(`  - User ${tx.user_id}: +${tx.amount_uni || 0} UNI / +${tx.amount_ton || 0} TON`);
          console.log(`    От: ${metadata.sourceType || 'unknown'}, уровень: ${metadata.level || '?'}`);
          console.log(`    Дата: ${new Date(tx.created_at).toLocaleString()}`);
        });
      } else {
        console.log('⚠️ Транзакций REFERRAL_REWARD не найдено!');
      }
    }
    
    // 4. Проверяем активных фармеров с реферерами
    console.log('\n4️⃣ ПРОВЕРКА АКТИВНЫХ ФАРМЕРОВ С РЕФЕРЕРАМИ:');
    console.log('━'.repeat(50));
    
    const { data: activeFarmers, error: farmersError } = await supabase
      .from('users')
      .select('id, username, referred_by, uni_farming_active, uni_deposit_amount')
      .eq('uni_farming_active', true)
      .not('referred_by', 'is', null)
      .limit(10);
      
    if (farmersError) {
      console.log('❌ Ошибка получения фармеров:', farmersError.message);
    } else {
      console.log(`✅ Активных фармеров с реферерами: ${activeFarmers?.length || 0}`);
      if (activeFarmers && activeFarmers.length > 0) {
        console.log('\nПримеры:');
        activeFarmers.slice(0, 5).forEach(farmer => {
          console.log(`  - User ${farmer.id}: депозит ${farmer.uni_deposit_amount} UNI, реферер: ${farmer.referred_by}`);
        });
      }
    }
    
    // 5. Проверяем TON Boost пользователей с реферерами
    console.log('\n5️⃣ ПРОВЕРКА TON BOOST С РЕФЕРЕРАМИ:');
    console.log('━'.repeat(50));
    
    const { data: tonBoostUsers, error: tonError } = await supabase
      .from('ton_farming_data')
      .select(`
        user_id,
        boost_package_id,
        farming_balance,
        users!inner(
          username,
          referred_by
        )
      `)
      .not('boost_package_id', 'is', null)
      .not('users.referred_by', 'is', null)
      .limit(10);
      
    if (tonError) {
      console.log('❌ Ошибка получения TON Boost:', tonError.message);
    } else {
      console.log(`✅ TON Boost пользователей с реферерами: ${tonBoostUsers?.length || 0}`);
      if (tonBoostUsers && tonBoostUsers.length > 0) {
        console.log('\nПримеры:');
        tonBoostUsers.slice(0, 5).forEach(boost => {
          console.log(`  - User ${boost.user_id}: пакет ${boost.boost_package_id}, депозит ${boost.farming_balance} TON`);
        });
      }
    }
    
    // 6. Итоговая статистика
    console.log('\n6️⃣ ИТОГОВАЯ СТАТИСТИКА:');
    console.log('━'.repeat(50));
    
    // Общее количество пользователей с реферерами
    const { count: referralCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .not('referred_by', 'is', null);
      
    // Общая сумма реферальных наград
    const { data: totalRewards } = await supabase
      .from('transactions')
      .select('amount_uni, amount_ton')
      .eq('type', 'REFERRAL_REWARD');
      
    const totalUni = totalRewards?.reduce((sum, tx) => sum + parseFloat(tx.amount_uni || '0'), 0) || 0;
    const totalTon = totalRewards?.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0) || 0;
    
    console.log(`📊 Всего пользователей с реферерами: ${referralCount || 0}`);
    console.log(`💰 Всего выплачено реферальных наград:`);
    console.log(`   - UNI: ${totalUni.toFixed(2)}`);
    console.log(`   - TON: ${totalTon.toFixed(6)}`);
    
    // 7. Проверка последних farming транзакций
    console.log('\n7️⃣ ПРОВЕРКА ПОСЛЕДНИХ FARMING ТРАНЗАКЦИЙ:');
    console.log('━'.repeat(50));
    
    const { data: farmingTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(5);
      
    console.log(`Последние ${farmingTx?.length || 0} farming транзакций:`);
    farmingTx?.forEach(tx => {
      console.log(`  - ${new Date(tx.created_at).toLocaleString()}: User ${tx.user_id} +${tx.amount_uni || tx.amount_ton} ${tx.currency || 'UNI'}`);
    });
    
    // Заключение
    console.log('\n📋 ЗАКЛЮЧЕНИЕ:');
    console.log('━'.repeat(50));
    
    const hasReferralConnections = (referralCount || 0) > 0;
    const hasReferralTransactions = (totalUni + totalTon) > 0;
    const hasActiveSystem = hasReferralConnections && hasReferralTransactions;
    
    if (hasActiveSystem) {
      console.log('✅ Реферальная система работает!');
      console.log('   - Есть реферальные связи');
      console.log('   - Есть транзакции начислений');
      console.log('   - Награды распределяются');
    } else {
      console.log('⚠️ Проблемы с реферальной системой:');
      if (!hasReferralConnections) {
        console.log('   - Нет реферальных связей');
      }
      if (!hasReferralTransactions) {
        console.log('   - Нет транзакций начислений');
      }
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем проверку
checkReferralSystemComplete()
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка выполнения:', error);
    process.exit(1);
  });