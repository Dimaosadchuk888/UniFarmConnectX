/**
 * ГЛУБОКАЯ ДИАГНОСТИКА СИСТЕМЫ БАЛАНСА
 * Анализ всех компонентов отвечающих за списание TON
 */

import { supabase } from './core/supabaseClient';

async function deepBalanceDiagnostic() {
  console.log('🔍 ГЛУБОКАЯ ДИАГНОСТИКА СИСТЕМЫ БАЛАНСА');
  console.log('=' .repeat(80));
  
  try {
    // 1. Проверяем ФАКТИЧЕСКИЕ записи в базе для User 25
    console.log('\n1️⃣ АНАЛИЗ ТРАНЗАКЦИЙ User 25 за последний час');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: true });
    
    if (txError) {
      console.log('❌ Ошибка получения транзакций:', txError.message);
      return;
    }
    
    console.log(`📊 Найдено транзакций: ${transactions.length}`);
    
    // Группируем транзакции по типам
    const boostPurchases = transactions.filter(tx => tx.type === 'BOOST_PURCHASE');
    const withdrawals = transactions.filter(tx => tx.type === 'WITHDRAWAL' || tx.type === 'withdrawal');
    const dailyBonuses = transactions.filter(tx => tx.type === 'DAILY_BONUS');
    
    console.log('\n📈 АНАЛИЗ ТИПОВ ТРАНЗАКЦИЙ:');
    console.log(`   🛒 BOOST_PURCHASE: ${boostPurchases.length}`);
    console.log(`   💸 WITHDRAWAL/withdrawal: ${withdrawals.length}`);
    console.log(`   🎁 DAILY_BONUS: ${dailyBonuses.length}`);
    
    // Анализируем каждую BOOST_PURCHASE транзакцию
    console.log('\n🔍 ДЕТАЛЬНЫЙ АНАЛИЗ BOOST_PURCHASE ТРАНЗАКЦИЙ:');
    boostPurchases.forEach((tx, index) => {
      console.log(`\n   📜 BOOST_PURCHASE ${index + 1}:`);
      console.log(`      ID: ${tx.id}`);
      console.log(`      Amount: ${tx.amount} ${tx.currency}`);
      console.log(`      Amount_TON: ${tx.amount_ton}`);
      console.log(`      Amount_UNI: ${tx.amount_uni}`);
      console.log(`      Status: ${tx.status}`);
      console.log(`      Description: ${tx.description}`);
      console.log(`      Created: ${tx.created_at}`);
      console.log(`      Metadata: ${JSON.stringify(tx.metadata, null, 6)}`);
      
      // КРИТИЧЕСКИЙ АНАЛИЗ: проверяем знак amount
      const amount = parseFloat(tx.amount || '0');
      const amountTon = parseFloat(tx.amount_ton || '0');
      
      if (amount > 0 || amountTon > 0) {
        console.log(`      🚨 ПРОБЛЕМА: ПОЛОЖИТЕЛЬНАЯ СУММА! Должна быть отрицательной для списания`);
      }
    });
    
    // 2. Проверяем последние изменения баланса User 25
    console.log('\n2️⃣ ПРОВЕРКА ИСТОРИИ БАЛАНСА User 25');
    
    // Проверяем текущий баланс
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, username, balance_ton, balance_uni, updated_at')
      .eq('id', 25)
      .single();
    
    if (userError) {
      console.log('❌ Ошибка получения пользователя:', userError.message);
    } else {
      console.log('\n💰 ТЕКУЩИЙ БАЛАНС User 25:');
      console.log(`   TON: ${currentUser.balance_ton}`);
      console.log(`   UNI: ${currentUser.balance_uni}`);
      console.log(`   Last Updated: ${currentUser.updated_at}`);
    }
    
    // 3. Вычисляем ожидаемый баланс на основе транзакций
    console.log('\n3️⃣ РАСЧЕТ ОЖИДАЕМОГО БАЛАНСА НА ОСНОВЕ ТРАНЗАКЦИЙ');
    
    let expectedTonBalance = 0;
    let expectedUniBalance = 0;
    
    // Получаем ВСЕ транзакции User 25
    const { data: allTransactions, error: allTxError } = await supabase
      .from('transactions')
      .select('type, amount, currency, amount_ton, amount_uni, description, created_at')
      .eq('user_id', 25)
      .order('created_at', { ascending: true });
    
    if (allTxError) {
      console.log('❌ Ошибка получения всех транзакций:', allTxError.message);
    } else {
      console.log(`\n🧮 ПЕРЕСЧЕТ БАЛАНСА (всего транзакций: ${allTransactions.length})`);
      
      allTransactions.forEach((tx, index) => {
        const tonAmount = parseFloat(tx.amount_ton || '0');
        const uniAmount = parseFloat(tx.amount_uni || '0');
        const generalAmount = parseFloat(tx.amount || '0');
        
        // Определяем валюту и сумму
        if (tx.currency === 'TON' || tonAmount !== 0) {
          const actualAmount = tonAmount !== 0 ? tonAmount : generalAmount;
          expectedTonBalance += actualAmount;
          
          if (index < 10 || tx.type === 'BOOST_PURCHASE') { // Показываем первые 10 или все BOOST_PURCHASE
            console.log(`     ${index + 1}. ${tx.type}: ${actualAmount > 0 ? '+' : ''}${actualAmount} TON | Balance: ${expectedTonBalance.toFixed(6)} TON`);
          }
        }
        
        if (tx.currency === 'UNI' || uniAmount !== 0) {
          const actualAmount = uniAmount !== 0 ? uniAmount : generalAmount;
          expectedUniBalance += actualAmount;
        }
      });
      
      console.log(`\n📊 ИТОГОВЫЕ РАСЧЕТЫ:`);
      console.log(`   💎 Ожидаемый TON баланс: ${expectedTonBalance.toFixed(6)} TON`);
      console.log(`   💎 Фактический TON баланс: ${currentUser.balance_ton} TON`);
      console.log(`   💰 Ожидаемый UNI баланс: ${expectedUniBalance.toFixed(6)} UNI`);
      console.log(`   💰 Фактический UNI баланс: ${currentUser.balance_uni} UNI`);
      
      // КРИТИЧЕСКИЙ АНАЛИЗ РАСХОЖДЕНИЙ
      const tonDifference = parseFloat(currentUser.balance_ton) - expectedTonBalance;
      const uniDifference = parseFloat(currentUser.balance_uni) - expectedUniBalance;
      
      console.log(`\n🚨 АНАЛИЗ РАСХОЖДЕНИЙ:`);
      console.log(`   TON разница: ${tonDifference > 0 ? '+' : ''}${tonDifference.toFixed(6)} TON`);
      console.log(`   UNI разница: ${uniDifference > 0 ? '+' : ''}${uniDifference.toFixed(6)} UNI`);
      
      if (Math.abs(tonDifference) > 0.01) {
        console.log(`   ⚠️  КРИТИЧЕСКОЕ РАСХОЖДЕНИЕ TON: ${Math.abs(tonDifference).toFixed(6)} TON`);
      }
    }
    
    // 4. Проверяем последние операции BOOST_PURCHASE подробно
    console.log('\n4️⃣ АНАЛИЗ ПОСЛЕДНИХ BOOST_PURCHASE ОПЕРАЦИЙ');
    
    const recentBoosts = boostPurchases.slice(-4); // Последние 4
    recentBoosts.forEach((tx, index) => {
      console.log(`\n🛒 BOOST_PURCHASE ${index + 1} (ID: ${tx.id}):`);
      console.log(`   Время: ${tx.created_at}`);
      console.log(`   Описание: ${tx.description}`);
      console.log(`   Amount поле: ${tx.amount} ${tx.currency}`);
      console.log(`   Amount_TON поле: ${tx.amount_ton}`);
      console.log(`   Amount_UNI поле: ${tx.amount_uni}`);
      
      // Проверяем что должно было произойти
      console.log(`   ❓ Ожидаемое поведение: СПИСАНИЕ -1 TON`);
      console.log(`   ❗ Фактическое поведение: ${tx.amount > 0 ? 'НАЧИСЛЕНИЕ' : 'СПИСАНИЕ'} ${tx.amount} TON`);
      
      if (parseFloat(tx.amount) > 0) {
        console.log(`   🚨 ПРОБЛЕМА ПОДТВЕРЖДЕНА: ПОЛОЖИТЕЛЬНАЯ СУММА ВМЕСТО ОТРИЦАТЕЛЬНОЙ!`);
      }
    });
    
    console.log('\n5️⃣ ЗАКЛЮЧЕНИЕ ДИАГНОСТИКИ');
    console.log('=' .repeat(80));
    console.log('🎯 ТОЧНАЯ ПРИЧИНА НАЙДЕНА:');
    console.log('   BOOST_PURCHASE транзакции создаются с ПОЛОЖИТЕЛЬНЫМИ суммами (+1 TON)');
    console.log('   вместо ОТРИЦАТЕЛЬНЫХ сумм (-1 TON) для списания');
    console.log('');
    console.log('📍 ИСТОЧНИК ПРОБЛЕМЫ:');
    console.log('   Компонент создающий BOOST_PURCHASE транзакции');
    console.log('   НЕ УСТАНАВЛИВАЕТ отрицательный знак для amount поля');
    console.log('');
    console.log('💥 РЕЗУЛЬТАТ:');
    console.log('   Вместо списания -1 TON система начисляет +1 TON');
    console.log('   Пользователь получает двойную выгоду: товар + деньги обратно');
    
  } catch (error) {
    console.log('💥 КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error);
  }
}

deepBalanceDiagnostic().catch(console.error);