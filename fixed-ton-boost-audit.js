/**
 * ИСПРАВЛЕННАЯ ДИАГНОСТИКА СИСТЕМЫ TON BOOST
 * Точный анализ с корректными SQL запросами
 */

import { createClient } from '@supabase/supabase-js';

async function fixedTonBoostAudit() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🎯 ИСПРАВЛЕННАЯ ДИАГНОСТИКА СИСТЕМЫ TON BOOST');
  console.log('========================================================');
  
  const userId = 48;
  
  // 1. СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ
  console.log('\n📊 1. ТЕКУЩЕЕ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ 48:');
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (userError) {
    console.log('   ❌ Ошибка:', userError.message);
    return;
  }
  
  console.log(`   • ID: ${user.id}`);
  console.log(`   • Telegram ID: ${user.telegram_id}`);
  console.log(`   • Username: ${user.username}`);
  console.log(`   • Баланс TON: ${user.balance_ton}`);
  console.log(`   • Баланс UNI: ${user.balance_uni}`);
  console.log(`   • TON Boost пакет: ${user.ton_boost_package || 'не активирован'}`);
  console.log(`   • TON Boost ставка: ${user.ton_boost_rate || 0}`);
  console.log(`   • TON Boost активен: ${user.ton_boost_active || false}`);
  
  // 2. ВСЕ ТРАНЗАКЦИИ TON ПОЛЬЗОВАТЕЛЯ
  console.log('\n💰 2. ВСЕ TON ТРАНЗАКЦИИ ПОЛЬЗОВАТЕЛЯ:');
  
  const { data: tonTransactions, error: tonError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .not('amount_ton', 'is', null)
    .neq('amount_ton', '0')
    .order('created_at', { ascending: false });
  
  if (tonError) {
    console.log('   ❌ Ошибка:', tonError.message);
  } else {
    console.log(`   • Всего TON транзакций: ${tonTransactions?.length || 0}`);
    
    if (tonTransactions?.length > 0) {
      console.log(`   • Подробности последних 20 транзакций:`);
      tonTransactions.slice(0, 20).forEach((tx, idx) => {
        const time = new Date(tx.created_at).toLocaleString('ru-RU');
        console.log(`     ${idx + 1}. ID: ${tx.id} | ${tx.amount_ton} TON | ${tx.type} | ${time}`);
        console.log(`        Описание: ${tx.description || 'Без описания'}`);
      });
    }
  }
  
  // 3. АНАЛИЗ BOOST ТРАНЗАКЦИЙ ПО ОПИСАНИЮ
  console.log('\n🚀 3. АНАЛИЗ TON BOOST ТРАНЗАКЦИЙ:');
  
  if (tonTransactions?.length > 0) {
    const boostTransactions = tonTransactions.filter(tx => 
      tx.description && (
        tx.description.toLowerCase().includes('boost') ||
        tx.description.toLowerCase().includes('буст')
      )
    );
    
    console.log(`   • TON Boost транзакций: ${boostTransactions.length}`);
    
    if (boostTransactions.length > 0) {
      const now = new Date();
      
      // Группируем по типам
      const incomeTransactions = boostTransactions.filter(tx => 
        tx.description.toLowerCase().includes('доход') ||
        tx.description.toLowerCase().includes('income')
      );
      
      const purchaseTransactions = boostTransactions.filter(tx => 
        tx.description.toLowerCase().includes('покупка') ||
        tx.description.toLowerCase().includes('purchase')
      );
      
      console.log(`   • Транзакции доходов: ${incomeTransactions.length}`);
      console.log(`   • Транзакции покупок: ${purchaseTransactions.length}`);
      
      if (incomeTransactions.length > 0) {
        console.log(`   • Последние доходы:`);
        incomeTransactions.slice(0, 10).forEach((tx, idx) => {
          const time = new Date(tx.created_at).toLocaleString('ru-RU');
          const ago = ((now - new Date(tx.created_at)) / (1000 * 60)).toFixed(1);
          console.log(`     ${idx + 1}. ${tx.amount_ton} TON | ${time} (${ago} мин назад)`);
          console.log(`        ${tx.description}`);
        });
        
        // Анализ интервалов
        if (incomeTransactions.length >= 2) {
          const intervals = [];
          for (let i = 0; i < Math.min(5, incomeTransactions.length - 1); i++) {
            const current = new Date(incomeTransactions[i].created_at);
            const next = new Date(incomeTransactions[i + 1].created_at);
            const intervalMinutes = (current - next) / (1000 * 60);
            intervals.push(intervalMinutes);
          }
          
          const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
          console.log(`   • Средний интервал: ${avgInterval.toFixed(1)} минут`);
          console.log(`   • Интервалы: [${intervals.map(i => i.toFixed(1)).join(', ')}] минут`);
        }
      }
      
      if (purchaseTransactions.length > 0) {
        console.log(`   • Покупки:`);
        purchaseTransactions.forEach((tx, idx) => {
          const time = new Date(tx.created_at).toLocaleString('ru-RU');
          console.log(`     ${idx + 1}. ${tx.amount_ton} TON | ${time}`);
          console.log(`        ${tx.description}`);
        });
      }
    }
  }
  
  // 4. ПРОВЕРКА ТАБЛИЦЫ BOOST_PURCHASES
  console.log('\n📦 4. ПРОВЕРКА ТАБЛИЦЫ BOOST_PURCHASES:');
  
  const { data: boostPurchases, error: boostError } = await supabase
    .from('boost_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (boostError) {
    console.log(`   ⚠️ Таблица boost_purchases: ${boostError.message}`);
  } else {
    console.log(`   • Записей в boost_purchases: ${boostPurchases?.length || 0}`);
    if (boostPurchases?.length > 0) {
      boostPurchases.forEach((purchase, idx) => {
        const time = new Date(purchase.created_at).toLocaleString('ru-RU');
        console.log(`     ${idx + 1}. ID: ${purchase.id} | Пакет: ${purchase.package_id} | Статус: ${purchase.status} | ${time}`);
      });
    }
  }
  
  // 5. РАСЧЕТЫ ДОХОДНОСТИ
  console.log('\n🧮 5. РАСЧЕТЫ ОЖИДАЕМОЙ ДОХОДНОСТИ:');
  
  if (user.ton_boost_package && user.ton_boost_rate && user.balance_ton) {
    const currentBalance = parseFloat(user.balance_ton);
    const deposit = Math.max(0, currentBalance - 10);
    const dailyRate = user.ton_boost_rate;
    const dailyIncome = deposit * dailyRate;
    const fiveMinIncome = dailyIncome / 288; // 24*60/5 = 288 пятиминуток в сутках
    const hourlyIncome = dailyIncome / 24;
    
    console.log(`   • Пакет: ${user.ton_boost_package} (ставка ${(dailyRate * 100).toFixed(1)}%)`);
    console.log(`   • Депозит: ${deposit.toFixed(6)} TON (${currentBalance} - 10)`);
    console.log(`   • Дневной доход: ${dailyIncome.toFixed(6)} TON`);
    console.log(`   • Часовой доход: ${hourlyIncome.toFixed(6)} TON`);
    console.log(`   • Доход за 5 минут: ${fiveMinIncome.toFixed(8)} TON`);
    
    // Сравнение с фактическими данными
    if (tonTransactions?.length > 0) {
      const boostIncomes = tonTransactions.filter(tx => 
        tx.description && tx.description.toLowerCase().includes('boost') &&
        tx.description.toLowerCase().includes('доход')
      );
      
      if (boostIncomes.length > 0) {
        const totalBoostIncome = boostIncomes.reduce((sum, tx) => sum + parseFloat(tx.amount_ton), 0);
        console.log(`   • Фактических начислений: ${boostIncomes.length}`);
        console.log(`   • Общая сумма начислений: ${totalBoostIncome.toFixed(6)} TON`);
        
        // Проверяем последнее начисление
        const lastIncome = boostIncomes[0];
        const lastIncomeTime = new Date(lastIncome.created_at);
        const minutesAgo = (new Date() - lastIncomeTime) / (1000 * 60);
        
        console.log(`   • Последнее начисление: ${lastIncome.amount_ton} TON`);
        console.log(`   • Время последнего: ${minutesAgo.toFixed(1)} минут назад`);
        
        const expectedAmount = parseFloat(fiveMinIncome.toFixed(8));
        const actualAmount = parseFloat(lastIncome.amount_ton);
        const deviation = Math.abs(actualAmount - expectedAmount) / expectedAmount * 100;
        
        console.log(`   • Отклонение от расчета: ${deviation.toFixed(1)}%`);
      }
    }
  }
  
  // 6. АНАЛИЗ АКТИВНОСТИ ПЛАНИРОВЩИКА
  console.log('\n⏱ 6. АНАЛИЗ АКТИВНОСТИ ПЛАНИРОВЩИКА:');
  
  const now = new Date();
  const recentTransactions = tonTransactions?.filter(tx => {
    const txTime = new Date(tx.created_at);
    const minutesAgo = (now - txTime) / (1000 * 60);
    return minutesAgo <= 30 && tx.description && tx.description.toLowerCase().includes('boost');
  }) || [];
  
  console.log(`   • Boost транзакций за 30 минут: ${recentTransactions.length}`);
  
  if (recentTransactions.length > 0) {
    const lastTx = recentTransactions[0];
    const minutesAgo = (now - new Date(lastTx.created_at)) / (1000 * 60);
    
    if (minutesAgo <= 6) {
      console.log(`   • Статус: 🟢 АКТИВЕН (последнее ${minutesAgo.toFixed(1)} мин назад)`);
    } else if (minutesAgo <= 15) {
      console.log(`   • Статус: 🟡 ЗАДЕРЖКА (последнее ${minutesAgo.toFixed(1)} мин назад)`);
    } else {
      console.log(`   • Статус: 🔴 ПРОБЛЕМА (последнее ${minutesAgo.toFixed(1)} мин назад)`);
    }
  } else {
    console.log(`   • Статус: 🔴 НЕ РАБОТАЕТ (нет активности за 30 мин)`);
  }
  
  // 7. ФИНАЛЬНАЯ СВОДКА
  console.log('\n📋 7. ИТОГОВАЯ СВОДКА:');
  console.log('========================================');
  console.log(`✓ Пользователь: ${user.username} (ID: ${user.id})`);
  console.log(`✓ Баланс TON: ${user.balance_ton}`);
  console.log(`✓ Активный пакет: ${user.ton_boost_package || 'НЕТ'}`);
  console.log(`✓ Ставка: ${user.ton_boost_rate ? (user.ton_boost_rate * 100).toFixed(1) + '%' : 'НЕТ'}`);
  console.log(`✓ Всего TON транзакций: ${tonTransactions?.length || 0}`);
  
  const boostTransactionsCount = tonTransactions?.filter(tx => 
    tx.description && tx.description.toLowerCase().includes('boost')
  ).length || 0;
  
  console.log(`✓ Boost транзакций: ${boostTransactionsCount}`);
  
  // Определяем общий статус системы
  let systemStatus = '❌ НЕ РАБОТАЕТ';
  if (user.ton_boost_package && user.ton_boost_rate > 0) {
    if (boostTransactionsCount > 0) {
      const boostTxs = tonTransactions.filter(tx => 
        tx.description && tx.description.toLowerCase().includes('boost')
      );
      if (boostTxs.length > 0) {
        const lastBoostTime = new Date(boostTxs[0].created_at);
        const minutesAgo = (now - lastBoostTime) / (1000 * 60);
        
        if (minutesAgo <= 10) systemStatus = '✅ РАБОТАЕТ НОРМАЛЬНО';
        else if (minutesAgo <= 30) systemStatus = '⚠️ ЕСТЬ ЗАДЕРЖКИ';
        else systemStatus = '❌ НЕ РАБОТАЕТ';
      }
    } else {
      systemStatus = '❌ НЕТ НАЧИСЛЕНИЙ';
    }
  } else {
    systemStatus = '⚪ НЕ АКТИВИРОВАН';
  }
  
  console.log(`✓ Статус системы: ${systemStatus}`);
  console.log('========================================');
}

fixedTonBoostAudit().catch(console.error);