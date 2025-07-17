import { supabase } from './core/supabase';

async function checkReferralsTonBoost() {
  console.log('=== ПРОВЕРКА TON BOOST У РЕФЕРАЛОВ USER 184 ===\n');

  // 1. Найдем рефералов пользователя 184
  const { data: referrals } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_ton')
    .eq('referred_by', 184);

  console.log(`Найдено рефералов: ${referrals?.length || 0}`);
  
  if (!referrals || referrals.length === 0) {
    console.log('У пользователя 184 нет рефералов!');
    return;
  }

  console.log('\nРефералы:');
  referrals.forEach(ref => {
    console.log(`- User ${ref.id} (@${ref.username || 'no_username'}), telegram_id: ${ref.telegram_id}`);
  });

  // 2. Проверим активные TON Boost пакеты у рефералов
  const referralIds = referrals.map(r => r.id);
  const { data: tonBoostUsers } = await supabase
    .from('ton_farming_data')
    .select('*')
    .in('user_id', referralIds)
    .gt('boost_package_id', 0);

  console.log(`\nАктивных TON Boost пакетов у рефералов: ${tonBoostUsers?.length || 0}`);
  
  if (tonBoostUsers && tonBoostUsers.length > 0) {
    console.log('\nДетали TON Boost пакетов:');
    tonBoostUsers.forEach(boost => {
      const user = referrals.find(r => r.id.toString() === boost.user_id);
      console.log(`- User ${boost.user_id} (@${user?.username}): пакет ${boost.boost_package_id}, farming_balance: ${boost.farming_balance} TON, rate: ${boost.farming_rate}`);
    });
  }

  // 3. Проверим последние TON транзакции рефералов (доход от фарминга)
  const { data: recentTonTx } = await supabase
    .from('transactions')
    .select('*')
    .in('user_id', referralIds)
    .eq('currency', 'TON')
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`\nПоследние TON FARMING_REWARD транзакции у рефералов: ${recentTonTx?.length || 0}`);
  
  if (recentTonTx && recentTonTx.length > 0) {
    console.log('\nПоследние начисления:');
    recentTonTx.forEach(tx => {
      console.log(`- ${new Date(tx.created_at).toLocaleString()}: User ${tx.user_id} получил ${tx.amount} TON`);
    });
  }

  // 4. Проверим реферальные начисления для user 184 от TON операций
  const { data: referralRewards } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .eq('type', 'REFERRAL_REWARD')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false });

  console.log(`\nВсего реферальных TON начислений для user 184: ${referralRewards?.length || 0}`);
  
  if (referralRewards && referralRewards.length > 0) {
    const totalReferralTon = referralRewards.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    console.log(`Общая сумма реферальных TON: ${totalReferralTon.toFixed(5)}`);
    
    // Анализ источников
    const sources = new Set<string>();
    referralRewards.forEach(tx => {
      const match = tx.description.match(/from User (\d+)/);
      if (match) sources.add(match[1]);
    });
    console.log(`Источники начислений: ${Array.from(sources).join(', ')}`);
  }

  // 5. Проверим общий баланс и транзакции
  const { data: user184 } = await supabase
    .from('users')
    .select('balance_ton')
    .eq('id', 184)
    .single();

  const { data: allTonTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .eq('currency', 'TON')
    .order('created_at', { ascending: false });

  console.log(`\n=== АНАЛИЗ БАЛАНСА ===`);
  console.log(`Текущий баланс TON: ${user184?.balance_ton || 0}`);
  console.log(`Всего TON транзакций: ${allTonTx?.length || 0}`);
  
  if (allTonTx && allTonTx.length > 0) {
    const totalIncome = allTonTx
      .filter(tx => parseFloat(tx.amount) > 0)
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    const totalExpense = allTonTx
      .filter(tx => parseFloat(tx.amount) < 0)
      .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);
    
    console.log(`Сумма поступлений: ${totalIncome.toFixed(5)} TON`);
    console.log(`Сумма расходов: ${totalExpense.toFixed(5)} TON`);
    console.log(`Расчетный баланс: ${(totalIncome - totalExpense).toFixed(5)} TON`);
    
    if (Math.abs((totalIncome - totalExpense) - (user184?.balance_ton || 0)) > 0.00001) {
      console.log(`\n⚠️  РАСХОЖДЕНИЕ: Баланс в БД (${user184?.balance_ton}) не совпадает с суммой транзакций!`);
      console.log(`Возможные причины:`);
      console.log(`- Начальный баланс при регистрации`);
      console.log(`- Удаленные транзакции`);
      console.log(`- Прямые SQL обновления`);
    }
  }
}

checkReferralsTonBoost()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Ошибка:', err);
    process.exit(1);
  });