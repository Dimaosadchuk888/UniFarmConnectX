/**
 * ДИАГНОСТИКА ПРОБЛЕМЫ С TON ДЕПОЗИТАМИ
 * Проверяем всю цепочку от получения депозита до обновления баланса
 */

import { supabase } from './core/supabase';
import { logger } from './core/logger';

async function diagnoseTonDepositChain() {
  console.log('=== ДИАГНОСТИКА ПРОБЛЕМЫ С TON ДЕПОЗИТАМИ ===');
  console.log('Дата: ' + new Date().toISOString());
  console.log('');
  
  try {
    // 1. ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ USERS
    console.log('1. ПРОВЕРКА ПОЛЕЙ БАЛАНСА В ТАБЛИЦЕ USERS:');
    console.log('=========================================');
    
    const { data: sampleUser, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton, ton_wallet_address')
      .limit(1)
      .single();
    
    if (sampleUser) {
      console.log('✅ Структура таблицы users:');
      console.log('   - id: ' + typeof sampleUser.id + ' (значение: ' + sampleUser.id + ')');
      console.log('   - telegram_id: ' + typeof sampleUser.telegram_id);
      console.log('   - balance_uni: ' + typeof sampleUser.balance_uni + ' (значение: ' + sampleUser.balance_uni + ')');
      console.log('   - balance_ton: ' + typeof sampleUser.balance_ton + ' (значение: ' + sampleUser.balance_ton + ')');
      console.log('   - ton_wallet_address: ' + typeof sampleUser.ton_wallet_address);
      console.log('');
      console.log('⚠️  ВАЖНО: Депозиты должны обновлять поле balance_ton!');
    } else {
      console.log('❌ Не удалось получить структуру таблицы users:', userError);
    }
    
    // 2. ПРОВЕРКА ПОСЛЕДНИХ TON ДЕПОЗИТОВ
    console.log('\n2. ПОСЛЕДНИЕ TON ДЕПОЗИТЫ В СИСТЕМЕ:');
    console.log('=====================================');
    
    const { data: tonDeposits, error: depositsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (tonDeposits && tonDeposits.length > 0) {
      console.log(`✅ Найдено ${tonDeposits.length} последних TON депозитов:\n`);
      
      for (const deposit of tonDeposits) {
        console.log(`Депозит ID: ${deposit.id}`);
        console.log(`  - User ID: ${deposit.user_id}`);
        console.log(`  - Сумма: ${deposit.amount} TON`);
        console.log(`  - Статус: ${deposit.status}`);
        console.log(`  - Дата: ${new Date(deposit.created_at).toLocaleString('ru-RU')}`);
        console.log(`  - Metadata: ${JSON.stringify(deposit.metadata || {})}`);
        
        // Проверяем баланс пользователя
        const { data: user } = await supabase
          .from('users')
          .select('id, balance_ton, balance_uni')
          .eq('id', deposit.user_id)
          .single();
        
        if (user) {
          console.log(`  - Текущий баланс пользователя:`);
          console.log(`    • TON: ${user.balance_ton}`);
          console.log(`    • UNI: ${user.balance_uni}`);
        } else {
          console.log(`  - ⚠️ Пользователь не найден!`);
        }
        console.log('');
      }
    } else {
      console.log('⚠️ TON депозиты не найдены в системе');
    }
    
    // 3. ПРОВЕРКА TON_TRANSACTIONS
    console.log('\n3. ПРОВЕРКА ТАБЛИЦЫ TON_TRANSACTIONS:');
    console.log('======================================');
    
    const { data: tonTxs, error: txError } = await supabase
      .from('ton_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (tonTxs && tonTxs.length > 0) {
      console.log(`✅ Найдено ${tonTxs.length} записей в ton_transactions:\n`);
      
      for (const tx of tonTxs) {
        console.log(`TON TX ID: ${tx.id}`);
        console.log(`  - User ID: ${tx.user_id}`);
        console.log(`  - Hash: ${tx.ton_tx_hash?.substring(0, 20)}...`);
        console.log(`  - Amount: ${tx.amount} TON`);
        console.log(`  - Wallet: ${tx.wallet_address?.substring(0, 20)}...`);
        console.log(`  - Created: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        console.log('');
      }
    } else {
      console.log('⚠️ Нет записей в ton_transactions');
    }
    
    // 4. АНАЛИЗ РАСХОЖДЕНИЙ
    console.log('\n4. АНАЛИЗ РАСХОЖДЕНИЙ:');
    console.log('=======================');
    
    // Проверяем пользователей с нулевым балансом но с депозитами
    const { data: problematicUsers } = await supabase
      .from('users')
      .select(`
        id,
        telegram_id,
        username,
        balance_ton,
        balance_uni,
        transactions!inner(
          id,
          type,
          amount,
          currency,
          created_at
        )
      `)
      .eq('transactions.type', 'TON_DEPOSIT')
      .eq('balance_ton', 0)
      .limit(5);
    
    if (problematicUsers && problematicUsers.length > 0) {
      console.log('❌ НАЙДЕНЫ ПРОБЛЕМНЫЕ АККАУНТЫ:');
      console.log('Пользователи с TON депозитами но нулевым balance_ton:\n');
      
      for (const user of problematicUsers) {
        console.log(`User ID ${user.id} (${user.username || 'no username'}):`);
        console.log(`  - balance_ton: ${user.balance_ton} (ДОЛЖЕН БЫТЬ > 0)`);
        console.log(`  - balance_uni: ${user.balance_uni}`);
        
        if (user.transactions && Array.isArray(user.transactions)) {
          const tonDeposits = user.transactions.filter((t: any) => 
            t.type === 'TON_DEPOSIT' && t.currency === 'TON'
          );
          const totalDeposited = tonDeposits.reduce((sum: number, t: any) => 
            sum + parseFloat(t.amount || 0), 0
          );
          console.log(`  - Найдено ${tonDeposits.length} TON депозитов`);
          console.log(`  - Общая сумма депозитов: ${totalDeposited} TON`);
          console.log(`  - ⚠️ РАСХОЖДЕНИЕ: Депозиты не отражены в balance_ton!`);
        }
        console.log('');
      }
    } else {
      console.log('✅ Не найдено пользователей с очевидными расхождениями');
    }
    
    // 5. ПРОВЕРКА ЦЕПОЧКИ ОБНОВЛЕНИЯ БАЛАНСА
    console.log('\n5. ПРОВЕРКА МЕХАНИЗМА ОБНОВЛЕНИЯ БАЛАНСА:');
    console.log('==========================================');
    
    console.log('Проверяем последнее обновление balance_ton...');
    
    // Ищем пользователей с недавними изменениями balance_ton
    const { data: recentlyUpdated } = await supabase
      .from('users')
      .select('id, username, balance_ton, updated_at')
      .gt('balance_ton', 0)
      .order('updated_at', { ascending: false })
      .limit(5);
    
    if (recentlyUpdated && recentlyUpdated.length > 0) {
      console.log(`✅ Последние обновления balance_ton:`);
      for (const user of recentlyUpdated) {
        const timeAgo = Date.now() - new Date(user.updated_at).getTime();
        const minutes = Math.floor(timeAgo / 60000);
        console.log(`  - User ${user.id}: ${user.balance_ton} TON (обновлено ${minutes} мин назад)`);
      }
    } else {
      console.log('⚠️ Нет недавних обновлений balance_ton');
    }
    
    // 6. ИТОГОВЫЙ АНАЛИЗ
    console.log('\n6. ИТОГОВЫЙ АНАЛИЗ:');
    console.log('====================');
    
    console.log('🔍 КЛЮЧЕВЫЕ НАХОДКИ:');
    console.log('1. Поле для хранения TON баланса: balance_ton (тип: ' + typeof sampleUser?.balance_ton + ')');
    console.log('2. TON депозиты создаются в таблице transactions');
    console.log('3. Записи также создаются в ton_transactions');
    console.log('4. ПРОБЛЕМА: balance_ton не всегда обновляется после депозита');
    console.log('');
    console.log('⚠️ ВЕРОЯТНЫЕ ПРИЧИНЫ ПРОБЛЕМЫ:');
    console.log('1. BalanceManager может не вызываться для некоторых депозитов');
    console.log('2. Возможна ошибка в логике обновления balance_ton');
    console.log('3. Транзакция создается, но баланс не обновляется');
    console.log('4. Возможны проблемы с правами доступа к полю balance_ton');
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
  
  console.log('\n=== КОНЕЦ ДИАГНОСТИКИ ===');
}

// Запускаем диагностику
diagnoseTonDepositChain();