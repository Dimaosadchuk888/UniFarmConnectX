import { supabase } from '../core/supabase.js';
import { BalanceManager } from '../core/BalanceManager.js';
import { UnifiedTransactionService } from '../core/TransactionService.js';
import { ReferralService } from '../modules/referral/service.js';

async function fixReferralFarming() {
  console.log('=== ИСПРАВЛЕНИЕ ФАРМИНГА ДЛЯ РЕФЕРАЛОВ ===\n');
  
  const referralIds = [186, 187, 188, 189, 190];
  
  try {
    // 1. Исправляем процентную ставку
    console.log('📊 ИСПРАВЛЕНИЕ ПРОЦЕНТНОЙ СТАВКИ:');
    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({ 
        uni_farming_rate: 0.01, // 1% в день
        uni_farming_last_update: new Date().toISOString()
      })
      .in('id', referralIds)
      .select();
      
    if (updateError) {
      console.error('Ошибка обновления ставки:', updateError);
      return;
    }
    
    console.log(`✅ Обновлена ставка для ${updateResult?.length || 0} пользователей на 1% в день\n`);
    
    // 2. Рассчитываем и начисляем доход
    console.log('💰 РАСЧЕТ И НАЧИСЛЕНИЕ ДОХОДА:');
    const balanceManager = new BalanceManager();
    const transactionService = UnifiedTransactionService.getInstance();
    const referralService = new ReferralService();
    
    for (const user of updateResult || []) {
      if (!user.uni_farming_active || !user.uni_deposit_amount) {
        console.log(`⚠️ ${user.username}: фарминг не активен или нет депозита`);
        continue;
      }
      
      // Рассчитываем время с начала фарминга
      const startTime = new Date(user.uni_farming_start_timestamp);
      const now = new Date();
      const minutesPassed = (now.getTime() - startTime.getTime()) / 1000 / 60;
      const periodsPassed = Math.floor(minutesPassed / 5); // Периоды по 5 минут
      
      console.log(`\n👤 ${user.username} (ID: ${user.id}):`);
      console.log(`   - Депозит: ${user.uni_deposit_amount} UNI`);
      console.log(`   - Минут с начала: ${minutesPassed.toFixed(0)}`);
      console.log(`   - Периодов (5 мин): ${periodsPassed}`);
      
      if (periodsPassed > 0) {
        // Рассчитываем доход за все пропущенные периоды
        const dailyRate = 0.01; // 1% в день
        const periodRate = dailyRate / 288; // 288 периодов по 5 минут в сутках
        const totalIncome = user.uni_deposit_amount * periodRate * periodsPassed;
        
        console.log(`   - Доход за период: ${totalIncome.toFixed(6)} UNI`);
        
        // Начисляем доход
        await balanceManager.addBalance(user.id, totalIncome, 0, 'farming_income');
        
        // Создаем транзакцию
        const transaction = await transactionService.createTransaction({
          user_id: user.id,
          type: 'FARMING_REWARD',
          amount_uni: totalIncome,
          amount_ton: 0,
          currency: 'UNI',
          status: 'completed',
          description: `UNI farming income: ${totalIncome.toFixed(6)} UNI (${periodsPassed} periods)`,
          metadata: {
            deposit_amount: user.uni_deposit_amount,
            daily_rate: dailyRate,
            periods: periodsPassed
          }
        });
        
        console.log(`   ✅ Транзакция создана: ID ${transaction.id}`);
        
        // Начисляем реферальные комиссии
        console.log(`   🎁 Распределение реферальных комиссий...`);
        await referralService.distributeReferralRewards(
          user.id,
          totalIncome,
          'UNI',
          'farming',
          transaction.id
        );
      }
    }
    
    // 3. Проверяем результаты
    console.log('\n\n📊 ПРОВЕРКА РЕЗУЛЬТАТОВ:');
    const { data: referralRewards, error: rewardError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 184)
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (referralRewards && referralRewards.length > 0) {
      console.log(`\n✅ Найдено реферальных комиссий: ${referralRewards.length}`);
      let totalUni = 0;
      
      referralRewards.forEach(reward => {
        console.log(`- ${reward.description}: +${reward.amount} ${reward.currency}`);
        if (reward.currency === 'UNI') totalUni += parseFloat(reward.amount);
      });
      
      console.log(`\n💰 ИТОГО ПОЛУЧЕНО UNI: ${totalUni.toFixed(6)}`);
    } else {
      console.log('\n⚠️ Реферальные комиссии еще не появились');
      console.log('   Проверьте через несколько секунд');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

fixReferralFarming();