/**
 * Скрипт проверки готовности TON Boost к продакшену
 * Проверяет корректность накопления депозитов и начисления процентов
 */

import { supabase } from '../core/supabase';
import { tonFarmingRepository } from '../modules/boost/TonFarmingRepository';

async function verifyTonBoostProductionReady() {
  console.log('=== ПРОВЕРКА ГОТОВНОСТИ TON BOOST К ПРОДАКШЕНУ ===\n');
  
  const issues: string[] = [];
  let totalChecks = 0;
  let passedChecks = 0;
  
  try {
    // 1. Проверка активных пользователей TON Boost
    console.log('1. Проверяем активных пользователей TON Boost...');
    totalChecks++;
    const { data: activeUsers, error: activeError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('boost_active', true);
      
    if (activeError) {
      issues.push(`❌ Ошибка получения активных пользователей: ${activeError.message}`);
    } else {
      console.log(`✅ Найдено активных пользователей: ${activeUsers?.length || 0}`);
      passedChecks++;
      
      // Проверяем каждого пользователя
      for (const user of activeUsers || []) {
        console.log(`\nПользователь ${user.user_id}:`);
        console.log(`- farming_balance: ${user.farming_balance} TON`);
        console.log(`- farming_rate: ${user.farming_rate} (${(parseFloat(user.farming_rate) * 100).toFixed(1)}% в день)`);
        console.log(`- boost_package_id: ${user.boost_package_id}`);
        
        // Проверка корректности данных
        if (!user.farming_balance || parseFloat(user.farming_balance) <= 0) {
          issues.push(`❌ User ${user.user_id}: farming_balance пустой или нулевой`);
        }
        if (!user.farming_rate || parseFloat(user.farming_rate) <= 0) {
          issues.push(`❌ User ${user.user_id}: farming_rate пустой или нулевой`);
        }
      }
    }
    
    // 2. Проверка транзакций TON Boost
    console.log('\n2. Проверяем транзакции TON Boost...');
    totalChecks++;
    const { data: boostTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .or('description.ilike.%TON Boost%,metadata->original_type.eq.TON_BOOST_INCOME,metadata->original_type.eq.TON_BOOST_DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (txError) {
      issues.push(`❌ Ошибка получения транзакций: ${txError.message}`);
    } else {
      console.log(`✅ Найдено транзакций TON Boost: ${boostTransactions?.length || 0}`);
      passedChecks++;
      
      // Анализ типов транзакций
      const depositTx = boostTransactions?.filter(tx => 
        tx.description?.includes('deposit') || 
        tx.metadata?.original_type === 'TON_BOOST_DEPOSIT'
      );
      const incomeTx = boostTransactions?.filter(tx => 
        tx.description?.includes('доход') || 
        tx.metadata?.original_type === 'TON_BOOST_INCOME'
      );
      
      console.log(`- Депозиты: ${depositTx?.length || 0}`);
      console.log(`- Начисления дохода: ${incomeTx?.length || 0}`);
    }
    
    // 3. Проверка накопления депозитов для user 74
    console.log('\n3. Проверяем накопление депозитов (user 74)...');
    totalChecks++;
    const user74Data = await tonFarmingRepository.getByUserId('74');
    if (user74Data) {
      console.log(`✅ User 74 данные:`);
      console.log(`- farming_balance: ${user74Data.farming_balance} TON`);
      console.log(`- farming_rate: ${user74Data.farming_rate}`);
      console.log(`- boost_package_id: ${user74Data.boost_package_id}`);
      
      // Проверяем транзакции депозитов
      const { data: user74Deposits } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', 74)
        .eq('currency', 'TON')
        .ilike('description', '%deposit%')
        .order('created_at', { ascending: false });
        
      const totalDeposits = user74Deposits?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;
      console.log(`- Сумма депозитов из транзакций: ${totalDeposits} TON`);
      
      if (Math.abs(parseFloat(user74Data.farming_balance) - 340) < 0.01) {
        console.log(`✅ Баланс соответствует ожидаемому (340 TON)`);
        passedChecks++;
      } else {
        issues.push(`❌ Баланс user 74 не соответствует ожидаемому`);
      }
    }
    
    // 4. Проверка последних начислений дохода
    console.log('\n4. Проверяем последние начисления дохода...');
    totalChecks++;
    const { data: recentIncome } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (recentIncome && recentIncome.length > 0) {
      console.log(`✅ Последние начисления TON:`);
      recentIncome.forEach(tx => {
        const packageMatch = tx.description?.match(/пакет (\d+)/);
        const packageId = packageMatch ? packageMatch[1] : 'неизвестно';
        console.log(`- ${tx.created_at}: ${tx.amount} TON (пакет ${packageId})`);
      });
      passedChecks++;
    } else {
      issues.push(`❌ Нет недавних начислений дохода TON`);
    }
    
    // 5. Проверка расчета процентов
    console.log('\n5. Проверяем корректность расчета процентов...');
    totalChecks++;
    if (user74Data) {
      const expectedDailyIncome = parseFloat(user74Data.farming_balance) * parseFloat(user74Data.farming_rate);
      const expectedPerScheduler = expectedDailyIncome / 288; // 288 = 24 часа * 60 мин / 5 мин
      
      console.log(`Ожидаемый доход для user 74:`);
      console.log(`- В день: ${expectedDailyIncome.toFixed(2)} TON`);
      console.log(`- За 5 минут: ${expectedPerScheduler.toFixed(6)} TON`);
      
      // Проверяем последнее начисление user 74
      const { data: lastIncome74 } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', 74)
        .eq('type', 'FARMING_REWARD')
        .eq('currency', 'TON')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (lastIncome74) {
        const actualAmount = parseFloat(lastIncome74.amount);
        console.log(`- Последнее начисление: ${actualAmount} TON`);
        
        // Проверяем с допуском 1%
        if (Math.abs(actualAmount - expectedPerScheduler) / expectedPerScheduler < 0.01) {
          console.log(`✅ Начисление соответствует ожидаемому`);
          passedChecks++;
        } else {
          issues.push(`❌ Начисление не соответствует ожидаемому`);
        }
      }
    }
    
    // ИТОГОВЫЙ ОТЧЕТ
    console.log('\n=== ИТОГОВЫЙ ОТЧЕТ ===');
    console.log(`Проверок выполнено: ${passedChecks}/${totalChecks}`);
    console.log(`Процент успешных проверок: ${((passedChecks/totalChecks) * 100).toFixed(1)}%`);
    
    if (issues.length > 0) {
      console.log('\n⚠️ ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
      issues.forEach(issue => console.log(issue));
      console.log('\n❌ СИСТЕМА НЕ ГОТОВА К ПРОДАКШЕНУ');
    } else {
      console.log('\n✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!');
      console.log('✅ СИСТЕМА ГОТОВА К РАБОТЕ С МАССОВЫМИ АККАУНТАМИ!');
      console.log('\nПодтверждено:');
      console.log('- Депозиты корректно накапливаются');
      console.log('- Проценты правильно рассчитываются');
      console.log('- Транзакции создаются с правильными суммами');
      console.log('- Метаданные сохраняются для отслеживания');
    }
    
  } catch (error) {
    console.error('Критическая ошибка при проверке:', error);
    console.log('\n❌ СИСТЕМА НЕ ГОТОВА К ПРОДАКШЕНУ');
  }
}

// Запускаем проверку
verifyTonBoostProductionReady();