import { supabase } from './core/supabase';
import { logger } from './core/logger';

async function checkReferralSystemV2() {
  console.log('=== ПРОВЕРКА РЕФЕРАЛЬНОЙ СИСТЕМЫ V2 ===\n');
  
  try {
    // 1. Проверяем правильные поля в users
    console.log('1. Проверка реферальных полей в users:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, telegram_id, ref_code, referrer_id, referrer_code, balance_uni, uni_deposit_amount')
      .or('referrer_id.not.is.null,id.eq.74')
      .limit(20);
      
    if (usersError) {
      console.error('Ошибка получения users:', usersError);
    } else {
      console.log(`- Найдено пользователей: ${users?.length || 0}`);
      
      // Группируем по реферерам
      const referralTree: Record<number, any[]> = {};
      
      users?.forEach(user => {
        if (user.referrer_id) {
          if (!referralTree[user.referrer_id]) {
            referralTree[user.referrer_id] = [];
          }
          referralTree[user.referrer_id].push(user);
        }
      });
      
      console.log('\n2. Реферальное дерево:');
      Object.entries(referralTree).forEach(([referrerId, referrals]) => {
        const referrer = users?.find(u => u.id === parseInt(referrerId));
        console.log(`\nРеферер ${referrerId} (${referrer?.username}):`);
        referrals.forEach(ref => {
          console.log(`  - User ${ref.id} (${ref.username}), депозит: ${ref.uni_deposit_amount} UNI`);
        });
      });
    }
    
    // 3. Анализируем транзакции REFERRAL_REWARD
    console.log('\n3. Анализ REFERRAL_REWARD транзакций:');
    const { data: refTx, error: refTxError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (refTxError) {
      console.error('Ошибка:', refTxError);
    } else {
      console.log(`- Найдено транзакций: ${refTx?.length || 0}`);
      
      // Группируем по получателям
      const rewardsByUser: Record<number, {count: number, totalUni: number, totalTon: number}> = {};
      
      refTx?.forEach(tx => {
        if (!rewardsByUser[tx.user_id]) {
          rewardsByUser[tx.user_id] = { count: 0, totalUni: 0, totalTon: 0 };
        }
        rewardsByUser[tx.user_id].count++;
        rewardsByUser[tx.user_id].totalUni += parseFloat(tx.amount_uni || '0');
        rewardsByUser[tx.user_id].totalTon += parseFloat(tx.amount_ton || '0');
      });
      
      console.log('\n4. Статистика реферальных наград по пользователям:');
      Object.entries(rewardsByUser).forEach(([userId, stats]) => {
        console.log(`- User ${userId}: ${stats.count} транзакций, ${stats.totalUni.toFixed(6)} UNI, ${stats.totalTon.toFixed(6)} TON`);
      });
      
      // Анализируем metadata для понимания уровней
      console.log('\n5. Анализ уровней реферальных наград:');
      const levelStats: Record<string, {count: number, totalUni: number}> = {};
      
      refTx?.forEach(tx => {
        const match = tx.description?.match(/Referral L(\d+)/);
        if (match) {
          const level = `L${match[1]}`;
          if (!levelStats[level]) {
            levelStats[level] = { count: 0, totalUni: 0 };
          }
          levelStats[level].count++;
          levelStats[level].totalUni += parseFloat(tx.amount_uni || '0');
        }
      });
      
      Object.entries(levelStats).forEach(([level, stats]) => {
        console.log(`- ${level}: ${stats.count} транзакций, ${stats.totalUni.toFixed(6)} UNI`);
      });
    }
    
    // 6. Проверяем корректность процентов
    console.log('\n6. Проверка корректности процентов:');
    
    // Берем несколько примеров транзакций с разных уровней
    const levels = ['L1', 'L2', 'L3', 'L5', 'L10'];
    
    for (const level of levels) {
      const { data: sample } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'REFERRAL_REWARD')
        .like('description', `%Referral ${level}%`)
        .limit(1)
        .single();
        
      if (sample) {
        // Извлекаем информацию из description
        const match = sample.description?.match(/Referral L(\d+) from User (\d+): ([\d.]+) UNI \((\d+(?:\.\d+)?%?)\)/);
        if (match) {
          const [, levelNum, fromUserId, amount, percentage] = match;
          console.log(`\n${level} пример:`);
          console.log(`- От пользователя ${fromUserId}`);
          console.log(`- Сумма дохода: ${amount} UNI`);
          console.log(`- Процент: ${percentage}`);
          console.log(`- Начислено: ${sample.amount_uni} UNI`);
          
          // Проверяем корректность
          const expectedPercent = levelNum === '1' ? 100 : (21 - parseInt(levelNum));
          console.log(`- Ожидаемый процент: ${expectedPercent}%`);
          
          const calculatedReward = parseFloat(amount) * expectedPercent / 100;
          const actualReward = parseFloat(sample.amount_uni || '0');
          const diff = Math.abs(calculatedReward - actualReward);
          
          console.log(`- Расчетная награда: ${calculatedReward.toFixed(6)} UNI`);
          console.log(`- Соответствие: ${diff < 0.000001 ? 'ДА ✅' : 'НЕТ ❌ (разница: ' + diff.toFixed(6) + ')'}`);
        }
      }
    }
    
    // 7. Проверяем цепочку для пользователя 74
    console.log('\n7. Проверка реферальной цепочки для User 74:');
    
    let currentUser = 74;
    const chain = [];
    const visited = new Set<number>();
    
    while (currentUser && !visited.has(currentUser)) {
      visited.add(currentUser);
      
      const { data: user } = await supabase
        .from('users')
        .select('id, username, referrer_id, uni_deposit_amount, balance_uni')
        .eq('id', currentUser)
        .single();
        
      if (user) {
        chain.push(user);
        currentUser = user.referrer_id;
      } else {
        break;
      }
    }
    
    console.log('\nЦепочка (от пользователя к его реферерам):');
    chain.forEach((user, index) => {
      console.log(`${index === 0 ? '→' : ' '} User ${user.id} (${user.username})`);
      console.log(`  - Баланс: ${user.balance_uni} UNI`);
      console.log(`  - Депозит: ${user.uni_deposit_amount} UNI`);
      if (user.referrer_id) {
        console.log(`  - Приглашен: User ${user.referrer_id}`);
      }
    });
    
    // 8. Проверяем общую сумму реферальных наград
    console.log('\n8. Общая статистика реферальных наград:');
    
    const { data: allRefTx } = await supabase
      .from('transactions')
      .select('amount_uni, amount_ton')
      .eq('type', 'REFERRAL_REWARD');
      
    let totalRefUni = 0;
    let totalRefTon = 0;
    
    allRefTx?.forEach(tx => {
      totalRefUni += parseFloat(tx.amount_uni || '0');
      totalRefTon += parseFloat(tx.amount_ton || '0');
    });
    
    console.log(`- Всего выплачено реферальных наград:`);
    console.log(`  - UNI: ${totalRefUni.toFixed(6)}`);
    console.log(`  - TON: ${totalRefTon.toFixed(6)}`);
    console.log(`- Количество транзакций: ${allRefTx?.length || 0}`);
    
  } catch (error) {
    console.error('Критическая ошибка:', error);
  }
}

checkReferralSystemV2().catch(console.error);