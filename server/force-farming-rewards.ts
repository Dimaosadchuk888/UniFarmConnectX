import { supabase } from '../core/supabase.js';
import { BalanceManager } from '../core/BalanceManager.js';
import { UnifiedTransactionService } from '../core/TransactionService.js';

async function forceFarmingRewards() {
  console.log('=== ПРИНУДИТЕЛЬНОЕ НАЧИСЛЕНИЕ ФАРМИНГА РЕФЕРАЛАМ ===\n');
  
  try {
    // Получаем рефералов с активным фармингом
    const { data: referrals, error } = await supabase
      .from('users')
      .select('*')
      .eq('referred_by', 74)
      .eq('uni_farming_active', true);
      
    if (error) throw error;
    
    console.log(`Найдено ${referrals?.length || 0} рефералов с активным фармингом\n`);
    
    const dailyRate = 0.01; // 1% в день
    const periodsPerDay = 288; // 5 минут = 288 периодов в день
    const ratePerPeriod = dailyRate / periodsPerDay;
    
    for (const ref of referrals || []) {
      const depositAmount = ref.uni_deposit_amount || 0;
      if (depositAmount <= 0) continue;
      
      const income = depositAmount * ratePerPeriod;
      
      console.log(`${ref.username} (ID: ${ref.id})`);
      console.log(`- Депозит: ${depositAmount.toLocaleString('ru-RU')} UNI`);
      console.log(`- Начисление за 5 минут: ${income.toFixed(6)} UNI`);
      
      // Начисляем доход
      await BalanceManager.addBalance(ref.id, income, 'UNI');
      
      // Создаем транзакцию
      const tx = await UnifiedTransactionService.createTransaction({
        user_id: ref.id,
        type: 'FARMING_REWARD',
        amount: income.toString(),
        currency: 'UNI',
        status: 'completed',
        description: `UNI farming income: ${income.toFixed(6)} UNI (rate: ${dailyRate})`,
        metadata: {
          source: 'force_farming_rewards',
          deposit_amount: depositAmount,
          rate: dailyRate
        }
      });
      
      console.log(`✅ Транзакция создана: ID ${tx.id}\n`);
    }
    
    console.log('Теперь проверяем реферальные начисления...\n');
    
    // Ждем 2 секунды чтобы система обработала транзакции
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Проверяем реферальные начисления
    const { data: referralRewards, error: rewardsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (!rewardsError && referralRewards && referralRewards.length > 0) {
      console.log('💰 РЕФЕРАЛЬНЫЕ КОМИССИИ НАЧИСЛЕНЫ:\n');
      referralRewards.forEach(tx => {
        console.log(`+${parseFloat(tx.amount).toLocaleString('ru-RU')} ${tx.currency}`);
        console.log(`${tx.description}`);
        console.log(`${new Date(tx.created_at).toLocaleString('ru-RU')}\n`);
      });
    } else {
      console.log('⚠️ Реферальные комиссии еще не начислены');
      console.log('Возможно, нужно подождать следующего цикла планировщика');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

forceFarmingRewards();