import { supabase } from '../core/supabase.js';

async function checkMultilevelReferrals() {
  console.log('=== ПРОВЕРКА МНОГОУРОВНЕВЫХ РЕФЕРАЛОВ ===\n');
  
  const userId = 184;
  
  try {
    // 1. Проверяем транзакции FARMING_REWARD рефералов
    console.log('📊 ТРАНЗАКЦИИ FARMING_REWARD РЕФЕРАЛОВ:');
    const { data: referralRewards, error: refError } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', [186, 187, 188, 189, 190])
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: true });
      
    if (refError) {
      console.error('Ошибка:', refError);
      return;
    }
    
    console.log(`\nНайдено транзакций FARMING_REWARD у рефералов: ${referralRewards?.length || 0}`);
    
    if (referralRewards && referralRewards.length > 0) {
      let totalRewardsUni = 0;
      let totalRewardsTon = 0;
      
      referralRewards.forEach(tx => {
        console.log(`\n- User ${tx.user_id}: +${tx.amount} ${tx.currency}`);
        console.log(`  Дата: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        console.log(`  ID транзакции: ${tx.id}`);
        
        if (tx.currency === 'UNI') totalRewardsUni += parseFloat(tx.amount);
        if (tx.currency === 'TON') totalRewardsTon += parseFloat(tx.amount);
      });
      
      console.log(`\n📊 ИТОГО ДОХОДОВ РЕФЕРАЛОВ:`);
      console.log(`- UNI: ${totalRewardsUni.toFixed(6)}`);
      console.log(`- TON: ${totalRewardsTon.toFixed(6)}`);
      
      console.log(`\n💰 ОЖИДАЕМЫЕ КОМИССИИ (5%):`);
      console.log(`- UNI: ${(totalRewardsUni * 0.05).toFixed(6)}`);
      console.log(`- TON: ${(totalRewardsTon * 0.05).toFixed(6)}`);
    }
    
    // 2. Проверяем ваши реферальные комиссии
    console.log('\n\n💎 ВАШИ РЕФЕРАЛЬНЫЕ КОМИССИИ:');
    const { data: yourReferralRewards, error: yourError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false });
      
    if (yourError) {
      console.error('Ошибка:', yourError);
      return;
    }
    
    console.log(`\nНайдено ваших реферальных комиссий: ${yourReferralRewards?.length || 0}`);
    
    if (yourReferralRewards && yourReferralRewards.length > 0) {
      let totalCommissionUni = 0;
      let totalCommissionTon = 0;
      
      yourReferralRewards.forEach(reward => {
        console.log(`\n- ${reward.description}`);
        console.log(`  Сумма: +${reward.amount} ${reward.currency}`);
        console.log(`  Дата: ${new Date(reward.created_at).toLocaleString('ru-RU')}`);
        
        if (reward.currency === 'UNI') totalCommissionUni += parseFloat(reward.amount);
        if (reward.currency === 'TON') totalCommissionTon += parseFloat(reward.amount);
      });
      
      console.log(`\n📊 ИТОГО ПОЛУЧЕНО КОМИССИЙ:`);
      console.log(`- UNI: ${totalCommissionUni.toFixed(6)}`);
      console.log(`- TON: ${totalCommissionTon.toFixed(6)}`);
    } else {
      console.log('\n⚠️ Реферальные комиссии еще не начислены');
    }
    
    // 3. Проверяем metadata транзакций FARMING_REWARD
    console.log('\n\n🔍 ПРОВЕРКА METADATA ТРАНЗАКЦИЙ:');
    const recentReward = referralRewards?.[referralRewards.length - 1];
    if (recentReward) {
      console.log('Последняя транзакция FARMING_REWARD:');
      console.log(`- ID: ${recentReward.id}`);
      console.log(`- Metadata:`, recentReward.metadata);
      
      if (!recentReward.metadata?.referral_data || !recentReward.metadata?.referrals_distributed) {
        console.log('\n❌ В metadata нет данных о распределении реферальных комиссий!');
        console.log('   Это может быть причиной отсутствия начислений');
      }
    }
    
    // 4. Проверяем реферальную структуру
    console.log('\n\n🏗️ РЕФЕРАЛЬНАЯ СТРУКТУРА:');
    const { data: referralStructure, error: structError } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .in('id', [184, 185, 186, 187, 188, 189, 190]);
      
    if (referralStructure) {
      referralStructure.forEach(user => {
        console.log(`- ${user.username} (ID: ${user.id}) → приглашен пользователем ID: ${user.referred_by || 'НЕТ'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

checkMultilevelReferrals();