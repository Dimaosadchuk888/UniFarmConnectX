import { supabase } from '../core/supabase.js';

async function checkMultilevelReferrals() {
  console.log('=== ПРОВЕРКА МНОГОУРОВНЕВЫХ РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ ===\n');
  
  try {
    // 1. Проверяем фарминг доходы рефералов разных уровней
    console.log('📊 ФАРМИНГ ДОХОДЫ РЕФЕРАЛОВ:\n');
    
    // Уровень 1 - прямые рефералы User 74
    const { data: level1, error: err1 } = await supabase
      .from('users')
      .select('id, username, balance_uni, uni_deposit_amount')
      .eq('referred_by', 74)
      .limit(3);
      
    console.log('Уровень 1 (прямые рефералы User 74):');
    for (const ref of level1 || []) {
      // Проверяем последние транзакции фарминга
      const { data: farmingTx } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('user_id', ref.id)
        .eq('type', 'FARMING_REWARD')
        .eq('currency', 'UNI')
        .order('created_at', { ascending: false })
        .limit(1);
        
      console.log(`- ${ref.username} (ID: ${ref.id})`);
      console.log(`  Депозит: ${ref.uni_deposit_amount?.toLocaleString('ru-RU')} UNI`);
      if (farmingTx && farmingTx.length > 0) {
        console.log(`  Последний доход: +${parseFloat(farmingTx[0].amount).toLocaleString('ru-RU')} UNI`);
        console.log(`  Время: ${new Date(farmingTx[0].created_at).toLocaleString('ru-RU')}`);
      } else {
        console.log(`  Доходов пока нет`);
      }
    }
    
    // Уровень 2 - рефералы рефералов
    console.log('\nУровень 2 (рефералы первого уровня):');
    const level1Ids = level1?.map(r => r.id) || [];
    if (level1Ids.length > 0) {
      const { data: level2 } = await supabase
        .from('users')
        .select('id, username, referred_by, uni_deposit_amount')
        .in('referred_by', level1Ids)
        .limit(3);
        
      for (const ref of level2 || []) {
        const { data: farmingTx } = await supabase
          .from('transactions')
          .select('amount, created_at')
          .eq('user_id', ref.id)
          .eq('type', 'FARMING_REWARD')
          .eq('currency', 'UNI')
          .order('created_at', { ascending: false })
          .limit(1);
          
        console.log(`- ${ref.username} (ID: ${ref.id}, приглашен: User ${ref.referred_by})`);
        console.log(`  Депозит: ${ref.uni_deposit_amount?.toLocaleString('ru-RU')} UNI`);
        if (farmingTx && farmingTx.length > 0) {
          console.log(`  Последний доход: +${parseFloat(farmingTx[0].amount).toLocaleString('ru-RU')} UNI`);
        } else {
          console.log(`  Доходов пока нет`);
        }
      }
    }
    
    // 2. Проверяем реферальные комиссии для User 74
    console.log('\n💰 РЕФЕРАЛЬНЫЕ КОМИССИИ USER 74:\n');
    
    const { data: referralRewards, error: rewardsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (referralRewards && referralRewards.length > 0) {
      console.log(`Найдено ${referralRewards.length} транзакций:\n`);
      referralRewards.forEach((tx, i) => {
        console.log(`${i+1}. +${parseFloat(tx.amount).toLocaleString('ru-RU')} ${tx.currency}`);
        console.log(`   ${tx.description}`);
        console.log(`   ${new Date(tx.created_at).toLocaleString('ru-RU')}\n`);
      });
    } else {
      console.log('Реферальных комиссий не найдено');
    }
    
    // 3. Объяснение системы
    console.log('\n📖 КАК РАБОТАЕТ МНОГОУРОВНЕВАЯ СИСТЕМА:\n');
    console.log('1. Реферальные комиссии начисляются ТОЛЬКО когда реферал получает доход');
    console.log('2. User 74 получает комиссии только от прямых рефералов (уровень 1)');
    console.log('3. Рефералы уровня 1 получают комиссии от своих рефералов (уровень 2)');
    console.log('4. И так далее до 20 уровней\n');
    console.log('Пример цепочки:');
    console.log('- test_user_L2_1 получает доход → его пригласитель test_user_L1_1 получает 5%');
    console.log('- test_user_L1_1 получает доход → User 74 получает 5%');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkMultilevelReferrals();