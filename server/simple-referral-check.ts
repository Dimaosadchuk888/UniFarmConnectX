import { supabase } from '../core/supabase.js';

async function simpleReferralCheck() {
  try {
    // Получаем количество рефералов у пользователя 74
    const { data: referrals, error } = await supabase
      .from('users')
      .select('id, username, balance_uni, uni_deposit_amount')
      .eq('referred_by', 74);
      
    if (error) throw error;
    
    console.log(`\n✅ У пользователя 74 есть ${referrals?.length || 0} рефералов первого уровня:`);
    
    // Показываем топ 5 по балансу
    const topReferrals = referrals?.sort((a, b) => (b.balance_uni || 0) - (a.balance_uni || 0)).slice(0, 5);
    
    topReferrals?.forEach((ref, i) => {
      console.log(`\n${i+1}. ${ref.username} (ID: ${ref.id})`);
      console.log(`   💰 Баланс: ${ref.balance_uni?.toLocaleString('ru-RU')} UNI`);
      console.log(`   📈 Депозит: ${ref.uni_deposit_amount?.toLocaleString('ru-RU')} UNI`);
    });
    
    // Общая статистика
    const totalBalance = referrals?.reduce((sum, ref) => sum + (ref.balance_uni || 0), 0) || 0;
    const totalDeposits = referrals?.reduce((sum, ref) => sum + (ref.uni_deposit_amount || 0), 0) || 0;
    
    console.log(`\n📊 ОБЩАЯ СТАТИСТИКА РЕФЕРАЛОВ:`);
    console.log(`- Общий баланс: ${totalBalance.toLocaleString('ru-RU')} UNI`);
    console.log(`- Общие депозиты: ${totalDeposits.toLocaleString('ru-RU')} UNI`);
    console.log(`- Потенциальный доход (5% от депозитов): ${(totalDeposits * 0.05).toLocaleString('ru-RU')} UNI в день`);
    
    // Проверяем есть ли доходы от рефералов
    const { data: rewards, error: rewardsError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', 74)
      .eq('type', 'REFERRAL_REWARD')
      .eq('currency', 'UNI');
      
    if (!rewardsError && rewards) {
      const totalRewards = rewards.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
      console.log(`\n💰 Уже получено от рефералов: ${totalRewards.toLocaleString('ru-RU')} UNI`);
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

simpleReferralCheck();