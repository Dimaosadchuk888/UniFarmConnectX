import { supabase } from './core/supabase';

async function checkTonBoostScheduler() {
  console.log('=== ПРОВЕРКА РАБОТЫ TON BOOST ПЛАНИРОВЩИКА ===\n');

  // 1. Проверим последние транзакции TON Boost (FARMING_REWARD) за последний час
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data: recentTonBoost } = await supabase
    .from('transactions')
    .select('*')
    .eq('currency', 'TON')
    .eq('type', 'FARMING_REWARD')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false });

  console.log(`TON Boost транзакций за последний час: ${recentTonBoost?.length || 0}`);
  
  if (recentTonBoost && recentTonBoost.length > 0) {
    // Группируем по времени создания (по минутам)
    const byTime = new Map<string, number>();
    recentTonBoost.forEach(tx => {
      const time = new Date(tx.created_at).toLocaleTimeString();
      byTime.set(time, (byTime.get(time) || 0) + 1);
    });
    
    console.log('\nВремя последних запусков планировщика:');
    Array.from(byTime.entries()).slice(0, 10).forEach(([time, count]) => {
      console.log(`- ${time}: обработано ${count} пользователей`);
    });
  }

  // 2. Проверим последние реферальные начисления от TON Boost
  const { data: recentReferrals } = await supabase
    .from('transactions')
    .select('*')
    .eq('currency', 'TON')
    .eq('type', 'REFERRAL_REWARD')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false })
    .limit(20);

  console.log(`\nРеферальных TON начислений за последний час: ${recentReferrals?.length || 0}`);
  
  if (recentReferrals && recentReferrals.length > 0) {
    // Анализируем получателей
    const recipients = new Map<number, number>();
    recentReferrals.forEach(tx => {
      recipients.set(tx.user_id, (recipients.get(tx.user_id) || 0) + 1);
    });
    
    console.log('\nПолучатели реферальных начислений:');
    Array.from(recipients.entries()).forEach(([userId, count]) => {
      console.log(`- User ${userId}: ${count} начислений`);
    });
    
    // Проверяем, есть ли среди них user 184
    if (!recipients.has(184)) {
      console.log('\n⚠️  User 184 НЕ получал реферальные начисления за последний час!');
    }
  }

  // 3. Анализ конкретно для user 184
  console.log('\n=== АНАЛИЗ ДЛЯ USER 184 ===');
  
  // Последнее реферальное начисление
  const { data: lastReferral184 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .eq('type', 'REFERRAL_REWARD')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(1);

  if (lastReferral184 && lastReferral184.length > 0) {
    const tx = lastReferral184[0];
    const timeDiff = Date.now() - new Date(tx.created_at).getTime();
    const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutesAgo = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log(`Последнее реферальное начисление: ${hoursAgo}ч ${minutesAgo}м назад`);
    console.log(`Время: ${new Date(tx.created_at).toLocaleString()}`);
    console.log(`Сумма: ${tx.amount} TON`);
    console.log(`Описание: ${tx.description}`);
  } else {
    console.log('Реферальных TON начислений не найдено!');
  }

  // 4. Проверим metadata последних транзакций для определения источника
  const { data: recentWithMeta } = await supabase
    .from('transactions')
    .select('*')
    .eq('currency', 'TON')
    .eq('type', 'FARMING_REWARD')
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentWithMeta && recentWithMeta.length > 0) {
    console.log('\n=== METADATA ПОСЛЕДНИХ TON BOOST ТРАНЗАКЦИЙ ===');
    recentWithMeta.forEach(tx => {
      console.log(`\nUser ${tx.user_id}:`);
      console.log(`- original_type: ${tx.metadata?.original_type}`);
      console.log(`- transaction_source: ${tx.metadata?.transaction_source}`);
      console.log(`- boost_package_id: ${tx.metadata?.boost_package_id}`);
    });
  }
}

checkTonBoostScheduler()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Ошибка:', err);
    process.exit(1);
  });