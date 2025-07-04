/**
 * ФИНАЛЬНЫЙ ОТЧЕТ ПО ДИАГНОСТИКЕ TON BOOST СИСТЕМЫ
 * Полная сводка всех результатов диагностики согласно техническому заданию
 */

import { createClient } from '@supabase/supabase-js';

async function generateFinalReport() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('📋 ФИНАЛЬНЫЙ ОТЧЕТ: ДИАГНОСТИКА СИСТЕМЫ TON BOOST');
  console.log('='.repeat(70));
  console.log('Дата и время: ' + new Date().toLocaleString('ru-RU'));
  console.log('Пользователь: demo_user (ID: 48, Telegram ID: 88888888)');
  
  const userId = 48;
  
  // БЛОК 1: ТЕКУЩЕЕ СОСТОЯНИЕ СИСТЕМЫ
  console.log('\n' + '='.repeat(70));
  console.log('1️⃣  ТЕКУЩЕЕ СОСТОЯНИЕ СИСТЕМЫ');
  console.log('='.repeat(70));
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (userError) {
    console.log('❌ КРИТИЧЕСКАЯ ОШИБКА: Пользователь не найден');
    return;
  }
  
  console.log('🔹 ОСНОВНЫЕ ДАННЫЕ:');
  console.log(`   Баланс TON: ${user.balance_ton}`);
  console.log(`   Баланс UNI: ${user.balance_uni}`);
  console.log(`   TON Boost пакет: ${user.ton_boost_package || 'НЕ АКТИВИРОВАН'}`);
  console.log(`   TON Boost ставка: ${user.ton_boost_rate ? (user.ton_boost_rate * 100).toFixed(1) + '%' : 'НЕТ'}`);
  console.log(`   Статус активности: ${user.ton_boost_active || false}`);
  
  // БЛОК 2: АНАЛИЗ ПОКУПОК BOOST ПАКЕТОВ
  console.log('\n' + '='.repeat(70));
  console.log('2️⃣  АНАЛИЗ ПОКУПОК BOOST ПАКЕТОВ');
  console.log('='.repeat(70));
  
  // Проверяем таблицу boost_purchases
  const { data: boostPurchases, error: boostError } = await supabase
    .from('boost_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  console.log('🔹 ЗАПИСИ В ТАБЛИЦЕ BOOST_PURCHASES:');
  if (boostError) {
    console.log(`   ⚠️  Таблица недоступна: ${boostError.message}`);
    console.log('   📌 Система использует альтернативный метод хранения через users.ton_boost_package');
  } else {
    console.log(`   📊 Всего записей: ${boostPurchases?.length || 0}`);
    if (boostPurchases?.length > 0) {
      boostPurchases.forEach((purchase, idx) => {
        const time = new Date(purchase.created_at).toLocaleString('ru-RU');
        console.log(`     ${idx + 1}. ID: ${purchase.id} | Пакет: ${purchase.package_id} | Статус: ${purchase.status} | ${time}`);
      });
    } else {
      console.log('   📝 Нет записей покупок в boost_purchases');
    }
  }
  
  // Анализируем транзакции покупок
  const { data: allTransactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .not('amount_ton', 'is', null)
    .neq('amount_ton', '0')
    .order('created_at', { ascending: false });
  
  if (!txError && allTransactions?.length > 0) {
    const purchaseTransactions = allTransactions.filter(tx => 
      tx.description && (
        tx.description.toLowerCase().includes('покупка') ||
        tx.description.toLowerCase().includes('purchase') ||
        tx.description.toLowerCase().includes('списание')
      )
    );
    
    console.log('\n🔹 ТРАНЗАКЦИИ ПОКУПОК:');
    console.log(`   📊 Найдено транзакций покупок: ${purchaseTransactions.length}`);
    
    if (purchaseTransactions.length > 0) {
      purchaseTransactions.forEach((tx, idx) => {
        const time = new Date(tx.created_at).toLocaleString('ru-RU');
        console.log(`     ${idx + 1}. ${tx.amount_ton} TON | ${time} | ${tx.description}`);
      });
    }
  }
  
  // БЛОК 3: АНАЛИЗ ПЛАНИРОВЩИКА НАЧИСЛЕНИЙ
  console.log('\n' + '='.repeat(70));
  console.log('3️⃣  АНАЛИЗ ПЛАНИРОВЩИКА НАЧИСЛЕНИЙ');
  console.log('='.repeat(70));
  
  if (!txError && allTransactions?.length > 0) {
    const boostIncomeTransactions = allTransactions.filter(tx => 
      tx.description && (
        tx.description.toLowerCase().includes('boost') &&
        (tx.description.toLowerCase().includes('доход') || tx.description.toLowerCase().includes('income'))
      )
    );
    
    console.log('🔹 НАЧИСЛЕНИЯ OT TON BOOST:');
    console.log(`   📊 Всего начислений: ${boostIncomeTransactions.length}`);
    
    if (boostIncomeTransactions.length > 0) {
      const totalIncome = boostIncomeTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount_ton), 0);
      console.log(`   💰 Общая сумма начислений: ${totalIncome.toFixed(8)} TON`);
      
      // Анализ последних начислений
      console.log('\n🔹 ПОСЛЕДНИЕ 10 НАЧИСЛЕНИЙ:');
      boostIncomeTransactions.slice(0, 10).forEach((tx, idx) => {
        const time = new Date(tx.created_at).toLocaleString('ru-RU');
        const minutesAgo = ((new Date() - new Date(tx.created_at)) / (1000 * 60)).toFixed(1);
        console.log(`     ${idx + 1}. ${tx.amount_ton} TON | ${time} (${minutesAgo} мин назад)`);
      });
      
      // Анализ интервалов
      if (boostIncomeTransactions.length >= 2) {
        console.log('\n🔹 АНАЛИЗ ИНТЕРВАЛОВ НАЧИСЛЕНИЙ:');
        const intervals = [];
        for (let i = 0; i < Math.min(5, boostIncomeTransactions.length - 1); i++) {
          const current = new Date(boostIncomeTransactions[i].created_at);
          const next = new Date(boostIncomeTransactions[i + 1].created_at);
          const intervalMinutes = (current - next) / (1000 * 60);
          intervals.push(intervalMinutes);
        }
        
        const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
        console.log(`   ⏱️  Средний интервал: ${avgInterval.toFixed(1)} минут`);
        console.log(`   📋 Интервалы: [${intervals.map(i => i.toFixed(1)).join(', ')}] минут`);
        
        // Проверка соответствия 5-минутному циклу
        const expectedInterval = 5;
        const deviationPercent = Math.abs(avgInterval - expectedInterval) / expectedInterval * 100;
        
        if (deviationPercent <= 20) {
          console.log(`   ✅ Планировщик работает по расписанию (отклонение ${deviationPercent.toFixed(1)}%)`);
        } else {
          console.log(`   ⚠️  Большое отклонение от 5-минутного цикла (${deviationPercent.toFixed(1)}%)`);
        }
      }
      
      // Проверка активности за последние 30 минут
      const recentTransactions = boostIncomeTransactions.filter(tx => {
        const txTime = new Date(tx.created_at);
        const minutesAgo = (new Date() - txTime) / (1000 * 60);
        return minutesAgo <= 30;
      });
      
      console.log('\n🔹 АКТИВНОСТЬ ЗА ПОСЛЕДНИЕ 30 МИНУТ:');
      console.log(`   📊 Начислений: ${recentTransactions.length}`);
      
      if (recentTransactions.length > 0) {
        const lastTx = recentTransactions[0];
        const minutesAgo = (new Date() - new Date(lastTx.created_at)) / (1000 * 60);
        console.log(`   🕒 Последнее начисление: ${minutesAgo.toFixed(1)} минут назад`);
        
        if (minutesAgo <= 6) {
          console.log('   🟢 СТАТУС: ПЛАНИРОВЩИК АКТИВЕН');
        } else if (minutesAgo <= 15) {
          console.log('   🟡 СТАТУС: НЕБОЛЬШАЯ ЗАДЕРЖКА');
        } else {
          console.log('   🔴 СТАТУС: ВОЗМОЖНЫЕ ПРОБЛЕМЫ');
        }
      } else {
        console.log('   🔴 СТАТУС: НЕТ АКТИВНОСТИ');
      }
    } else {
      console.log('   ❌ Начисления TON Boost не найдены');
    }
  }
  
  // БЛОК 4: РАСЧЕТНАЯ ПРОВЕРКА ДОХОДНОСТИ
  console.log('\n' + '='.repeat(70));
  console.log('4️⃣  РАСЧЕТНАЯ ПРОВЕРКА ДОХОДНОСТИ');
  console.log('='.repeat(70));
  
  if (user.ton_boost_package && user.ton_boost_rate && user.balance_ton) {
    const currentBalance = parseFloat(user.balance_ton);
    const deposit = Math.max(0, currentBalance - 10);
    const dailyRate = user.ton_boost_rate;
    const dailyIncome = deposit * dailyRate;
    const fiveMinIncome = dailyIncome / 288;
    const hourlyIncome = dailyIncome / 24;
    
    console.log('🔹 ТЕОРЕТИЧЕСКИЕ РАСЧЕТЫ:');
    console.log(`   🎯 Активный пакет: ${user.ton_boost_package}`);
    console.log(`   💰 Текущий баланс: ${currentBalance} TON`);
    console.log(`   📈 Депозит для расчета: ${deposit.toFixed(6)} TON (баланс - 10 резерв)`);
    console.log(`   📊 Дневная ставка: ${(dailyRate * 100).toFixed(1)}%`);
    console.log(`   💵 Ожидаемый дневной доход: ${dailyIncome.toFixed(6)} TON`);
    console.log(`   ⏰ Ожидаемый доход за 5 минут: ${fiveMinIncome.toFixed(8)} TON`);
    console.log(`   🕐 Ожидаемый часовой доход: ${hourlyIncome.toFixed(6)} TON`);
    
    // Сравнение с фактическими данными
    if (!txError && allTransactions?.length > 0) {
      const boostIncomes = allTransactions.filter(tx => 
        tx.description && tx.description.toLowerCase().includes('boost') &&
        tx.description.toLowerCase().includes('доход')
      );
      
      if (boostIncomes.length > 0) {
        console.log('\n🔹 СРАВНЕНИЕ С ФАКТИЧЕСКИМИ ДАННЫМИ:');
        const lastIncome = boostIncomes[0];
        const actualAmount = parseFloat(lastIncome.amount_ton);
        const deviation = Math.abs(actualAmount - fiveMinIncome) / fiveMinIncome * 100;
        
        console.log(`   💡 Последнее фактическое начисление: ${actualAmount} TON`);
        console.log(`   📐 Ожидаемое начисление: ${fiveMinIncome.toFixed(8)} TON`);
        console.log(`   📊 Отклонение: ${deviation.toFixed(1)}%`);
        
        if (deviation <= 5) {
          console.log('   ✅ РАСЧЕТЫ КОРРЕКТНЫ (отклонение минимальное)');
        } else if (deviation <= 15) {
          console.log('   🟡 НЕБОЛЬШОЕ РАСХОЖДЕНИЕ в расчетах');
        } else {
          console.log('   ⚠️  ЗНАЧИТЕЛЬНОЕ РАСХОЖДЕНИЕ в расчетах');
        }
      }
    }
  } else {
    console.log('❌ ПАКЕТ НЕ АКТИВИРОВАН - расчеты невозможны');
  }
  
  // БЛОК 5: УСТОЙЧИВОСТЬ И СИНХРОНИЗАЦИЯ
  console.log('\n' + '='.repeat(70));
  console.log('5️⃣  УСТОЙЧИВОСТЬ И СИНХРОНИЗАЦИЯ СИСТЕМЫ');
  console.log('='.repeat(70));
  
  console.log('🔹 ПРОВЕРКА СИНХРОНИЗАЦИИ ДАННЫХ:');
  
  // Сравнение данных Supabase vs API
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  
  try {
    const apiResponse = await fetch('https://9e8e72ca-ad0e-4d1b-b689-b91a4832fe73-00-7a29dnah0ryx.spock.replit.dev/api/v2/users/profile', {
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6NDgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE2MTMzMDAsImV4cCI6MTc1MjIxODEwMH0.itCnOpcM4WQEksdm8M7L7tj1dGKuALNVFY0HQdIIk2I`,
        'Content-Type': 'application/json'
      }
    });
    
    const apiData = await apiResponse.json();
    const apiBalance = apiData.data?.user?.balance_ton || apiData.data?.balance_ton || '0';
    
    console.log(`   🗄️  Данные Supabase: ${user.balance_ton} TON`);
    console.log(`   🌐 Данные API: ${apiBalance} TON`);
    
    const supabaseBalance = parseFloat(user.balance_ton);
    const apiBalanceNum = parseFloat(apiBalance);
    
    if (Math.abs(supabaseBalance - apiBalanceNum) < 0.000001) {
      console.log('   ✅ ДАННЫЕ СИНХРОНИЗИРОВАНЫ');
    } else {
      console.log('   ⚠️  ОБНАРУЖЕНО РАСХОЖДЕНИЕ в балансах');
      console.log('   💡 Возможна проблема с кэшированием или форматированием API');
    }
    
  } catch (error) {
    console.log(`   ❌ Ошибка проверки API: ${error.message}`);
  }
  
  // БЛОК 6: ИТОГОВЫЕ ВЫВОДЫ
  console.log('\n' + '='.repeat(70));
  console.log('6️⃣  ИТОГОВЫЕ ВЫВОДЫ И РЕКОМЕНДАЦИИ');
  console.log('='.repeat(70));
  
  let systemScore = 0;
  const checks = [];
  
  // Проверка 1: Активация пакета
  if (user.ton_boost_package && user.ton_boost_rate > 0) {
    checks.push('✅ TON Boost пакет активирован');
    systemScore += 25;
  } else {
    checks.push('❌ TON Boost пакет НЕ активирован');
  }
  
  // Проверка 2: Наличие начислений
  if (!txError && allTransactions?.length > 0) {
    const boostIncomes = allTransactions.filter(tx => 
      tx.description && tx.description.toLowerCase().includes('boost') &&
      tx.description.toLowerCase().includes('доход')
    );
    
    if (boostIncomes.length > 0) {
      checks.push('✅ Планировщик создает начисления');
      systemScore += 25;
      
      // Проверка 3: Активность планировщика
      const recentIncomes = boostIncomes.filter(tx => {
        const minutesAgo = (new Date() - new Date(tx.created_at)) / (1000 * 60);
        return minutesAgo <= 15;
      });
      
      if (recentIncomes.length > 0) {
        checks.push('✅ Планировщик активен (последние 15 мин)');
        systemScore += 25;
      } else {
        checks.push('⚠️ Планировщик неактивен (нет начислений 15+ мин)');
        systemScore += 10;
      }
    } else {
      checks.push('❌ Планировщик НЕ создает начисления');
    }
  }
  
  // Проверка 4: Корректность расчетов
  if (user.ton_boost_package && user.ton_boost_rate && allTransactions?.length > 0) {
    const boostIncomes = allTransactions.filter(tx => 
      tx.description && tx.description.toLowerCase().includes('boost') &&
      tx.description.toLowerCase().includes('доход')
    );
    
    if (boostIncomes.length > 0) {
      const expectedIncome = ((parseFloat(user.balance_ton) - 10) * user.ton_boost_rate) / 288;
      const actualIncome = parseFloat(boostIncomes[0].amount_ton);
      const deviation = Math.abs(actualIncome - expectedIncome) / expectedIncome * 100;
      
      if (deviation <= 10) {
        checks.push('✅ Расчеты доходности корректны');
        systemScore += 25;
      } else {
        checks.push('⚠️ Есть расхождения в расчетах доходности');
        systemScore += 15;
      }
    }
  }
  
  console.log('🔹 РЕЗУЛЬТАТЫ ПРОВЕРОК:');
  checks.forEach(check => console.log(`   ${check}`));
  
  console.log('\n🔹 ОБЩАЯ ОЦЕНКА СИСТЕМЫ:');
  console.log(`   📊 Оценка готовности: ${systemScore}/100 баллов`);
  
  if (systemScore >= 80) {
    console.log('   🟢 СИСТЕМА РАБОТАЕТ ОТЛИЧНО');
  } else if (systemScore >= 60) {
    console.log('   🟡 СИСТЕМА РАБОТАЕТ С НЕБОЛЬШИМИ ПРОБЛЕМАМИ');
  } else if (systemScore >= 40) {
    console.log('   🟠 СИСТЕМА РАБОТАЕТ С СЕРЬЕЗНЫМИ ОГРАНИЧЕНИЯМИ');
  } else {
    console.log('   🔴 СИСТЕМА ТРЕБУЕТ СЕРЬЕЗНОЙ ДОРАБОТКИ');
  }
  
  console.log('\n🔹 СТАТИСТИКА:');
  console.log(`   👤 Пользователь: ${user.username} (ID: ${user.id})`);
  console.log(`   💰 Итоговый баланс TON: ${user.balance_ton}`);
  console.log(`   🎯 Активных пакетов: ${user.ton_boost_package ? 1 : 0}`);
  if (!txError && allTransactions?.length > 0) {
    const boostTxs = allTransactions.filter(tx => 
      tx.description && tx.description.toLowerCase().includes('boost')
    );
    console.log(`   📊 Всего TON Boost транзакций: ${boostTxs.length}`);
    console.log(`   💸 Всего TON транзакций: ${allTransactions.length}`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📋 ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log('Время выполнения: ' + new Date().toLocaleString('ru-RU'));
  console.log('='.repeat(70));
}

generateFinalReport().catch(console.error);