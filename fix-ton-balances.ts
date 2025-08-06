/**
 * СКРИПТ ВОССТАНОВЛЕНИЯ TON БАЛАНСОВ
 * Пересчитывает balance_ton на основе существующих транзакций
 */

import { supabase } from './core/supabase';
import { logger } from './core/logger';

async function fixTonBalances() {
  console.log('=== ВОССТАНОВЛЕНИЕ TON БАЛАНСОВ ===');
  console.log('Дата запуска: ' + new Date().toISOString());
  console.log('');
  
  try {
    // 1. Получаем всех пользователей с TON транзакциями
    console.log('1. Поиск пользователей с TON транзакциями...');
    
    const { data: usersWithTonTx, error: queryError } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('currency', 'TON')
      .order('user_id');
    
    if (queryError) {
      throw new Error(`Ошибка запроса: ${queryError.message}`);
    }
    
    // Уникальные user_id
    const uniqueUserIds = [...new Set(usersWithTonTx?.map(t => t.user_id) || [])];
    console.log(`✅ Найдено ${uniqueUserIds.length} пользователей с TON транзакциями\n`);
    
    // 2. Для каждого пользователя пересчитываем баланс
    const fixResults = [];
    
    for (const userId of uniqueUserIds) {
      console.log(`\nПроверка пользователя ID ${userId}:`);
      console.log('─'.repeat(40));
      
      // Получаем текущий баланс
      const { data: user } = await supabase
        .from('users')
        .select('id, username, balance_ton')
        .eq('id', userId)
        .single();
      
      if (!user) {
        console.log(`❌ Пользователь ${userId} не найден`);
        continue;
      }
      
      const currentBalance = parseFloat(user.balance_ton || '0');
      console.log(`Текущий balance_ton: ${currentBalance}`);
      
      // Получаем все TON транзакции пользователя
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('currency', 'TON')
        .order('created_at');
      
      if (!transactions || transactions.length === 0) {
        console.log('Нет TON транзакций');
        continue;
      }
      
      // Считаем правильный баланс
      let calculatedBalance = 0;
      let deposits = 0;
      let withdrawals = 0;
      let rewards = 0;
      
      for (const tx of transactions) {
        const amount = parseFloat(tx.amount || '0');
        
        // Определяем тип операции
        if (tx.type === 'TON_DEPOSIT' || tx.type === 'DEPOSIT') {
          deposits += amount;
          calculatedBalance += amount;
        } else if (tx.type === 'TON_WITHDRAWAL' || tx.type === 'WITHDRAWAL' || tx.type === 'withdrawal') {
          withdrawals += amount;
          calculatedBalance -= amount;
        } else if (tx.type === 'FARMING_REWARD' || tx.type === 'REFERRAL_REWARD' || 
                   tx.type === 'DAILY_BONUS' || tx.type === 'MISSION_REWARD') {
          rewards += amount;
          calculatedBalance += amount;
        } else if (tx.type === 'withdrawal_fee') {
          // Комиссия за вывод
          calculatedBalance -= amount;
        }
      }
      
      // Не допускаем отрицательный баланс
      calculatedBalance = Math.max(0, calculatedBalance);
      
      console.log(`\nСтатистика транзакций:`);
      console.log(`  • Депозиты: ${deposits} TON`);
      console.log(`  • Выводы: ${withdrawals} TON`);
      console.log(`  • Награды: ${rewards} TON`);
      console.log(`  • Рассчитанный баланс: ${calculatedBalance} TON`);
      console.log(`  • Текущий баланс в БД: ${currentBalance} TON`);
      
      const difference = calculatedBalance - currentBalance;
      
      if (Math.abs(difference) > 0.000001) {
        console.log(`\n⚠️ НАЙДЕНО РАСХОЖДЕНИЕ: ${difference > 0 ? '+' : ''}${difference.toFixed(6)} TON`);
        
        // Обновляем баланс
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            balance_ton: calculatedBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (updateError) {
          console.log(`❌ Ошибка обновления: ${updateError.message}`);
          fixResults.push({
            userId,
            status: 'error',
            error: updateError.message
          });
        } else {
          console.log(`✅ Баланс исправлен: ${currentBalance} → ${calculatedBalance} TON`);
          fixResults.push({
            userId,
            status: 'fixed',
            oldBalance: currentBalance,
            newBalance: calculatedBalance,
            difference
          });
        }
      } else {
        console.log(`✅ Баланс корректный`);
        fixResults.push({
          userId,
          status: 'ok',
          balance: currentBalance
        });
      }
    }
    
    // 3. Итоговый отчет
    console.log('\n' + '='.repeat(50));
    console.log('ИТОГОВЫЙ ОТЧЕТ:');
    console.log('='.repeat(50));
    
    const fixed = fixResults.filter(r => r.status === 'fixed');
    const ok = fixResults.filter(r => r.status === 'ok');
    const errors = fixResults.filter(r => r.status === 'error');
    
    console.log(`\n📊 Результаты:`);
    console.log(`  • Исправлено: ${fixed.length} пользователей`);
    console.log(`  • Корректные: ${ok.length} пользователей`);
    console.log(`  • Ошибки: ${errors.length} пользователей`);
    
    if (fixed.length > 0) {
      console.log(`\n💰 Исправленные балансы:`);
      let totalRecovered = 0;
      for (const fix of fixed) {
        console.log(`  User ${fix.userId}: ${fix.oldBalance} → ${fix.newBalance} TON (${fix.difference > 0 ? '+' : ''}${fix.difference.toFixed(6)})`);
        if (fix.difference > 0) {
          totalRecovered += fix.difference;
        }
      }
      console.log(`\n💎 Всего восстановлено: ${totalRecovered.toFixed(6)} TON`);
    }
    
    if (errors.length > 0) {
      console.log(`\n❌ Ошибки при обновлении:`);
      for (const err of errors) {
        console.log(`  User ${err.userId}: ${err.error}`);
      }
    }
    
    // Логируем в систему
    logger.info('[TON_BALANCE_FIX] Восстановление завершено', {
      fixed: fixed.length,
      ok: ok.length,
      errors: errors.length,
      details: fixResults
    });
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    logger.error('[TON_BALANCE_FIX] Ошибка восстановления', { error });
  }
  
  console.log('\n=== ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО ===');
}

// Запускаем восстановление
fixTonBalances();