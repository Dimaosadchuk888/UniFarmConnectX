import { supabase } from './server/supabase';
import { logger } from './core/logger';

/**
 * СРОЧНАЯ ДИАГНОСТИКА: Потеря 3 TON пользователем ID 25
 * Анализ JWT токенов, транзакций и TON депозитов без изменения кода
 */

async function urgentUser25Diagnostic() {
  console.log('🚨 СРОЧНАЯ ДИАГНОСТИКА: Потеря 3 TON пользователем ID 25');
  console.log('📅 Время анализа:', new Date().toISOString());
  console.log('=' .repeat(80));

  try {
    // 1. АНАЛИЗ ПОЛЬЗОВАТЕЛЯ ID 25
    console.log('\n1️⃣ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ID 25:');
    const { data: user25, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, first_name, ton_balance, uni_balance, created_at, last_active')
      .eq('id', 25)
      .single();

    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError);
      return;
    }

    console.log('👤 Пользователь:', {
      id: user25.id,
      telegram_id: user25.telegram_id,
      username: user25.username,
      current_ton_balance: user25.ton_balance,
      current_uni_balance: user25.uni_balance,
      last_active: user25.last_active
    });

    // 2. ВСЕ ТРАНЗАКЦИИ ЗА ПОСЛЕДНИЕ 24 ЧАСА
    console.log('\n2️⃣ ТРАНЗАКЦИИ ПОЛЬЗОВАТЕЛЯ 25 ЗА 24 ЧАСА:');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (txError) {
      console.error('❌ Ошибка получения транзакций:', txError);
    } else {
      console.log(`📊 Найдено ${transactions?.length || 0} транзакций за 24 часа:`);
      
      if (transactions && transactions.length > 0) {
        transactions.forEach((tx, index) => {
          console.log(`${index + 1}. [${tx.created_at}] ${tx.type}: ${tx.amount} ${tx.currency || 'TON'}`);
          console.log(`   📝 Описание: ${tx.description}`);
          if (tx.hash) console.log(`   🔗 Hash: ${tx.hash}`);
          console.log(`   💰 После транзакции: TON=${tx.balance_after_ton}, UNI=${tx.balance_after_uni}`);
          console.log('   ---');
        });
      } else {
        console.log('⚠️  НЕ НАЙДЕНО ТРАНЗАКЦИЙ за последние 24 часа');
      }
    }

    // 3. ПОИСК TON ДЕПОЗИТОВ (возможно в разных таблицах)
    console.log('\n3️⃣ ПОИСК TON ДЕПОЗИТОВ В СИСТЕМЕ:');
    
    // Поиск по hash в транзакциях
    const { data: tonDeposits, error: depositError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('type', 'TON_DEPOSIT')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (depositError) {
      console.error('❌ Ошибка поиска TON депозитов:', depositError);
    } else {
      console.log(`💎 Найдено ${tonDeposits?.length || 0} TON депозитов за 24 часа:`);
      tonDeposits?.forEach((deposit, index) => {
        console.log(`${index + 1}. [${deposit.created_at}] Депозит: ${deposit.amount} TON`);
        console.log(`   🔗 Hash: ${deposit.hash}`);
        console.log(`   📝 Описание: ${deposit.description}`);
      });
    }

    // 4. АНАЛИЗ ВСЕХ ЗАПИСЕЙ С СУММОЙ 3 TON
    console.log('\n4️⃣ ПОИСК ВСЕХ ЗАПИСЕЙ С СУММОЙ 3 TON:');
    const { data: threeTonTx, error: threeError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('amount', '3')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (threeError) {
      console.error('❌ Ошибка поиска 3 TON записей:', threeError);
    } else {
      console.log(`🔍 Найдено ${threeTonTx?.length || 0} записей с суммой 3 TON:`);
      threeTonTx?.forEach((tx, index) => {
        console.log(`${index + 1}. [${tx.created_at}] ${tx.type}: ${tx.amount} TON`);
        console.log(`   📝 Описание: ${tx.description}`);
        console.log(`   🔗 Hash: ${tx.hash || 'Нет hash'}`);
        console.log(`   📊 Баланс до: TON=${tx.balance_before_ton}, UNI=${tx.balance_before_uni}`);
        console.log(`   📊 Баланс после: TON=${tx.balance_after_ton}, UNI=${tx.balance_after_uni}`);
        console.log('   ---');
      });
    }

    // 5. JWT ТОКЕН АНАЛИЗ (из логов if available)
    console.log('\n5️⃣ JWT ТОКЕН ИНФОРМАЦИЯ:');
    console.log('🔑 JWT токены обновляются:');
    console.log('   - При входе в приложение (через Telegram WebApp)');
    console.log('   - При обновлении страницы (если токен истек)');
    console.log('   - Время жизни: обычно 24 часа');
    console.log('   - Проблема: JWT может содержать устаревшие данные баланса');

    // 6. ПРОВЕРКА ПОСЛЕДНИХ API ВЫЗОВОВ БАЛАНСА
    console.log('\n6️⃣ ТЕКУЩИЙ БАЛАНС ПОЛЬЗОВАТЕЛЯ 25:');
    const { data: currentBalance, error: balanceError } = await supabase
      .from('users')
      .select('ton_balance, uni_balance, updated_at')
      .eq('id', 25)
      .single();

    if (balanceError) {
      console.error('❌ Ошибка получения текущего баланса:', balanceError);
    } else {
      console.log('💰 Текущий баланс в БД:', {
        ton_balance: currentBalance.ton_balance,
        uni_balance: currentBalance.uni_balance,
        last_updated: currentBalance.updated_at
      });
    }

    // 7. ВОЗМОЖНЫЕ ПРИЧИНЫ ПОТЕРИ 3 TON
    console.log('\n7️⃣ ВОЗМОЖНЫЕ ПРИЧИНЫ ПОТЕРИ 3 TON:');
    console.log('🔍 Потенциальные проблемы:');
    console.log('   1. Race condition между Frontend TON Connect и Backend API');
    console.log('   2. JWT токен содержит старые данные баланса при обновлении');
    console.log('   3. Rollback функции (отключены, но могли сработать до отключения)');
    console.log('   4. Дублирование транзакции (одна обработана, другая потеряна)');
    console.log('   5. Проблема с editMessage в TON Connect сервисе');

    // 8. РЕКОМЕНДАЦИИ
    console.log('\n8️⃣ СРОЧНЫЕ РЕКОМЕНДАЦИИ:');
    console.log('⚡ Немедленные действия:');
    console.log('   1. Проверить логи server/index.ts за время депозита');
    console.log('   2. Найти blockchain hash потерянной транзакции');
    console.log('   3. Проверить frontend logs на наличие ошибок TON Connect');
    console.log('   4. Компенсировать 3 TON пользователю ID 25 если транзакция подтверждена');

  } catch (error) {
    console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА В ДИАГНОСТИКЕ:', error);
  }
}

// Запуск диагностики
urgentUser25Diagnostic().catch(console.error);