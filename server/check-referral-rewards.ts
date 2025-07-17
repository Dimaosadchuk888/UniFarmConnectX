import { supabase } from '../core/supabase.js';

async function checkReferralRewards() {
  console.log('=== ПРОВЕРКА РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ ДЛЯ USER 184 ===\n');
  
  const userId = 184;
  
  try {
    // 1. Проверяем рефералов
    console.log('📊 ПРОВЕРКА РЕФЕРАЛОВ:');
    const { data: referrals, error: refError } = await supabase
      .from('users')
      .select('id, username, balance_uni, balance_ton, uni_deposit_amount, uni_farming_last_update, created_at')
      .eq('referred_by', userId)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (refError) {
      console.error('Ошибка получения рефералов:', refError);
      return;
    }
    
    console.log(`\nНайдено рефералов: ${referrals?.length || 0}`);
    
    if (referrals && referrals.length > 0) {
      referrals.forEach((ref, index) => {
        console.log(`\n${index + 1}. ${ref.username} (ID: ${ref.id})`);
        console.log(`   - Дата регистрации: ${new Date(ref.created_at).toLocaleString('ru-RU')}`);
        console.log(`   - UNI депозит: ${ref.uni_deposit_amount || 0} UNI`);
        console.log(`   - Баланс UNI: ${ref.balance_uni}`);
        console.log(`   - Баланс TON: ${ref.balance_ton}`);
        const lastUpdate = ref.uni_farming_last_update ? new Date(ref.uni_farming_last_update) : null;
        if (lastUpdate) {
          const minutesAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 1000 / 60);
          console.log(`   - Последнее обновление фарминга: ${minutesAgo} минут назад`);
        } else {
          console.log(`   - Фарминг еще не обновлялся`);
        }
      });
    }
    
    // 2. Проверяем транзакции доходов рефералов
    console.log('\n\n📈 ТРАНЗАКЦИИ ДОХОДОВ РЕФЕРАЛОВ:');
    const referralIds = referrals?.map(r => r.id) || [];
    
    if (referralIds.length > 0) {
      const { data: farmingRewards, error: farmError } = await supabase
        .from('transactions')
        .select('id, user_id, type, amount, currency, created_at')
        .in('user_id', referralIds)
        .eq('type', 'FARMING_REWARD')
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (farmingRewards && farmingRewards.length > 0) {
        console.log(`\nНайдено транзакций дохода: ${farmingRewards.length}`);
        farmingRewards.forEach(tx => {
          const ref = referrals?.find(r => r.id === tx.user_id);
          console.log(`- ${ref?.username}: +${tx.amount} ${tx.currency} (${new Date(tx.created_at).toLocaleString('ru-RU')})`);
        });
      } else {
        console.log('\n❌ Транзакции дохода рефералов еще не созданы');
        console.log('   Планировщик фарминга работает каждые 5 минут');
      }
    }
    
    // 3. Проверяем ваши реферальные комиссии
    console.log('\n\n💰 ВАШИ РЕФЕРАЛЬНЫЕ КОМИССИИ:');
    const { data: referralRewards, error: rewardError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (rewardError) {
      console.error('Ошибка получения реферальных наград:', rewardError);
    } else if (referralRewards && referralRewards.length > 0) {
      console.log(`\nНайдено реферальных комиссий: ${referralRewards.length}`);
      let totalUni = 0;
      let totalTon = 0;
      
      referralRewards.forEach(reward => {
        console.log(`\n- ID транзакции: ${reward.id}`);
        console.log(`  Сумма: +${reward.amount} ${reward.currency}`);
        console.log(`  Описание: ${reward.description}`);
        console.log(`  Дата: ${new Date(reward.created_at).toLocaleString('ru-RU')}`);
        
        if (reward.currency === 'UNI') totalUni += parseFloat(reward.amount);
        if (reward.currency === 'TON') totalTon += parseFloat(reward.amount);
      });
      
      console.log(`\n📊 ИТОГО ПОЛУЧЕНО:`);
      console.log(`- UNI: ${totalUni.toFixed(6)}`);
      console.log(`- TON: ${totalTon.toFixed(6)}`);
    } else {
      console.log('\n❌ Реферальные комиссии еще не начислены');
      console.log('   Они появятся после того, как рефералы получат доход от фарминга');
    }
    
    // 4. Проверяем время с момента создания рефералов
    console.log('\n\n⏰ АНАЛИЗ ВРЕМЕНИ:');
    const oldestReferral = referrals?.[referrals.length - 1];
    if (oldestReferral) {
      const createdTime = new Date(oldestReferral.created_at);
      const minutesSinceCreation = Math.floor((Date.now() - createdTime.getTime()) / 1000 / 60);
      console.log(`- Первый реферал создан: ${minutesSinceCreation} минут назад`);
      console.log(`- Планировщик фарминга запускается каждые 5 минут`);
      console.log(`- Ожидаемое количество начислений: ${Math.floor(minutesSinceCreation / 5)}`);
      
      if (minutesSinceCreation < 5) {
        console.log('\n⚠️ Прошло менее 5 минут с создания рефералов');
        console.log('   Подождите еще немного для первого начисления');
      }
    }
    
    // 5. Проверяем активность планировщика
    console.log('\n\n🔄 ПРОВЕРКА ПЛАНИРОВЩИКА:');
    const { data: recentTransactions, error: txError } = await supabase
      .from('transactions')
      .select('created_at')
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (recentTransactions && recentTransactions.length > 0) {
      const lastTx = new Date(recentTransactions[0].created_at);
      const minutesAgo = Math.floor((Date.now() - lastTx.getTime()) / 1000 / 60);
      console.log(`- Последнее начисление фарминга: ${minutesAgo} минут назад`);
      
      if (minutesAgo > 10) {
        console.log('⚠️ Возможно, планировщик остановлен или работает с задержкой');
      } else {
        console.log('✅ Планировщик работает нормально');
      }
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

checkReferralRewards();