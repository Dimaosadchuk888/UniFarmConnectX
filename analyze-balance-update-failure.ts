/**
 * АНАЛИЗ СИСТЕМНОГО СБОЯ ОБНОВЛЕНИЯ БАЛАНСОВ
 * Ищем что именно сломалось после изменений
 */

import { supabase } from './core/supabase.js';

async function analyzeBalanceUpdateFailure() {
  console.log('🔍 АНАЛИЗ СИСТЕМНОГО СБОЯ ОБНОВЛЕНИЯ БАЛАНСОВ');
  console.log('⏰ Время анализа:', new Date().toISOString());
  
  try {
    // 1. Проверяем последние транзакции и обновления балансов
    console.log('\n=== 1. АНАЛИЗ ПОСЛЕДНИХ ТРАНЗАКЦИЙ ===');
    
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_uni, amount_ton, currency, status, created_at, description')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // 2 часа
      .order('created_at', { ascending: false })
      .limit(50);
    
    console.log(`📋 Транзакций за 2 часа: ${recentTransactions?.length || 0}`);
    
    if (recentTransactions && recentTransactions.length > 0) {
      // Группируем по типам
      const byType = {};
      recentTransactions.forEach(tx => {
        if (!byType[tx.type]) byType[tx.type] = [];
        byType[tx.type].push(tx);
      });
      
      console.log('\n📊 По типам транзакций:');
      Object.keys(byType).forEach(type => {
        console.log(`   ${type}: ${byType[type].length}`);
      });
      
      // Показываем последние депозиты
      const deposits = recentTransactions.filter(tx => 
        tx.type === 'TON_DEPOSIT' || tx.type === 'FARMING_DEPOSIT'
      );
      
      console.log(`\n💰 Депозиты за 2 часа: ${deposits.length}`);
      deposits.slice(0, 10).forEach((dep, i) => {
        console.log(`  ${i+1}. User ${dep.user_id}: ${dep.type} ${dep.amount_uni || dep.amount_ton} ${dep.currency}`);
        console.log(`     Статус: ${dep.status}, Время: ${dep.created_at}`);
      });
    }
    
    // 2. Проверяем обновления балансов пользователей
    console.log('\n=== 2. АНАЛИЗ ОБНОВЛЕНИЙ БАЛАНСОВ ===');
    
    const { data: usersWithRecentActivity } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton, updated_at')
      .gte('updated_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false })
      .limit(20);
    
    console.log(`👥 Пользователей с обновленными балансами за 2 часа: ${usersWithRecentActivity?.length || 0}`);
    
    if (usersWithRecentActivity && usersWithRecentActivity.length > 0) {
      usersWithRecentActivity.forEach((user, i) => {
        console.log(`  ${i+1}. User ${user.telegram_id || user.id}: UNI=${user.balance_uni}, TON=${user.balance_ton}`);
        console.log(`     Обновлен: ${user.updated_at}`);
      });
    } else {
      console.log('❌ НИ ОДИН БАЛАНС НЕ ОБНОВЛЯЛСЯ ЗА 2 ЧАСА!');
    }
    
    // 3. Сравниваем транзакции и обновления балансов
    console.log('\n=== 3. СРАВНЕНИЕ ТРАНЗАКЦИЙ И ОБНОВЛЕНИЙ ===');
    
    if (recentTransactions && usersWithRecentActivity) {
      const transactionUsers = new Set(recentTransactions.map(tx => tx.user_id));
      const updatedUsers = new Set(usersWithRecentActivity.map(u => u.telegram_id || u.id));
      
      console.log(`📊 СТАТИСТИКА:`);
      console.log(`   Пользователей с транзакциями: ${transactionUsers.size}`);
      console.log(`   Пользователей с обновленными балансами: ${updatedUsers.size}`);
      
      // Находим пользователей с транзакциями, но без обновления баланса
      const usersWithoutBalanceUpdate = [...transactionUsers].filter(userId => 
        !updatedUsers.has(userId)
      );
      
      console.log(`   ❌ Пользователей с транзакциями БЕЗ обновления баланса: ${usersWithoutBalanceUpdate.length}`);
      
      if (usersWithoutBalanceUpdate.length > 0) {
        console.log('\n🚨 ПРОБЛЕМНЫЕ ПОЛЬЗОВАТЕЛИ:');
        usersWithoutBalanceUpdate.slice(0, 10).forEach(userId => {
          const userTransactions = recentTransactions.filter(tx => tx.user_id === userId);
          console.log(`   User ${userId}: ${userTransactions.length} транзакций без обновления баланса`);
          userTransactions.slice(0, 3).forEach(tx => {
            console.log(`     - ${tx.type}: ${tx.amount_uni || tx.amount_ton} ${tx.currency} (${tx.created_at})`);
          });
        });
      }
    }
    
    // 4. Проверяем BalanceManager напрямую
    console.log('\n=== 4. ТЕСТ BALANCE MANAGER ===');
    
    try {
      const { BalanceManager } = await import('./core/BalanceManager.js');
      const balanceManager = BalanceManager.getInstance();
      
      // Тестируем на нескольких пользователях
      const testUsers = [25, 184, 233]; // Разные telegram_id
      
      for (const userId of testUsers) {
        console.log(`🧪 Тест getUserBalance(${userId}):`);
        const result = await balanceManager.getUserBalance(userId);
        if (result.success) {
          console.log(`   ✅ Успех: UNI=${result.balance?.balance_uni}, TON=${result.balance?.balance_ton}`);
        } else {
          console.log(`   ❌ Ошибка: ${result.error}`);
        }
      }
      
    } catch (bmError) {
      console.log('❌ Критическая ошибка BalanceManager:', bmError.message);
      console.log('Stack:', bmError.stack);
    }
    
    // 5. Проверяем логи ошибок в базе (если есть таблица logs)
    console.log('\n=== 5. ПОИСК ОШИБОК В СИСТЕМЕ ===');
    
    try {
      const { data: errorLogs } = await supabase
        .from('logs')
        .select('*')
        .eq('level', 'error')
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (errorLogs && errorLogs.length > 0) {
        console.log(`🚨 Ошибки за 2 часа: ${errorLogs.length}`);
        errorLogs.forEach((log, i) => {
          console.log(`  ${i+1}. ${log.message || log.error}`);
          console.log(`     Время: ${log.created_at}`);
        });
      } else {
        console.log('✅ Критических ошибок в логах не найдено');
      }
    } catch (logError) {
      console.log('ℹ️ Таблица логов недоступна или не существует');
    }
    
    // 6. ДИАГНОЗ
    console.log('\n=== 🎯 СИСТЕМНЫЙ ДИАГНОЗ ===');
    
    const hasRecentTransactions = recentTransactions && recentTransactions.length > 0;
    const hasBalanceUpdates = usersWithRecentActivity && usersWithRecentActivity.length > 0;
    
    if (hasRecentTransactions && !hasBalanceUpdates) {
      console.log('🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Транзакции создаются, но балансы НЕ обновляются!');
      console.log('   Причины:');
      console.log('   1. BalanceManager не вызывается после создания транзакций');
      console.log('   2. BalanceManager работает с telegram_id, но ищет пользователей неправильно');
      console.log('   3. Ошибка в логике обновления балансов в БД');
      console.log('   4. Проблема с кешированием балансов');
    } else if (!hasRecentTransactions) {
      console.log('⚠️ Транзакции вообще не создаются');
    } else if (hasRecentTransactions && hasBalanceUpdates) {
      console.log('✅ Система работает нормально');
    }
    
    return {
      recentTransactions: recentTransactions?.length || 0,
      balanceUpdates: usersWithRecentActivity?.length || 0,
      criticalIssue: hasRecentTransactions && !hasBalanceUpdates
    };
    
  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
    console.error('Stack:', error.stack);
    return null;
  }
}

analyzeBalanceUpdateFailure();