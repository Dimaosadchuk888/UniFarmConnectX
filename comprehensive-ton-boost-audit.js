/**
 * ПОЛНАЯ ДИАГНОСТИКА СИСТЕМЫ TON BOOST
 * Комплексная проверка всех компонентов согласно техническому заданию
 */

import { createClient } from '@supabase/supabase-js';

async function comprehensiveTonBoostAudit() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🎯 ПОЛНАЯ ДИАГНОСТИКА СИСТЕМЫ TON BOOST');
  console.log('=' * 60);
  
  const userId = 48;
  
  // 1. АНАЛИЗ ТЕКУЩЕГО СОСТОЯНИЯ ПОЛЬЗОВАТЕЛЯ
  console.log('\n📊 1. ТЕКУЩЕЕ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ 48:');
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_package, ton_boost_rate, ton_boost_active')
    .eq('id', userId)
    .single();
  
  if (userError) {
    console.log('   ❌ Ошибка получения пользователя:', userError.message);
    return;
  }
  
  console.log(`   • Баланс TON: ${user.balance_ton}`);
  console.log(`   • Активный пакет: ${user.ton_boost_package || 'не активирован'}`);
  console.log(`   • Ставка: ${user.ton_boost_rate || 0}%`);
  console.log(`   • Статус активности: ${user.ton_boost_active || false}`);
  
  // 2. АНАЛИЗ ПОКУПОК BOOST ПАКЕТОВ
  console.log('\n🔁 2. АНАЛИЗ ПОКУПОК BOOST ПАКЕТОВ:');
  
  // Проверяем таблицу boost_purchases (если существует)
  const { data: boostPurchases, error: boostError } = await supabase
    .from('boost_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (boostError && !boostError.message.includes('does not exist')) {
    console.log('   ❌ Ошибка получения покупок:', boostError.message);
  } else if (boostError) {
    console.log('   ⚠️ Таблица boost_purchases не существует');
  } else {
    console.log(`   • Всего покупок в boost_purchases: ${boostPurchases?.length || 0}`);
    if (boostPurchases?.length > 0) {
      boostPurchases.forEach((purchase, idx) => {
        console.log(`     ${idx + 1}. ID: ${purchase.id}, Пакет: ${purchase.package_id}, Статус: ${purchase.status}, Дата: ${purchase.created_at}`);
      });
    }
  }
  
  // Ищем транзакции покупки TON Boost
  const { data: purchaseTransactions, error: purchaseError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .or('description.ilike.%boost%,description.ilike.%покупка%')
    .order('created_at', { ascending: false });
  
  if (purchaseError) {
    console.log('   ❌ Ошибка получения транзакций покупки:', purchaseError.message);
  } else {
    console.log(`   • Транзакций покупки Boost: ${purchaseTransactions?.length || 0}`);
    if (purchaseTransactions?.length > 0) {
      purchaseTransactions.forEach((tx, idx) => {
        console.log(`     ${idx + 1}. ID: ${tx.id}, Сумма: ${tx.amount} ${tx.currency}, Описание: ${tx.description}, Дата: ${tx.created_at}`);
      });
    }
  }
  
  // 3. АНАЛИЗ НАЧИСЛЕНИЙ ОТ ПЛАНИРОВЩИКА
  console.log('\n⏱ 3. АНАЛИЗ НАЧИСЛЕНИЙ ОТ ПЛАНИРОВЩИКА:');
  
  const { data: boostIncomeTransactions, error: incomeError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', 'TON')
    .or('description.ilike.%TON Boost доход%,description.ilike.%boost income%')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (incomeError) {
    console.log('   ❌ Ошибка получения транзакций доходов:', incomeError.message);
  } else {
    console.log(`   • Всего начислений TON Boost: ${boostIncomeTransactions?.length || 0}`);
    
    if (boostIncomeTransactions?.length > 0) {
      // Группируем по дням для анализа
      const incomeByDay = {};
      let totalIncome = 0;
      
      boostIncomeTransactions.forEach(tx => {
        const date = new Date(tx.created_at).toISOString().split('T')[0];
        if (!incomeByDay[date]) incomeByDay[date] = [];
        incomeByDay[date].push(tx);
        totalIncome += parseFloat(tx.amount);
      });
      
      console.log(`   • Общая сумма начислений: ${totalIncome.toFixed(8)} TON`);
      console.log(`   • Начисления по дням:`);
      
      Object.keys(incomeByDay).sort().reverse().forEach(date => {
        const dayIncome = incomeByDay[date];
        const dayTotal = dayIncome.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        console.log(`     ${date}: ${dayIncome.length} начислений, ${dayTotal.toFixed(6)} TON`);
      });
      
      // Последние 10 начислений
      console.log(`   • Последние 10 начислений:`);
      boostIncomeTransactions.slice(0, 10).forEach((tx, idx) => {
        const time = new Date(tx.created_at).toLocaleString('ru-RU');
        console.log(`     ${idx + 1}. ${tx.amount} TON | ${time} | ${tx.description}`);
      });
    }
  }
  
  // 4. АНАЛИЗ ИНТЕРВАЛОВ НАЧИСЛЕНИЙ
  console.log('\n📈 4. АНАЛИЗ ИНТЕРВАЛОВ НАЧИСЛЕНИЙ:');
  
  if (boostIncomeTransactions?.length >= 2) {
    const intervals = [];
    for (let i = 0; i < Math.min(10, boostIncomeTransactions.length - 1); i++) {
      const current = new Date(boostIncomeTransactions[i].created_at);
      const next = new Date(boostIncomeTransactions[i + 1].created_at);
      const intervalMinutes = (current - next) / (1000 * 60);
      intervals.push(intervalMinutes);
    }
    
    const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
    console.log(`   • Средний интервал между начислениями: ${avgInterval.toFixed(1)} минут`);
    console.log(`   • Интервалы последних начислений: ${intervals.slice(0, 5).map(i => i.toFixed(1)).join(', ')} минут`);
    
    // Проверяем, есть ли начисления за последние 10 минут
    const now = new Date();
    const recentTransactions = boostIncomeTransactions.filter(tx => {
      const txTime = new Date(tx.created_at);
      return (now - txTime) / (1000 * 60) <= 10;
    });
    
    console.log(`   • Начислений за последние 10 минут: ${recentTransactions.length}`);
    if (recentTransactions.length > 0) {
      console.log(`     Последнее: ${recentTransactions[0].amount} TON | ${new Date(recentTransactions[0].created_at).toLocaleString('ru-RU')}`);
    }
  }
  
  // 5. РАСЧЕТНАЯ ПРОВЕРКА ДОХОДНОСТИ
  console.log('\n🧮 5. РАСЧЕТНАЯ ПРОВЕРКА ДОХОДНОСТИ:');
  
  if (user.ton_boost_package && user.ton_boost_rate && user.balance_ton) {
    const currentBalance = parseFloat(user.balance_ton);
    const deposit = Math.max(0, currentBalance - 10);
    const dailyRate = user.ton_boost_rate;
    const dailyIncome = deposit * dailyRate;
    const fiveMinIncome = dailyIncome / 288;
    const hourlyIncome = dailyIncome / 24;
    
    console.log(`   • Текущий депозит: ${deposit} TON (баланс ${currentBalance} - резерв 10)`);
    console.log(`   • Дневная ставка: ${(dailyRate * 100).toFixed(1)}%`);
    console.log(`   • Ожидаемый дневной доход: ${dailyIncome.toFixed(6)} TON`);
    console.log(`   • Ожидаемый доход за 5 минут: ${fiveMinIncome.toFixed(8)} TON`);
    console.log(`   • Ожидаемый часовой доход: ${hourlyIncome.toFixed(6)} TON`);
    
    // Сравнение с фактическими начислениями
    if (boostIncomeTransactions?.length > 0) {
      const lastHourTransactions = boostIncomeTransactions.filter(tx => {
        const txTime = new Date(tx.created_at);
        return (now - txTime) / (1000 * 60 * 60) <= 1;
      });
      
      if (lastHourTransactions.length > 0) {
        const actualHourlyIncome = lastHourTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        const deviation = Math.abs(actualHourlyIncome - hourlyIncome) / hourlyIncome * 100;
        
        console.log(`   • Фактический доход за час: ${actualHourlyIncome.toFixed(6)} TON`);
        console.log(`   • Отклонение от расчетного: ${deviation.toFixed(1)}%`);
      }
    }
  }
  
  // 6. ПРОВЕРКА ОБЩИХ ТРАНЗАКЦИЙ TON
  console.log('\n💰 6. ОБЩИЙ АНАЛИЗ ТРАНЗАКЦИЙ TON:');
  
  const { data: allTonTransactions, error: allTonError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (allTonError) {
    console.log('   ❌ Ошибка получения всех TON транзакций:', allTonError.message);
  } else {
    console.log(`   • Всего TON транзакций: ${allTonTransactions?.length || 0}`);
    
    if (allTonTransactions?.length > 0) {
      // Группировка по типам
      const transactionTypes = {};
      let totalIncome = 0;
      let totalOutcome = 0;
      
      allTonTransactions.forEach(tx => {
        const amount = parseFloat(tx.amount);
        const description = tx.description || 'Без описания';
        
        // Определяем тип транзакции
        let type = 'Другое';
        if (description.includes('TON Boost доход')) type = 'TON Boost доход';
        else if (description.includes('покупка') || description.includes('purchase')) type = 'Покупка';
        else if (description.includes('депозит') || description.includes('deposit')) type = 'Депозит';
        else if (description.includes('withdraw') || description.includes('вывод')) type = 'Вывод';
        
        if (!transactionTypes[type]) transactionTypes[type] = { count: 0, sum: 0 };
        transactionTypes[type].count++;
        transactionTypes[type].sum += amount;
        
        if (amount > 0) totalIncome += amount;
        else totalOutcome += Math.abs(amount);
      });
      
      console.log(`   • Типы транзакций:`);
      Object.keys(transactionTypes).forEach(type => {
        const data = transactionTypes[type];
        console.log(`     ${type}: ${data.count} транзакций, ${data.sum.toFixed(6)} TON`);
      });
      
      console.log(`   • Общий приход: ${totalIncome.toFixed(6)} TON`);
      console.log(`   • Общий расход: ${totalOutcome.toFixed(6)} TON`);
      console.log(`   • Баланс транзакций: ${(totalIncome - totalOutcome).toFixed(6)} TON`);
    }
  }
  
  // 7. ФИНАЛЬНАЯ СВОДКА
  console.log('\n📋 7. ФИНАЛЬНАЯ СВОДКА ДИАГНОСТИКИ:');
  
  const summary = {
    currentBalance: user.balance_ton,
    activePackage: user.ton_boost_package,
    boostRate: user.ton_boost_rate,
    totalBoostTransactions: boostIncomeTransactions?.length || 0,
    totalTonTransactions: allTonTransactions?.length || 0,
    systemStatus: 'unknown'
  };
  
  // Определяем статус системы
  if (user.ton_boost_package && user.ton_boost_rate > 0) {
    if (boostIncomeTransactions?.length > 0) {
      const lastIncomeTime = new Date(boostIncomeTransactions[0].created_at);
      const minutesSinceLastIncome = (now - lastIncomeTime) / (1000 * 60);
      
      if (minutesSinceLastIncome <= 10) {
        summary.systemStatus = '🟢 РАБОТАЕТ (последнее начисление < 10 мин назад)';
      } else if (minutesSinceLastIncome <= 30) {
        summary.systemStatus = '🟡 ЗАДЕРЖКА (последнее начисление ' + minutesSinceLastIncome.toFixed(0) + ' мин назад)';
      } else {
        summary.systemStatus = '🔴 НЕ РАБОТАЕТ (последнее начисление > 30 мин назад)';
      }
    } else {
      summary.systemStatus = '🔴 НЕ РАБОТАЕТ (нет начислений)';
    }
  } else {
    summary.systemStatus = '⚪ НЕ АКТИВИРОВАН';
  }
  
  console.log(`   • Текущий баланс: ${summary.currentBalance} TON`);
  console.log(`   • Активный пакет: ${summary.activePackage || 'нет'}`);
  console.log(`   • Ставка: ${(summary.boostRate * 100).toFixed(1)}%`);
  console.log(`   • Начислений TON Boost: ${summary.totalBoostTransactions}`);
  console.log(`   • Всего TON транзакций: ${summary.totalTonTransactions}`);
  console.log(`   • Статус системы: ${summary.systemStatus}`);
  
  console.log('\n' + '=' * 60);
  console.log('🎯 ДИАГНОСТИКА ЗАВЕРШЕНА');
}

comprehensiveTonBoostAudit().catch(console.error);