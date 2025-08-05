/**
 * ТРАССИРОВКА ПОТОКА: ТРАНЗАКЦИЯ → ОБНОВЛЕНИЕ БАЛАНСА
 * Проверяем где именно обрывается связь
 */

import { supabase } from './core/supabase.js';

async function traceTransactionToBalanceFlow() {
  console.log('🔍 ТРАССИРОВКА ПОТОКА ТРАНЗАКЦИЯ → БАЛАНС');
  console.log('⏰ Время анализа:', new Date().toISOString());
  
  try {
    // 1. Берем конкретную недавнюю транзакцию
    console.log('\n=== 1. ПОИСК КОНКРЕТНОЙ ТРАНЗАКЦИИ ===');
    
    const { data: recentTransaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // 30 минут
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!recentTransaction) {
      console.log('❌ Нет недавних транзакций за 30 минут');
      return;
    }
    
    console.log('🎯 Анализируем транзакцию:');
    console.log(`   ID: ${recentTransaction.id}`);
    console.log(`   User: ${recentTransaction.user_id}`);
    console.log(`   Тип: ${recentTransaction.type}`);
    console.log(`   Сумма: ${recentTransaction.amount_uni || recentTransaction.amount_ton} ${recentTransaction.currency}`);
    console.log(`   Статус: ${recentTransaction.status}`);
    console.log(`   Создана: ${recentTransaction.created_at}`);
    
    // 2. Проверяем профиль пользователя ПЕРЕД транзакцией
    console.log('\n=== 2. СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ ===');
    
    const userId = recentTransaction.user_id;
    
    // Ищем пользователя по user_id (может быть telegram_id или internal_id)
    const { data: userByUserId } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    const { data: userByTelegramId } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();
    
    console.log('👤 Поиск пользователя:');
    console.log(`   По internal_id=${userId}:`, userByUserId ? 'НАЙДЕН' : 'НЕ НАЙДЕН');
    console.log(`   По telegram_id=${userId}:`, userByTelegramId ? 'НАЙДЕН' : 'НЕ НАЙДЕН');
    
    const targetUser = userByTelegramId || userByUserId;
    
    if (!targetUser) {
      console.log('❌ Пользователь не найден ни по одному ID!');
      return;
    }
    
    console.log('✅ Найден пользователь:');
    console.log(`   internal_id: ${targetUser.id}`);
    console.log(`   telegram_id: ${targetUser.telegram_id}`);
    console.log(`   username: ${targetUser.username}`);
    console.log(`   UNI: ${targetUser.balance_uni}`);
    console.log(`   TON: ${targetUser.balance_ton}`);
    console.log(`   updated_at: ${targetUser.updated_at}`);
    
    // 3. Проверяем время обновления vs время транзакции
    console.log('\n=== 3. ВРЕМЕННОЙ АНАЛИЗ ===');
    
    const transactionTime = new Date(recentTransaction.created_at);
    const balanceUpdateTime = new Date(targetUser.updated_at);
    const timeDiff = transactionTime.getTime() - balanceUpdateTime.getTime();
    
    console.log(`⏰ Времена:`);
    console.log(`   Транзакция: ${recentTransaction.created_at}`);
    console.log(`   Баланс обновлен: ${targetUser.updated_at}`);
    console.log(`   Разница: ${(timeDiff / 1000).toFixed(1)} секунд`);
    
    if (timeDiff > 0) {
      console.log('❌ ПРОБЛЕМА: Баланс НЕ обновлялся после транзакции!');
    } else {
      console.log('✅ Баланс обновлялся после транзакции');
    }
    
    // 4. Рассчитываем ожидаемый баланс
    console.log('\n=== 4. РАСЧЕТ ОЖИДАЕМОГО БАЛАНСА ===');
    
    // Берем все транзакции пользователя после последнего обновления баланса
    const { data: transactionsAfterUpdate } = await supabase
      .from('transactions')
      .select('type, amount_uni, amount_ton, currency, created_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gt('created_at', targetUser.updated_at)
      .order('created_at', { ascending: true });
    
    console.log(`📋 Транзакций после обновления баланса: ${transactionsAfterUpdate?.length || 0}`);
    
    let expectedUniBalance = parseFloat(targetUser.balance_uni);
    let expectedTonBalance = parseFloat(targetUser.balance_ton);
    
    if (transactionsAfterUpdate && transactionsAfterUpdate.length > 0) {
      console.log('\n📊 Необработанные транзакции:');
      
      transactionsAfterUpdate.forEach((tx, i) => {
        const amountUni = parseFloat(tx.amount_uni) || 0;
        const amountTon = parseFloat(tx.amount_ton) || 0;
        
        console.log(`  ${i+1}. ${tx.type}: ${amountUni || amountTon} ${tx.currency} (${tx.created_at})`);
        
        if (tx.type === 'WITHDRAWAL') {
          expectedUniBalance -= amountUni;
          expectedTonBalance -= amountTon;
        } else {
          expectedUniBalance += amountUni;
          expectedTonBalance += amountTon;
        }
      });
      
      console.log(`\n💰 ОЖИДАЕМЫЙ БАЛАНС:`);
      console.log(`   UNI: ${expectedUniBalance.toFixed(6)} (сейчас: ${targetUser.balance_uni})`);
      console.log(`   TON: ${expectedTonBalance.toFixed(6)} (сейчас: ${targetUser.balance_ton})`);
      
      const uniDiff = expectedUniBalance - parseFloat(targetUser.balance_uni);
      const tonDiff = expectedTonBalance - parseFloat(targetUser.balance_ton);
      
      console.log(`📈 ПОТЕРЯННЫЙ ДОХОД:`);
      console.log(`   UNI: ${uniDiff > 0 ? '+' : ''}${uniDiff.toFixed(6)}`);
      console.log(`   TON: ${tonDiff > 0 ? '+' : ''}${tonDiff.toFixed(6)}`);
    }
    
    // 5. Тестируем BalanceManager с этим пользователем
    console.log('\n=== 5. ТЕСТ BALANCE MANAGER ===');
    
    try {
      const { BalanceManager } = await import('./core/BalanceManager.js');
      const balanceManager = BalanceManager.getInstance();
      
      const testId = targetUser.telegram_id || targetUser.id;
      console.log(`🧪 Тест getUserBalance(${testId}):`);
      
      const result = await balanceManager.getUserBalance(testId);
      if (result.success) {
        console.log(`   ✅ BalanceManager видит: UNI=${result.balance?.balance_uni}, TON=${result.balance?.balance_ton}`);
        
        // Сравниваем с БД
        const bmUni = result.balance?.balance_uni || 0;
        const bmTon = result.balance?.balance_ton || 0;
        const dbUni = parseFloat(targetUser.balance_uni);
        const dbTon = parseFloat(targetUser.balance_ton);
        
        if (Math.abs(bmUni - dbUni) < 0.000001 && Math.abs(bmTon - dbTon) < 0.000001) {
          console.log('   ✅ BalanceManager показывает актуальные данные из БД');
        } else {
          console.log('   ❌ BalanceManager показывает другие данные!');
        }
      } else {
        console.log(`   ❌ BalanceManager ошибка: ${result.error}`);
      }
      
    } catch (bmError) {
      console.log('❌ Ошибка BalanceManager:', bmError.message);
    }
    
    // 6. ДИАГНОЗ
    console.log('\n=== 🎯 ТОЧНЫЙ ДИАГНОЗ ===');
    
    const hasUnprocessedTransactions = transactionsAfterUpdate && transactionsAfterUpdate.length > 0;
    const isBalanceOutdated = timeDiff > 0;
    
    if (hasUnprocessedTransactions) {
      console.log('🚨 ПОДТВЕРЖДЕНО: Транзакции создаются, но балансы НЕ обновляются');
      console.log(`   📊 Необработанных транзакций: ${transactionsAfterUpdate.length}`);
      console.log(`   💸 Потерянный доход пользователя: ${expectedUniBalance - parseFloat(targetUser.balance_uni)} UNI`);
      console.log('\n🔧 ПРИЧИНА: BalanceManager.updateUserBalance() НЕ вызывается при создании транзакций');
    } else {
      console.log('✅ Система работает корректно для данного пользователя');
    }
    
    return {
      hasUnprocessedTransactions,
      unprocessedCount: transactionsAfterUpdate?.length || 0,
      lostUniIncome: hasUnprocessedTransactions ? expectedUniBalance - parseFloat(targetUser.balance_uni) : 0
    };
    
  } catch (error) {
    console.error('❌ Критическая ошибка трассировки:', error);
    console.error('Stack:', error.stack);
    return null;
  }
}

traceTransactionToBalanceFlow();