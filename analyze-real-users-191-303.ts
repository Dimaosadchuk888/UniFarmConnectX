/**
 * ДЕТАЛЬНЫЙ АНАЛИЗ ПОЛЬЗОВАТЕЛЕЙ 25, 227 И ДРУГИХ АНОМАЛИЙ
 * Ищем конкретную проблему User 25
 */

import { supabase } from './core/supabase.js';

async function analyzeRealUsers() {
  console.log('🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ПОЛЬЗОВАТЕЛЕЙ 25/227');
  console.log('⏰ Время анализа:', new Date().toISOString());
  
  try {
    // 1. Ищем все профили связанные с User 25
    console.log('\n=== 1. ПОИСК ВСЕХ ПРОФИЛЕЙ USER 25 ===');
    
    const { data: user25Profiles } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton, created_at')
      .or('telegram_id.eq.25,id.eq.25,id.eq.227');
    
    console.log(`👥 Найдено профилей для User 25: ${user25Profiles?.length || 0}`);
    
    if (user25Profiles && user25Profiles.length > 0) {
      user25Profiles.forEach((profile, i) => {
        console.log(`  Профиль ${i+1}:`);
        console.log(`    internal_id: ${profile.id}`);
        console.log(`    telegram_id: ${profile.telegram_id}`);
        console.log(`    username: ${profile.username}`);
        console.log(`    UNI: ${profile.balance_uni}`);
        console.log(`    TON: ${profile.balance_ton}`);
        console.log(`    Создан: ${profile.created_at}`);
        console.log('    ---');
      });
    }
    
    // 2. Ищем пользователя без telegram_id
    console.log('\n=== 2. ПОИСК ПОЛЬЗОВАТЕЛЯ БЕЗ TELEGRAM_ID ===');
    
    const { data: usersWithoutTelegram } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton, created_at')
      .or('telegram_id.is.null,telegram_id.eq.0');
    
    console.log(`👤 Пользователей без telegram_id: ${usersWithoutTelegram?.length || 0}`);
    
    if (usersWithoutTelegram && usersWithoutTelegram.length > 0) {
      usersWithoutTelegram.forEach((user, i) => {
        console.log(`  Пользователь ${i+1}:`);
        console.log(`    internal_id: ${user.id}`);
        console.log(`    telegram_id: ${user.telegram_id}`);
        console.log(`    username: ${user.username}`);
        console.log(`    UNI: ${user.balance_uni}`);
        console.log(`    TON: ${user.balance_ton}`);
        console.log(`    Создан: ${user.created_at}`);
        
        // Проверяем есть ли транзакции у этого пользователя
        const checkTransactions = async (userId) => {
          const { data: txs } = await supabase
            .from('transactions')
            .select('id, type, amount_uni, amount_ton, created_at')
            .eq('user_id', userId)
            .limit(5);
          return txs || [];
        };
        
        checkTransactions(user.id).then(txs => {
          if (txs.length > 0) {
            console.log(`    🔍 У этого пользователя есть ${txs.length}+ транзакций!`);
            txs.forEach(tx => {
              console.log(`      - ${tx.type}: ${tx.amount_uni || tx.amount_ton} (${tx.created_at})`);
            });
          }
        });
        
        console.log('    ---');
      });
    }
    
    // 3. Анализируем транзакции User 25
    console.log('\n=== 3. АНАЛИЗ ТРАНЗАКЦИЙ USER 25 ===');
    
    const { data: user25Transactions } = await supabase
      .from('transactions')
      .select('user_id, type, amount_uni, amount_ton, currency, status, created_at')
      .eq('user_id', 25)
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`📋 Последние транзакции user_id=25: ${user25Transactions?.length || 0}`);
    
    if (user25Transactions && user25Transactions.length > 0) {
      user25Transactions.forEach((tx, i) => {
        console.log(`  ${i+1}. ${tx.type} | ${tx.amount_uni || tx.amount_ton} ${tx.currency} | ${tx.status}`);
        console.log(`     Время: ${tx.created_at}`);
      });
    }
    
    // 4. Проверяем транзакции user_id=227
    console.log('\n=== 4. АНАЛИЗ ТРАНЗАКЦИЙ USER_ID=227 ===');
    
    const { data: user227Transactions } = await supabase
      .from('transactions')
      .select('user_id, type, amount_uni, amount_ton, currency, status, created_at')
      .eq('user_id', 227)
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`📋 Последние транзакции user_id=227: ${user227Transactions?.length || 0}`);
    
    if (user227Transactions && user227Transactions.length > 0) {
      user227Transactions.forEach((tx, i) => {
        console.log(`  ${i+1}. ${tx.type} | ${tx.amount_uni || tx.amount_ton} ${tx.currency} | ${tx.status}`);
        console.log(`     Время: ${tx.created_at}`);
      });
    }
    
    // 5. Тестируем BalanceManager с разными ID
    console.log('\n=== 5. ТЕСТ BALANCE MANAGER ===');
    
    try {
      const { BalanceManager } = await import('./core/BalanceManager.js');
      const balanceManager = BalanceManager.getInstance();
      
      // Тест с telegram_id=25
      console.log('🧪 Тест getUserBalance(25):');
      const result25 = await balanceManager.getUserBalance(25);
      if (result25.success) {
        console.log(`   ✅ Успех: UNI=${result25.balance?.balance_uni}, TON=${result25.balance?.balance_ton}`);
      } else {
        console.log(`   ❌ Ошибка: ${result25.error}`);
      }
      
      // Тест с internal_id=227
      console.log('🧪 Тест getUserBalance(227):');
      const result227 = await balanceManager.getUserBalance(227);
      if (result227.success) {
        console.log(`   ✅ Успех: UNI=${result227.balance?.balance_uni}, TON=${result227.balance?.balance_ton}`);
      } else {
        console.log(`   ❌ Ошибка: ${result227.error}`);
      }
      
    } catch (bmError) {
      console.log('❌ Ошибка загрузки BalanceManager:', bmError.message);
    }
    
    // 6. Проверяем, как система создает депозиты
    console.log('\n=== 6. АНАЛИЗ СОЗДАНИЯ ДЕПОЗИТОВ ===');
    
    const { data: recentDeposits } = await supabase
      .from('transactions')
      .select('user_id, type, amount_uni, amount_ton, currency, created_at, description')
      .in('type', ['TON_DEPOSIT', 'FARMING_DEPOSIT'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);
    
    console.log(`💰 Депозиты за 24 часа: ${recentDeposits?.length || 0}`);
    
    if (recentDeposits && recentDeposits.length > 0) {
      const user25Deposits = recentDeposits.filter(d => d.user_id === 25);
      const user227Deposits = recentDeposits.filter(d => d.user_id === 227);
      
      console.log(`   User 25 депозиты: ${user25Deposits.length}`);
      console.log(`   User 227 депозиты: ${user227Deposits.length}`);
      
      [...user25Deposits, ...user227Deposits].forEach(dep => {
        console.log(`     User ${dep.user_id}: ${dep.type} ${dep.amount_uni || dep.amount_ton} ${dep.currency}`);
        console.log(`       Время: ${dep.created_at}`);
        console.log(`       Описание: ${dep.description}`);
      });
    }
    
    // ВЫВОДЫ
    console.log('\n=== 🎯 ДИАГНОЗ ===');
    
    const hasMultipleProfiles = user25Profiles && user25Profiles.length > 1;
    const has25Transactions = user25Transactions && user25Transactions.length > 0;
    const has227Transactions = user227Transactions && user227Transactions.length > 0;
    
    console.log(`📊 СТАТИСТИКА USER 25:`);
    console.log(`   Профилей: ${user25Profiles?.length || 0}`);
    console.log(`   Транзакций user_id=25: ${user25Transactions?.length || 0}`);
    console.log(`   Транзакций user_id=227: ${user227Transactions?.length || 0}`);
    
    if (hasMultipleProfiles) {
      console.log('\n⚠️ ПРОБЛЕМА: Множественные профили');
    }
    
    if (has25Transactions && !has227Transactions) {
      console.log('\n✅ Все транзакции идут на user_id=25 (telegram_id)');
    } else if (!has25Transactions && has227Transactions) {
      console.log('\n⚠️ Все транзакции идут на user_id=227 (internal_id)');
    } else if (has25Transactions && has227Transactions) {
      console.log('\n❌ Транзакции разделены между user_id=25 и user_id=227');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
    console.error('Stack:', error.stack);
  }
}

analyzeRealUsers();