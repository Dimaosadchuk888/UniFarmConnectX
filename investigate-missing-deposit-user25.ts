/**
 * ЭКСТРЕННОЕ РАССЛЕДОВАНИЕ: ПРОПАВШЕЕ ПОПОЛНЕНИЕ USER 25
 * Проверяем все уровни системы для поиска потерянного депозита
 */

import { supabase } from './core/supabase.js';

async function investigateMissingDeposit() {
  console.log('🚨 ЭКСТРЕННОЕ РАССЛЕДОВАНИЕ: ПРОПАВШЕЕ ПОПОЛНЕНИЕ USER 25');
  console.log('📅 Время расследования:', new Date().toISOString());
  
  try {
    // 1. Проверяем информацию о User 25
    console.log('\n=== 1. ИНФОРМАЦИЯ О USER 25 ===');
    
    const { data: user25, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', 25)
      .single();
    
    if (userError) {
      console.log('❌ Ошибка получения пользователя:', userError.message);
      return;
    }
    
    console.log('👤 User 25 данные:', {
      internal_id: user25.id,
      telegram_id: user25.telegram_id,
      username: user25.username,
      balance_uni: user25.balance_uni,
      balance_ton: user25.balance_ton,
      created_at: user25.created_at,
      updated_at: user25.updated_at
    });
    
    // 2. Ищем ВСЕ транзакции User 25 за последние 2 часа
    console.log('\n=== 2. ПОИСК ТРАНЗАКЦИЙ ПОЛЬЗОВАТЕЛЯ ===');
    
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    // Поиск по telegram_id (новая логика)
    const { data: transactionsByTelegramId, error: txError1 } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false });
    
    console.log(`🔍 Транзакции по telegram_id (25) за последние 2 часа: ${transactionsByTelegramId?.length || 0}`);
    
    if (transactionsByTelegramId && transactionsByTelegramId.length > 0) {
      transactionsByTelegramId.forEach((tx, i) => {
        console.log(`  ${i+1}. ID ${tx.id}: ${tx.type} | ${tx.amount_uni || tx.amount_ton} ${tx.currency} | ${tx.status} | ${tx.description}`);
        console.log(`     Создана: ${tx.created_at}`);
      });
    } else {
      console.log('  ❌ Транзакций по telegram_id не найдено');
    }
    
    // Поиск по internal_id (старая логика)
    const { data: transactionsByInternalId, error: txError2 } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user25.id)
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false });
    
    console.log(`🔍 Транзакции по internal_id (${user25.id}) за последние 2 часа: ${transactionsByInternalId?.length || 0}`);
    
    if (transactionsByInternalId && transactionsByInternalId.length > 0) {
      transactionsByInternalId.forEach((tx, i) => {
        console.log(`  ${i+1}. ID ${tx.id}: ${tx.type} | ${tx.amount_uni || tx.amount_ton} ${tx.currency} | ${tx.status} | ${tx.description}`);
        console.log(`     Создана: ${tx.created_at}`);
      });
    } else {
      console.log('  ❌ Транзакций по internal_id не найдено');
    }
    
    // 3. Ищем TON deposits в blockchain (если это TON депозит)
    console.log('\n=== 3. ПОИСК TON ДЕПОЗИТОВ ===');
    
    const { data: tonDeposits, error: tonError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false });
    
    console.log(`💎 Все TON депозиты за последние 2 часа: ${tonDeposits?.length || 0}`);
    
    if (tonDeposits && tonDeposits.length > 0) {
      tonDeposits.forEach((tx, i) => {
        console.log(`  ${i+1}. User ${tx.user_id}: ${tx.amount_ton} TON | ${tx.status} | ${tx.tx_hash || 'no hash'}`);
        console.log(`     Создана: ${tx.created_at}`);
      });
    }
    
    // 4. Проверяем pending транзакции
    console.log('\n=== 4. ПОИСК НЕЗАВЕРШЕННЫХ ТРАНЗАКЦИЙ ===');
    
    const { data: pendingTx, error: pendingError } = await supabase
      .from('transactions')
      .select('*')
      .in('status', ['pending', 'processing'])
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false });
    
    console.log(`⏳ Pending транзакции за последние 2 часа: ${pendingTx?.length || 0}`);
    
    if (pendingTx && pendingTx.length > 0) {
      pendingTx.forEach((tx, i) => {
        console.log(`  ${i+1}. User ${tx.user_id}: ${tx.type} | ${tx.amount_uni || tx.amount_ton} ${tx.currency} | ${tx.status}`);
        console.log(`     Hash: ${tx.tx_hash || 'no hash'}`);
        console.log(`     Создана: ${tx.created_at}`);
      });
    }
    
    // 5. Проверяем логи сервера
    console.log('\n=== 5. ПРОВЕРКА ЛОГОВ ===');
    
    // Ищем недавние ошибки в транзакциях
    const { data: errorLogs, error: logError } = await supabase
      .from('transactions')
      .select('*')
      .ilike('description', '%error%')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false });
    
    console.log(`❌ Транзакции с ошибками за последние 2 часа: ${errorLogs?.length || 0}`);
    
    if (errorLogs && errorLogs.length > 0) {
      errorLogs.forEach((tx, i) => {
        console.log(`  ${i+1}. User ${tx.user_id}: ${tx.description}`);
      });
    }
    
    // 6. Тестируем BalanceManager с User 25
    console.log('\n=== 6. ТЕСТ BALANCE MANAGER ===');
    
    try {
      const { BalanceManager } = await import('./core/BalanceManager.js');
      const balanceManager = BalanceManager.getInstance();
      
      const balanceResult = await balanceManager.getUserBalance(25);
      
      if (balanceResult.success) {
        console.log('✅ BalanceManager работает с User 25:', {
          balance_uni: balanceResult.balance?.balance_uni,
          balance_ton: balanceResult.balance?.balance_ton
        });
        
        // Пробуем пересчитать баланс
        const recalcResult = await balanceManager.validateAndRecalculateBalance(25);
        
        if (recalcResult.success) {
          console.log('🔧 Результат пересчета:', {
            corrected: recalcResult.corrected,
            new_uni: recalcResult.newBalance?.balance_uni,
            new_ton: recalcResult.newBalance?.balance_ton
          });
        } else {
          console.log('❌ Ошибка пересчета:', recalcResult.error);
        }
        
      } else {
        console.log('❌ BalanceManager не работает с User 25:', balanceResult.error);
      }
      
    } catch (bmError) {
      console.log('❌ Ошибка загрузки BalanceManager:', bmError.message);
    }
    
    // 7. Проверяем есть ли User 25 в системе вообще
    console.log('\n=== 7. ГЛОБАЛЬНАЯ ПРОВЕРКА USER 25 ===');
    
    const { data: allUsers25, error: allError } = await supabase
      .from('users')
      .select('id, telegram_id, username')
      .or('telegram_id.eq.25,id.eq.25');
    
    console.log(`👥 Все записи с ID 25: ${allUsers25?.length || 0}`);
    
    if (allUsers25 && allUsers25.length > 0) {
      allUsers25.forEach((user, i) => {
        console.log(`  ${i+1}. internal_id: ${user.id}, telegram_id: ${user.telegram_id}, username: ${user.username}`);
      });
    }
    
    // ФИНАЛЬНЫЕ ВЫВОДЫ
    console.log('\n=== 🎯 ВЫВОДЫ РАССЛЕДОВАНИЯ ===');
    console.log('1. User 25 в системе:', user25 ? 'НАЙДЕН' : 'НЕ НАЙДЕН');
    console.log('2. Транзакции User 25 за 2 часа:', (transactionsByTelegramId?.length || 0) + (transactionsByInternalId?.length || 0));
    console.log('3. TON депозиты в системе:', tonDeposits?.length || 0);
    console.log('4. Pending транзакции:', pendingTx?.length || 0);
    console.log('5. Ошибки в транзакциях:', errorLogs?.length || 0);
    
    if (user25) {
      console.log('\n📊 ТЕКУЩИЙ БАЛАНС USER 25:');
      console.log(`   UNI: ${user25.balance_uni}`);
      console.log(`   TON: ${user25.balance_ton}`);
      console.log(`   Обновлен: ${user25.updated_at}`);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка расследования:', error);
    console.error('Stack:', error.stack);
  }
}

investigateMissingDeposit();