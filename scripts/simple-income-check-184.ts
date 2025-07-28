/**
 * Простая проверка доходов пользователя 184
 */

import { supabase } from '../core/supabase';

async function simpleIncomeCheck() {
  console.log('💰 ПРОВЕРКА ДОХОДНЫХ НАЧИСЛЕНИЙ ПОЛЬЗОВАТЕЛЯ 184');
  console.log('=' .repeat(50));
  
  try {
    // Проверяем за последние 4 часа
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    
    const { data: incomeTransactions } = await supabase
      .from('transactions')
      .select('id, created_at, amount, currency, type, description')
      .eq('user_id', 184)
      .gte('created_at', fourHoursAgo)
      .eq('currency', 'TON')
      .in('type', ['FARMING_REWARD', 'TON_BOOST_REWARD'])
      .order('created_at', { ascending: false });
    
    console.log(`Найдено доходных транзакций за 4 часа: ${incomeTransactions?.length || 0}`);
    
    if (incomeTransactions && incomeTransactions.length > 0) {
      let totalIncome = 0;
      incomeTransactions.forEach((t, i) => {
        const amount = parseFloat(t.amount);
        totalIncome += amount;
        console.log(`${i+1}. +${amount} TON - ${t.created_at}`);
      });
      console.log(`\nОбщий доход: ${totalIncome} TON`);
    } else {
      console.log('\n❌ НЕТ ДОХОДНЫХ НАЧИСЛЕНИЙ');
    }
    
    // Проверяем последние транзакции любого типа
    console.log('\n📋 ПОСЛЕДНИЕ 5 ТРАНЗАКЦИЙ:');
    const { data: lastTrans } = await supabase
      .from('transactions')
      .select('created_at, amount, currency, type, description')
      .eq('user_id', 184)
      .order('created_at', { ascending: false })
      .limit(5);
    
    lastTrans?.forEach((t, i) => {
      console.log(`${i+1}. ${t.amount} ${t.currency} (${t.type}) - ${t.created_at.split('T')[1].split('.')[0]}`);
    });
    
    // Анализ состояния
    console.log('\n🔍 АНАЛИЗ:');
    console.log('- Депозит в фарминге: 10 TON');
    console.log('- Курс: 0.015 TON/сек');
    console.log('- Ожидаемый доход за 5 минут: 4.5 TON');
    console.log('- Ожидаемый доход за час: 54 TON');
    
    if (!incomeTransactions || incomeTransactions.length === 0) {
      console.log('\n⚠️ ПРОБЛЕМА: Планировщик не работает или не начисляет доходы');
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

simpleIncomeCheck().then(() => process.exit(0));