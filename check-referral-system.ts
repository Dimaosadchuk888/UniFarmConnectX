import { supabase } from './core/supabase';
import { logger } from './core/logger';

async function checkReferralSystem() {
  console.log('=== ПРОВЕРКА РЕФЕРАЛЬНОЙ СИСТЕМЫ ===\n');
  
  try {
    // 1. Проверяем структуру таблицы referrals
    console.log('1. Проверка таблицы referrals:');
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('*')
      .limit(10);
      
    if (refError) {
      console.error('Ошибка получения referrals:', refError);
    } else {
      console.log(`- Найдено записей: ${referrals?.length || 0}`);
      if (referrals && referrals.length > 0) {
        console.log('- Пример записи:', JSON.stringify(referrals[0], null, 2));
      }
    }
    
    // 2. Проверяем реферальные связи в таблице users
    console.log('\n2. Проверка реферальных связей в users:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, ref_code, invited_by_user_id, referral_balance_uni, referral_balance_ton')
      .not('invited_by_user_id', 'is', null)
      .limit(20);
      
    if (usersError) {
      console.error('Ошибка получения users:', usersError);
    } else {
      console.log(`- Пользователей с рефералами: ${users?.length || 0}`);
      
      // Проверяем корректность связей
      for (const user of users || []) {
        const { data: inviter } = await supabase
          .from('users')
          .select('id, username, ref_code')
          .eq('id', user.invited_by_user_id)
          .single();
          
        console.log(`- User ${user.id} (${user.username}) приглашен user ${inviter?.id} (${inviter?.username})`);
      }
    }
    
    // 3. Проверяем транзакции REFERRAL_REWARD
    console.log('\n3. Проверка транзакций REFERRAL_REWARD:');
    const { data: refTransactions, error: refTxError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (refTxError) {
      console.error('Ошибка получения REFERRAL_REWARD транзакций:', refTxError);
    } else {
      console.log(`- Найдено REFERRAL_REWARD транзакций: ${refTransactions?.length || 0}`);
      
      if (refTransactions && refTransactions.length > 0) {
        console.log('\n- Последние реферальные награды:');
        refTransactions.forEach(tx => {
          console.log(`  User ${tx.user_id}: ${tx.amount_uni} UNI, ${tx.amount_ton} TON - ${tx.description}`);
        });
      }
    }
    
    // 4. Проверяем общую статистику реферальных доходов
    console.log('\n4. Статистика реферальных доходов:');
    const { data: refStats, error: statsError } = await supabase
      .from('users')
      .select('id, username, referral_balance_uni, referral_balance_ton')
      .or('referral_balance_uni.gt.0,referral_balance_ton.gt.0')
      .order('referral_balance_uni', { ascending: false })
      .limit(10);
      
    if (statsError) {
      console.error('Ошибка получения статистики:', statsError);
    } else {
      console.log(`- Пользователей с реферальным доходом: ${refStats?.length || 0}`);
      
      let totalRefUni = 0;
      let totalRefTon = 0;
      
      refStats?.forEach(user => {
        totalRefUni += parseFloat(user.referral_balance_uni || '0');
        totalRefTon += parseFloat(user.referral_balance_ton || '0');
        console.log(`- User ${user.id} (${user.username}): ${user.referral_balance_uni} UNI, ${user.referral_balance_ton} TON`);
      });
      
      console.log(`\nОбщий реферальный доход системы:`);
      console.log(`- UNI: ${totalRefUni.toFixed(6)}`);
      console.log(`- TON: ${totalRefTon.toFixed(6)}`);
    }
    
    // 5. Проверяем правильность начисления комиссий
    console.log('\n5. Проверка корректности начисления комиссий:');
    
    // Берем пользователя с активным фармингом
    const { data: activeUser } = await supabase
      .from('users')
      .select('*')
      .eq('uni_farming_active', true)
      .not('invited_by_user_id', 'is', null)
      .limit(1)
      .single();
      
    if (activeUser) {
      console.log(`\nПроверка для user ${activeUser.id}:`);
      console.log(`- Депозит: ${activeUser.uni_deposit_amount} UNI`);
      console.log(`- Приглашен пользователем: ${activeUser.invited_by_user_id}`);
      
      // Проверяем доход за последние 24 часа
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: farmingIncome } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', activeUser.id)
        .eq('type', 'FARMING_INCOME')
        .gte('created_at', dayAgo);
        
      const totalIncome = farmingIncome?.reduce((sum, tx) => 
        sum + parseFloat(tx.amount_uni || '0'), 0) || 0;
        
      console.log(`- Доход за 24 часа: ${totalIncome.toFixed(6)} UNI`);
      
      // Проверяем реферальные начисления инвайтеру
      const { data: refRewards } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', activeUser.invited_by_user_id)
        .eq('type', 'REFERRAL_REWARD')
        .gte('created_at', dayAgo);
        
      const totalRefReward = refRewards?.reduce((sum, tx) => 
        sum + parseFloat(tx.amount_uni || '0'), 0) || 0;
        
      console.log(`- Реферальная награда инвайтеру: ${totalRefReward.toFixed(6)} UNI`);
      console.log(`- Ожидаемая награда (100% от дохода): ${totalIncome.toFixed(6)} UNI`);
      console.log(`- Соответствие: ${totalRefReward === totalIncome ? 'ДА ✅' : 'НЕТ ❌'}`);
    }
    
    // 6. Проверяем цепочку рефералов
    console.log('\n6. Проверка многоуровневой реферальной цепочки:');
    
    // Найдем пользователя с глубокой цепочкой
    const { data: userWithChain } = await supabase
      .from('users')
      .select('*')
      .eq('id', 74) // Проверяем для основного тестового пользователя
      .single();
      
    if (userWithChain) {
      console.log(`\nЦепочка рефералов для user ${userWithChain.id}:`);
      
      let currentUserId = userWithChain.invited_by_user_id;
      let level = 1;
      
      while (currentUserId && level <= 20) {
        const { data: refUser } = await supabase
          .from('users')
          .select('id, username, invited_by_user_id')
          .eq('id', currentUserId)
          .single();
          
        if (refUser) {
          console.log(`- Уровень ${level}: User ${refUser.id} (${refUser.username})`);
          currentUserId = refUser.invited_by_user_id;
          level++;
        } else {
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('Критическая ошибка:', error);
  }
}

checkReferralSystem().catch(console.error);