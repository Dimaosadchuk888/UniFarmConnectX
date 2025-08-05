/**
 * АНАЛИЗ ПРОБЛЕМЫ С ПОПОЛНЕНИЯМИ
 * Проверяем весь поток обработки депозитов без изменения кода
 */

import { supabase } from './core/supabase.js';

async function analyzeDepositFlow() {
  console.log('🔍 АНАЛИЗ ПРОБЛЕМЫ С ПОПОЛНЕНИЯМИ USER 25');
  console.log('📋 Время анализа:', new Date().toISOString());
  
  try {
    // 1. Проверяем актуальный баланс User 25 в БД
    console.log('\n=== 1. ТЕКУЩИЙ БАЛАНС В БД ===');
    
    const { data: currentUser, error } = await supabase
      .from('users')
      .select('id, telegram_id, balance_uni, balance_ton, updated_at')
      .eq('telegram_id', 25)
      .single();
    
    if (currentUser) {
      console.log('💰 Текущий баланс User 25:', {
        internal_id: currentUser.id,
        telegram_id: currentUser.telegram_id,
        balance_uni: currentUser.balance_uni,
        balance_ton: currentUser.balance_ton,
        updated_at: currentUser.updated_at
      });
    }
    
    // 2. Анализируем последние депозиты
    console.log('\n=== 2. АНАЛИЗ ПОСЛЕДНИХ ДЕПОЗИТОВ ===');
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    
    const { data: recentDeposits } = await supabase
      .from('transactions')
      .select('*')
      .in('type', ['TON_DEPOSIT', 'FARMING_DEPOSIT'])
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });
    
    console.log(`📥 Депозиты за последний час: ${recentDeposits?.length || 0}`);
    
    if (recentDeposits && recentDeposits.length > 0) {
      recentDeposits.forEach((dep, i) => {
        console.log(`  ${i+1}. User ${dep.user_id}: ${dep.type}`);
        console.log(`     Сумма: ${dep.amount_uni || dep.amount_ton} ${dep.currency}`);
        console.log(`     Статус: ${dep.status}`);
        console.log(`     Время: ${dep.created_at}`);
        console.log(`     Hash: ${dep.tx_hash || 'нет'}`);
        console.log('     ---');
      });
    }
    
    // 3. Проверяем конкретный депозит User 25
    console.log('\n=== 3. ДЕПОЗИТ USER 25 ===');
    
    const { data: user25Deposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .in('type', ['TON_DEPOSIT', 'FARMING_DEPOSIT'])
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false});
    
    console.log(`💳 Депозиты User 25 за час: ${user25Deposits?.length || 0}`);
    
    if (user25Deposits && user25Deposits.length > 0) {
      user25Deposits.forEach((dep, i) => {
        console.log(`  ДЕПОЗИТ ${i+1}:`);
        console.log(`    ID транзакции: ${dep.id}`);
        console.log(`    Тип: ${dep.type}`);
        console.log(`    Сумма: ${dep.amount_uni || dep.amount_ton} ${dep.currency}`);
        console.log(`    Статус: ${dep.status}`);
        console.log(`    Описание: ${dep.description}`);
        console.log(`    Время создания: ${dep.created_at}`);
        console.log(`    Время обновления: ${dep.updated_at}`);
        console.log(`    TX Hash: ${dep.tx_hash || 'отсутствует'}`);
        console.log('    ---');
      });
    } else {
      console.log('  ❌ Депозитов User 25 за последний час не найдено');
    }
    
    // 4. Сравниваем баланс до и после депозита
    console.log('\n=== 4. АНАЛИЗ ИЗМЕНЕНИЯ БАЛАНСА ===');
    
    // Ищем изменения баланса User 25 за последний час
    const { data: balanceChanges } = await supabase
      .from('users')
      .select('balance_uni, balance_ton, updated_at')
      .eq('telegram_id', 25)
      .single();
    
    if (balanceChanges) {
      console.log('📊 Текущий баланс в БД:', {
        uni: balanceChanges.balance_uni,
        ton: balanceChanges.balance_ton,
        updated_at: balanceChanges.updated_at
      });
    }
    
    // 5. Проверяем работу BalanceManager
    console.log('\n=== 5. ТЕСТ BALANCE MANAGER ===');
    
    try {
      const { BalanceManager } = await import('./core/BalanceManager.js');
      const balanceManager = BalanceManager.getInstance();
      
      const balanceResult = await balanceManager.getUserBalance(25);
      
      if (balanceResult.success) {
        const balance = balanceResult.balance!;
        console.log('🔧 BalanceManager результат:', {
          uni: balance.balance_uni,
          ton: balance.balance_ton,
          source: 'BalanceManager'
        });
        
        // Сравниваем с БД
        if (currentUser) {
          const uniDiff = Math.abs(parseFloat(currentUser.balance_uni) - balance.balance_uni);
          const tonDiff = Math.abs(parseFloat(currentUser.balance_ton) - balance.balance_ton);
          
          console.log('🔍 Сравнение БД vs BalanceManager:', {
            uni_diff: uniDiff,
            ton_diff: tonDiff,
            synced: uniDiff < 0.001 && tonDiff < 0.001
          });
        }
      } else {
        console.log('❌ Ошибка BalanceManager:', balanceResult.error);
      }
      
    } catch (bmError) {
      console.log('❌ Ошибка загрузки BalanceManager:', bmError.message);
    }
    
    // 6. Проверяем статус системы обработки депозитов
    console.log('\n=== 6. СИСТЕМА ОБРАБОТКИ ДЕПОЗИТОВ ===');
    
    // Проверяем есть ли stuck транзакции
    const { data: stuckTransactions } = await supabase
      .from('transactions')
      .select('*')
      .in('status', ['pending', 'processing'])
      .lt('created_at', new Date(now.getTime() - 30 * 60 * 1000).toISOString()) // старше 30 минут
      .order('created_at', { ascending: false });
    
    console.log(`⚠️ Зависшие транзакции (>30мин): ${stuckTransactions?.length || 0}`);
    
    if (stuckTransactions && stuckTransactions.length > 0) {
      stuckTransactions.forEach((tx, i) => {
        console.log(`  ${i+1}. User ${tx.user_id}: ${tx.type} | ${tx.status} | возраст: ${Math.round((now.getTime() - new Date(tx.created_at).getTime()) / (60 * 1000))}мин`);
      });
    }
    
    // ВЫВОДЫ
    console.log('\n=== 🎯 ВЫВОДЫ АНАЛИЗА ===');
    
    console.log('1. User 25 в системе:', currentUser ? 'НАЙДЕН' : 'НЕ НАЙДЕН');
    console.log('2. Депозиты за час:', recentDeposits?.length || 0);
    console.log('3. Депозиты User 25 за час:', user25Deposits?.length || 0);
    console.log('4. Зависшие транзакции:', stuckTransactions?.length || 0);
    
    if (currentUser) {
      console.log('\n📋 СОСТОЯНИЕ USER 25:');
      console.log(`   Баланс UNI: ${currentUser.balance_uni}`);
      console.log(`   Баланс TON: ${currentUser.balance_ton}`);
      console.log(`   Последнее обновление: ${currentUser.updated_at || 'не указано'}`);
    }
    
    // Рекомендации
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    
    if (user25Deposits && user25Deposits.length === 0) {
      console.log('- Депозит может не создаваться в транзакциях');
      console.log('- Проверить API endpoint для депозитов');
      console.log('- Проверить middleware обработки депозитов');
    }
    
    if (user25Deposits && user25Deposits.some(d => d.status === 'pending')) {
      console.log('- Есть pending депозиты - возможна проблема в обработчике');
    }
    
    if (stuckTransactions && stuckTransactions.length > 0) {
      console.log('- В системе есть зависшие транзакции - нужна очистка');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
  }
}

analyzeDepositFlow();