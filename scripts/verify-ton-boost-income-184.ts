/**
 * Проверка корректности начислений TON Boost доходов пользователя 184
 */

import { supabase } from '../core/supabase';

async function verifyTonBoostIncome() {
  console.log('📊 ПРОВЕРКА КОРРЕКТНОСТИ НАЧИСЛЕНИЙ TON BOOST ДОХОДОВ');
  console.log('=' .repeat(65));
  
  const userId = 184;
  
  try {
    // 1. Получаем текущее состояние
    console.log('\n💰 ТЕКУЩЕЕ СОСТОЯНИЕ:');
    const { data: user } = await supabase
      .from('users')
      .select('balance_ton, ton_boost_active, ton_boost_rate')
      .eq('id', userId)
      .single();
    
    const { data: farmingData } = await supabase
      .from('ton_farming_data')
      .select('farming_balance, farming_rate')
      .eq('user_id', userId.toString())
      .single();
    
    console.log('Текущий баланс TON:', user?.balance_ton);
    console.log('TON Boost активен:', user?.ton_boost_active);
    console.log('Курс из users:', user?.ton_boost_rate, 'TON/сек');
    console.log('Депозит фарминга:', farmingData?.farming_balance, 'TON');
    console.log('Курс фарминга:', farmingData?.farming_rate, 'TON/сек');
    
    // 2. Анализируем доходные транзакции за последние 30 минут
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    console.log('\n📈 АНАЛИЗ ДОХОДНЫХ ТРАНЗАКЦИЙ (последние 30 минут):');
    const { data: incomeTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyMinutesAgo)
      .in('type', ['FARMING_REWARD', 'TON_BOOST_REWARD'])
      .eq('currency', 'TON')
      .order('created_at', { ascending: false });
    
    if (incomeTransactions && incomeTransactions.length > 0) {
      console.log(`Найдено ${incomeTransactions.length} доходных транзакций:`);
      
      let totalIncome = 0;
      incomeTransactions.forEach((t, i) => {
        const amount = parseFloat(t.amount || '0');
        totalIncome += amount;
        console.log(`${i+1}. ${t.created_at}: +${amount} TON (${t.type})`);
        console.log(`   Описание: ${t.description}`);
      });
      
      console.log(`\n💰 Общий доход за 30 минут: ${totalIncome} TON`);
      
      // 3. Проверяем расчетную корректность
      if (farmingData?.farming_rate) {
        const rate = parseFloat(farmingData.farming_rate);
        const timePassedSeconds = incomeTransactions.length * 300; // Предполагаем начисления каждые 5 минут
        const expectedIncome = rate * timePassedSeconds;
        
        console.log('\n🧮 ПРОВЕРКА КОРРЕКТНОСТИ:');
        console.log(`Курс: ${rate} TON/сек`);
        console.log(`Время: ${timePassedSeconds} секунд (${timePassedSeconds/60} минут)`);
        console.log(`Ожидаемый доход: ${expectedIncome} TON`);
        console.log(`Фактический доход: ${totalIncome} TON`);
        console.log(`Отклонение: ${Math.abs(expectedIncome - totalIncome)} TON`);
        
        if (Math.abs(expectedIncome - totalIncome) < 0.001) {
          console.log('✅ НАЧИСЛЕНИЯ КОРРЕКТНЫ');
        } else {
          console.log('❌ ОБНАРУЖЕНО ОТКЛОНЕНИЕ В НАЧИСЛЕНИЯХ');
        }
      }
    } else {
      console.log('❌ НЕТ ДОХОДНЫХ ТРАНЗАКЦИЙ ЗА ПОСЛЕДНИЕ 30 МИНУТ');
    }
    
    // 4. Проверяем пакеты и их курсы
    console.log('\n📦 ПРОВЕРКА КУРСОВ ПАКЕТОВ:');
    const { data: packages } = await supabase
      .from('boost_packages')
      .select('*')
      .order('id');
    
    if (packages) {
      packages.forEach(p => {
        const dailyRate = parseFloat(p.rate_ton_per_second) * 86400;
        const annualRate = (dailyRate / parseFloat(p.min_amount)) * 365 * 100;
        console.log(`Пакет "${p.name}": ${p.rate_ton_per_second} TON/сек`);
        console.log(`  Дневной доход: ${dailyRate} TON/день`);
        console.log(`  Годовая доходность: ${annualRate.toFixed(0)}%`);
      });
    }
    
    // 5. Симуляция ожидаемого дохода
    if (farmingData?.farming_rate && farmingData?.farming_balance) {
      const rate = parseFloat(farmingData.farming_rate);
      const deposit = parseFloat(farmingData.farming_balance);
      
      console.log('\n🚀 СИМУЛЯЦИЯ ОЖИДАЕМЫХ ДОХОДОВ:');
      console.log(`За 5 минут: ${rate * 300} TON`);
      console.log(`За час: ${rate * 3600} TON`);
      console.log(`За день: ${rate * 86400} TON`);
      console.log(`Дневная доходность: ${((rate * 86400) / deposit * 100).toFixed(2)}%`);
    }
    
  } catch (error) {
    console.error('💥 Ошибка при проверке:', error);
  }
}

// Запуск
verifyTonBoostIncome().then(() => {
  console.log('\n✅ Проверка завершена');
  process.exit(0);
}).catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});