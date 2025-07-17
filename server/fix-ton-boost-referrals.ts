import { supabase } from '../core/supabase.js';
import { BalanceManager } from '../core/BalanceManager.js';
import { UnifiedTransactionService } from '../core/TransactionService.js';
import { ReferralService } from '../modules/referral/service.js';

// Конфигурация boost пакетов
const BOOST_PACKAGES = [
  { id: 1, amount: 10, daily_rate: 0.005, duration_days: 30 }, // 0.5% в день
  { id: 2, amount: 25, daily_rate: 0.0075, duration_days: 30 }, // 0.75% в день
  { id: 3, amount: 50, daily_rate: 0.01, duration_days: 30 }, // 1% в день
  { id: 4, amount: 100, daily_rate: 0.0125, duration_days: 30 }, // 1.25% в день
  { id: 5, amount: 250, daily_rate: 0.015, duration_days: 30 }, // 1.5% в день
  { id: 6, amount: 500, daily_rate: 0.02, duration_days: 30 } // 2% в день
];

async function fixTonBoostReferrals() {
  console.log('=== ИСПРАВЛЕНИЕ TON BOOST ДЛЯ РЕФЕРАЛОВ ===\n');
  
  const referralIds = [186, 187, 188, 189, 190];
  
  try {
    // 1. Исправляем процентную ставку в ton_farming_data
    console.log('📊 ИСПРАВЛЕНИЕ ПРОЦЕНТНОЙ СТАВКИ TON BOOST:');
    const { data: farmingData, error: fetchError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .in('user_id', referralIds);
      
    if (fetchError || !farmingData) {
      console.error('Ошибка получения данных:', fetchError);
      return;
    }
    
    console.log(`Найдено записей: ${farmingData.length}`);
    
    // Обновляем ставку для каждого пользователя
    for (const data of farmingData) {
      const boostPackage = BOOST_PACKAGES.find(p => p.id === data.boost_package_id);
      if (!boostPackage) {
        console.log(`⚠️ Не найден пакет для boost_package_id: ${data.boost_package_id}`);
        continue;
      }
      
      const { error: updateError } = await supabase
        .from('ton_farming_data')
        .update({ 
          farming_rate: boostPackage.daily_rate,
          farming_last_update: new Date().toISOString()
        })
        .eq('user_id', data.user_id);
        
      if (updateError) {
        console.error(`Ошибка обновления для user ${data.user_id}:`, updateError);
      } else {
        console.log(`✅ Обновлена ставка для user ${data.user_id}: ${boostPackage.daily_rate * 100}% в день`);
      }
    }
    
    // 2. Получаем обновленные данные
    const { data: updatedData, error: refetchError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .in('user_id', referralIds);
      
    if (refetchError || !updatedData) {
      console.error('Ошибка получения обновленных данных:', refetchError);
      return;
    }
    
    // 3. Рассчитываем и начисляем доход
    console.log('\n💰 РАСЧЕТ И НАЧИСЛЕНИЕ TON ДОХОДА:');
    const balanceManager = new BalanceManager();
    const transactionService = UnifiedTransactionService.getInstance();
    const referralService = new ReferralService();
    
    for (const data of updatedData) {
      // Получаем данные пользователя
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user_id)
        .single();
        
      if (userError || !user) {
        console.error(`Ошибка получения пользователя ${data.user_id}:`, userError);
        continue;
      }
      
      // Рассчитываем время с начала фарминга
      const startTime = new Date(data.farming_start_timestamp);
      const now = new Date();
      const minutesPassed = (now.getTime() - startTime.getTime()) / 1000 / 60;
      const periodsPassed = Math.floor(minutesPassed / 5); // Периоды по 5 минут
      
      console.log(`\n👤 ${user.username} (ID: ${user.id}):`);
      console.log(`   - TON депозит: ${data.farming_balance} TON`);
      console.log(`   - Ставка: ${data.farming_rate * 100}% в день`);
      console.log(`   - Минут с начала: ${minutesPassed.toFixed(0)}`);
      console.log(`   - Периодов (5 мин): ${periodsPassed}`);
      
      if (periodsPassed > 0) {
        // Рассчитываем доход за все пропущенные периоды
        const dailyRate = data.farming_rate;
        const periodRate = dailyRate / 288; // 288 периодов по 5 минут в сутках
        const totalIncome = data.farming_balance * periodRate * periodsPassed;
        
        console.log(`   - Доход за период: ${totalIncome.toFixed(6)} TON`);
        
        // Начисляем доход
        await balanceManager.addBalance(user.id, 0, totalIncome, 'ton_boost_income');
        
        // Создаем транзакцию
        const transaction = await transactionService.createTransaction({
          user_id: user.id,
          type: 'FARMING_REWARD',
          amount_uni: 0,
          amount_ton: totalIncome,
          currency: 'TON',
          status: 'completed',
          description: `TON Boost income: ${totalIncome.toFixed(6)} TON (${periodsPassed} periods)`,
          metadata: {
            original_type: 'TON_BOOST_INCOME',
            transaction_source: 'ton_boost_scheduler',
            boost_package_id: data.boost_package_id,
            farming_balance: data.farming_balance,
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
          'TON',
          'ton_boost',
          transaction.id
        );
        
        // Обновляем последнее время обновления
        await supabase
          .from('ton_farming_data')
          .update({ farming_last_update: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    }
    
    // 4. Проверяем результаты
    console.log('\n\n📊 ПРОВЕРКА РЕЗУЛЬТАТОВ:');
    const { data: referralRewards, error: rewardError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 184)
      .eq('type', 'REFERRAL_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (referralRewards && referralRewards.length > 0) {
      console.log(`\n✅ Найдено TON реферальных комиссий: ${referralRewards.length}`);
      let totalTon = 0;
      
      referralRewards.forEach(reward => {
        console.log(`- ${reward.description}: +${reward.amount} TON`);
        totalTon += parseFloat(reward.amount);
      });
      
      console.log(`\n💰 ИТОГО ПОЛУЧЕНО TON: ${totalTon.toFixed(6)}`);
    } else {
      console.log('\n⚠️ TON реферальные комиссии еще не появились');
      console.log('   Проверьте через несколько секунд');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

fixTonBoostReferrals();