import { supabase } from './core/supabaseClient';

async function checkTonReferralIncome() {
  console.log('=== МОНИТОРИНГ TON ПАРТНЕРСКИХ НАЧИСЛЕНИЙ ===\n');
  
  const USER_ID = 184;
  
  // 1. Последние TON партнерские
  console.log('1. ПОСЛЕДНИЕ TON ПАРТНЕРСКИЕ НАЧИСЛЕНИЯ:');
  const { data: tonReferrals } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('type', 'REFERRAL_REWARD')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (tonReferrals && tonReferrals.length > 0) {
    console.log(`Найдено ${tonReferrals.length} последних TON referral транзакций:\n`);
    tonReferrals.forEach(tx => {
      const time = new Date(tx.created_at);
      const minutesAgo = Math.floor((Date.now() - time.getTime()) / (1000 * 60));
      console.log(`├── ${tx.amount} TON - ${tx.description}`);
      console.log(`│   Время: ${time.toLocaleString()} (${minutesAgo} мин назад)\n`);
    });
  } else {
    console.log('❌ TON партнерские начисления не найдены\n');
  }
  
  // 2. Статистика по рефералам 311-313
  console.log('\n2. СТАТУС НОВЫХ РЕФЕРАЛОВ (311-313):');
  
  // Проверяем их farming активность
  const { data: newRefFarming } = await supabase
    .from('transactions')
    .select('user_id, amount, created_at')
    .in('user_id', [311, 312, 313])
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false });
    
  if (newRefFarming) {
    const byUser: Record<number, any[]> = {};
    newRefFarming.forEach(tx => {
      if (!byUser[tx.user_id]) byUser[tx.user_id] = [];
      byUser[tx.user_id].push(tx);
    });
    
    Object.entries(byUser).forEach(([userId, txs]) => {
      console.log(`\nUser ${userId}:`);
      console.log(`├── Всего farming транзакций: ${txs.length}`);
      console.log(`├── Последняя: ${new Date(txs[0].created_at).toLocaleTimeString()}`);
      console.log(`└── Сумма: ${txs[0].amount} TON`);
    });
  }
  
  // 3. Проверяем ожидаемые партнерские от 311-313
  console.log('\n\n3. ОЖИДАЕМЫЕ ПАРТНЕРСКИЕ ОТ НОВЫХ РЕФЕРАЛОВ:');
  
  const expectedReferrals = [311, 312, 313];
  for (const refId of expectedReferrals) {
    const { data: refReward } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', USER_ID)
      .eq('type', 'REFERRAL_REWARD')
      .eq('currency', 'TON')
      .like('description', `%User ${refId}%`)
      .limit(1);
      
    if (refReward && refReward.length > 0) {
      console.log(`✅ Партнерские от User ${refId} ПОЛУЧЕНЫ: ${refReward[0].amount} TON`);
    } else {
      console.log(`⏳ Партнерские от User ${refId} еще не поступили`);
    }
  }
  
  // 4. Общий баланс TON
  const { data: user } = await supabase
    .from('users')
    .select('balance_ton')
    .eq('id', USER_ID)
    .single();
    
  console.log(`\n\n4. ВАШ ТЕКУЩИЙ БАЛАНС TON: ${user?.balance_ton || 0} TON`);
  
  console.log('\n\n💡 ВАЖНО:');
  console.log('- TON farming происходит каждые 5 минут');
  console.log('- Партнерские начисляются через 1-2 минуты после farming');
  console.log('- Вы получаете 100% от farming ваших прямых рефералов (L1)');
  console.log('- Каждый реферал с пакетом 1 генерирует ~0.000347 TON за цикл');
}

checkTonReferralIncome();