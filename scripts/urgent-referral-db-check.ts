/**
 * Срочная диагностика реферальных начислений на уровне БД
 */

import { supabase } from '../core/supabase';

async function urgentReferralDbCheck() {
  console.log('\n' + '='.repeat(80));
  console.log('СРОЧНАЯ ДИАГНОСТИКА РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ');
  console.log('='.repeat(80) + '\n');
  
  const userId = 184; // Проверяем для User 184
  
  try {
    // 1. Проверяем рефералов User 184 и их статус фарминга
    console.log('1. ПРОВЕРЯЕМ РЕФЕРАЛОВ USER 184:');
    const { data: referrals, error: refError } = await supabase
      .from('users')
      .select('id, username, referred_by, uni_farming_active, uni_deposit_amount, balance_uni, uni_farming_last_update, balance_ton')
      .eq('referred_by', userId)
      .order('id');
    
    if (refError) {
      console.error('Ошибка получения рефералов:', refError);
      return;
    }
    
    console.log(`Найдено ${referrals?.length || 0} рефералов:`);
    referrals?.forEach(r => {
      console.log(`\n  User ${r.id}:`);
      console.log(`    - UNI фарминг: ${r.uni_farming_active ? 'АКТИВЕН ✓' : 'НЕ АКТИВЕН ✗'}`);
      console.log(`    - UNI депозит: ${r.uni_deposit_amount || 0}`);
      console.log(`    - UNI баланс: ${r.balance_uni || 0}`);
      console.log(`    - Последнее обновление UNI: ${r.uni_farming_last_update || 'НИКОГДА'}`);
      console.log(`    - TON баланс: ${r.balance_ton || 0}`);
    });
    
    // 2. Проверяем транзакции фарминга рефералов за последние 24 часа
    console.log('\n\n2. ТРАНЗАКЦИИ ФАРМИНГА РЕФЕРАЛОВ (последние 24 часа):');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    if (referrals && referrals.length > 0) {
      const referralIds = referrals.map(r => r.id);
      const { data: farmingTx, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .in('user_id', referralIds)
        .eq('type', 'FARMING_REWARD')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false });
      
      if (txError) {
        console.error('Ошибка получения транзакций:', txError);
      } else {
        console.log(`Найдено ${farmingTx?.length || 0} транзакций FARMING_REWARD:`);
        farmingTx?.forEach(tx => {
          console.log(`  - User ${tx.user_id}: ${tx.amount} ${tx.currency} (${new Date(tx.created_at).toLocaleString()})`);
        });
      }
    }
    
    // 3. Проверяем реферальные транзакции User 184
    console.log('\n\n3. РЕФЕРАЛЬНЫЕ ТРАНЗАКЦИИ USER 184 (последние 7 дней):');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: referralRewards, error: rewardError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'REFERRAL_REWARD')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false });
    
    if (rewardError) {
      console.error('Ошибка получения реферальных транзакций:', rewardError);
    } else {
      console.log(`Найдено ${referralRewards?.length || 0} транзакций REFERRAL_REWARD за 7 дней:`);
      if (referralRewards && referralRewards.length > 0) {
        referralRewards.forEach(tx => {
          console.log(`  - ${tx.amount} ${tx.currency} от User ${tx.source_user_id} (${new Date(tx.created_at).toLocaleString()})`);
          console.log(`    Описание: ${tx.description}`);
        });
      } else {
        console.log('  ❌ НЕТ РЕФЕРАЛЬНЫХ ТРАНЗАКЦИЙ!');
      }
    }
    
    // 4. Проверяем таблицу referral_earnings
    console.log('\n\n4. ЗАПИСИ В ТАБЛИЦЕ referral_earnings:');
    const { data: earnings, error: earningsError } = await supabase
      .from('referral_earnings')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false });
    
    if (earningsError) {
      console.error('Ошибка получения referral_earnings:', earningsError);
    } else {
      console.log(`Найдено ${earnings?.length || 0} записей в referral_earnings:`);
      if (earnings && earnings.length > 0) {
        earnings.forEach(e => {
          console.log(`  - ${e.amount} ${e.currency} от User ${e.source_user_id} (${new Date(e.created_at).toLocaleString()})`);
        });
      } else {
        console.log('  ❌ НЕТ ЗАПИСЕЙ В referral_earnings!');
      }
    }
    
    // 5. Проверяем последние транзакции всех типов для диагностики
    console.log('\n\n5. ПОСЛЕДНИЕ 5 ТРАНЗАКЦИЙ ЛЮБОГО ТИПА ДЛЯ USER 184:');
    const { data: recentTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    recentTx?.forEach(tx => {
      console.log(`  - ${tx.type}: ${tx.amount} ${tx.currency} (${new Date(tx.created_at).toLocaleString()})`);
    });
    
    // 6. Анализ проблемы
    console.log('\n\n6. АНАЛИЗ ПРОБЛЕМЫ:');
    
    const activeReferralFarmers = referrals?.filter(r => r.uni_farming_active) || [];
    const inactiveReferrals = referrals?.filter(r => !r.uni_farming_active) || [];
    
    console.log(`\n📊 СТАТИСТИКА:`);
    console.log(`  - Всего рефералов: ${referrals?.length || 0}`);
    console.log(`  - Активных фармеров среди рефералов: ${activeReferralFarmers.length}`);
    console.log(`  - Неактивных рефералов: ${inactiveReferrals.length}`);
    
    if (activeReferralFarmers.length === 0) {
      console.log('\n❌ ПРОБЛЕМА: Ни один из ваших рефералов не активировал фарминг!');
      console.log('   Поэтому нет реферальных начислений.');
      console.log('\n💡 РЕШЕНИЕ: Рефералы должны активировать фарминг, чтобы вы начали получать 5% от их дохода.');
    } else {
      console.log('\n⚠️  ПРОБЛЕМА: Есть активные рефералы, но нет реферальных транзакций.');
      console.log('   Возможно, планировщик не обрабатывает их корректно.');
    }
    
    // 7. Проверяем таблицу referrals
    console.log('\n\n7. ПРОВЕРЯЕМ ТАБЛИЦУ referrals:');
    const { data: referralLinks, count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact' })
      .or(`referrer_id.eq.${userId},user_id.in.(${referrals?.map(r => r.id).join(',')})`);
    
    console.log(`Найдено ${count || 0} записей в таблице referrals`);
    referralLinks?.forEach(link => {
      console.log(`  - Referrer: ${link.referrer_id}, User: ${link.user_id}, Referred User: ${link.referred_user_id}`);
    });
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log('='.repeat(80) + '\n');
  
  process.exit(0);
}

urgentReferralDbCheck();