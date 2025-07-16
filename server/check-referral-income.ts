import { supabase } from '../core/supabase.js';

async function checkReferralIncome() {
  console.log('=== ПРОВЕРКА ДОХОДОВ ОТ РЕФЕРАЛОВ ===\n');
  
  try {
    // 1. Проверяем доходы рефералов первого уровня
    const { data: referrals, error: refError } = await supabase
      .from('users')
      .select('id, username, balance_uni, uni_deposit_amount')
      .eq('referred_by', 74)
      .limit(5);
      
    if (refError) throw refError;
    
    console.log('📊 РЕФЕРАЛЫ ПЕРВОГО УРОВНЯ:\n');
    
    for (const ref of referrals || []) {
      console.log(`${ref.username} (ID: ${ref.id})`);
      console.log(`- Депозит: ${ref.uni_deposit_amount?.toLocaleString('ru-RU')} UNI`);
      
      // Проверяем последние транзакции этого реферала
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('type, amount, currency, created_at')
        .eq('user_id', ref.id)
        .eq('type', 'FARMING_REWARD')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (!txError && transactions && transactions.length > 0) {
        const lastTx = transactions[0];
        console.log(`- Последнее начисление: +${parseFloat(lastTx.amount).toLocaleString('ru-RU')} ${lastTx.currency}`);
        console.log(`- Время: ${new Date(lastTx.created_at).toLocaleString('ru-RU')}`);
      } else {
        console.log('- Начислений пока нет');
      }
      console.log('');
    }
    
    // 2. Проверяем реферальные начисления для User 74
    console.log('\n💰 РЕФЕРАЛЬНЫЕ КОМИССИИ USER 74:\n');
    
    const { data: referralRewards, error: rewardsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (!rewardsError && referralRewards && referralRewards.length > 0) {
      console.log(`Найдено ${referralRewards.length} начислений:\n`);
      referralRewards.forEach((tx, i) => {
        console.log(`${i+1}. +${parseFloat(tx.amount).toLocaleString('ru-RU')} ${tx.currency}`);
        console.log(`   ${tx.description || 'Реферальная комиссия'}`);
        console.log(`   ${new Date(tx.created_at).toLocaleString('ru-RU')}\n`);
      });
    } else {
      console.log('Реферальных начислений пока нет');
      console.log('(Ожидаем запуска планировщика фарминга)');
    }
    
    // 3. Проверяем работу планировщика
    console.log('\n⏱️ ПОСЛЕДНИЕ FARMING ТРАНЗАКЦИИ:\n');
    
    const { data: lastFarmingTx, error: farmingError } = await supabase
      .from('transactions')
      .select('user_id, amount, created_at')
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (!farmingError && lastFarmingTx && lastFarmingTx.length > 0) {
      console.log('Последние начисления фарминга:');
      lastFarmingTx.forEach((tx, i) => {
        console.log(`${i+1}. User ${tx.user_id}: +${parseFloat(tx.amount).toLocaleString('ru-RU')} UNI`);
        console.log(`   ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
      });
      
      // Проверяем время последнего запуска
      const lastTime = new Date(lastFarmingTx[0].created_at);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastTime.getTime()) / 60000);
      
      console.log(`\n⏱️ Последний запуск: ${diffMinutes} минут назад`);
      if (diffMinutes > 6) {
        console.log('⚠️ Планировщик может быть остановлен!');
      }
    } else {
      console.log('❌ Транзакций фарминга не найдено');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkReferralIncome();