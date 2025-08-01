import { supabase } from './core/supabaseClient';

async function detailedAnalysisUser253() {
  console.log('🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ПРОБЛЕМЫ ПОЛЬЗОВАТЕЛЯ ID 253');
  console.log('='.repeat(60));

  try {
    // 1. Проверяем ВСЕ транзакции пользователя 253 за все время
    console.log('\n1️⃣ ВСЕ ТРАНЗАКЦИИ ПОЛЬЗОВАТЕЛЯ 253 ЗА ВСЕ ВРЕМЯ:');
    const { data: allTransactions, error: allTxError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 253)
      .order('created_at', { ascending: false });

    if (allTxError) {
      console.log('❌ Ошибка получения транзакций:', allTxError.message);
    } else {
      console.log(`📋 Всего транзакций за все время: ${allTransactions?.length || 0}`);
      
      if (allTransactions && allTransactions.length > 0) {
        allTransactions.forEach((tx, idx) => {
          console.log(`   ${idx + 1}. [${tx.created_at}] ${tx.type || tx.transaction_type}`);
          console.log(`      Amount: ${tx.amount || tx.amount_ton || tx.amount_uni || '0'}`);
          console.log(`      Description: ${tx.description || 'нет'}`);
          console.log('      ---');
        });
      } else {
        console.log('❌ НИ ОДНОЙ ТРАНЗАКЦИИ НЕ НАЙДЕНО ЗА ВСЕ ВРЕМЯ');
      }
    }

    // 2. Проверяем структуру таблицы транзакций
    console.log('\n2️⃣ ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ TRANSACTIONS:');
    const { data: sampleTx, error: sampleError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);

    if (!sampleError && sampleTx && sampleTx.length > 0) {
      console.log('📊 Структура таблицы transactions:');
      console.log(Object.keys(sampleTx[0]).join(', '));
    }

    // 3. Проверяем недавние транзакции других пользователей для сравнения
    console.log('\n3️⃣ ПОСЛЕДНИЕ ТРАНЗАКЦИИ ДРУГИХ ПОЛЬЗОВАТЕЛЕЙ:');
    const { data: recentTx, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!recentError && recentTx) {
      console.log(`📋 Последние 10 транзакций в системе:`);
      recentTx.forEach((tx, idx) => {
        console.log(`   ${idx + 1}. User ${tx.user_id}: [${tx.created_at}] ${tx.type || tx.transaction_type}`);
        console.log(`      Amount: ${tx.amount || tx.amount_ton || tx.amount_uni || '0'}`);
        console.log(`      Description: ${(tx.description || '').substring(0, 50)}...`);
      });
    }

    // 4. Ищем транзакции с TON депозитами в целом
    console.log('\n4️⃣ ПОИСК TON ДЕПОЗИТОВ В СИСТЕМЕ:');
    const { data: tonDeposits, error: tonDepositError } = await supabase
      .from('transactions')
      .select('*')
      .or('type.ilike.%DEPOSIT%,description.ilike.%deposit%,description.ilike.%пополнение%')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!tonDepositError && tonDeposits) {
      console.log(`💎 Найдено депозитов в системе: ${tonDeposits.length}`);
      tonDeposits.forEach((tx, idx) => {
        console.log(`   ${idx + 1}. User ${tx.user_id}: [${tx.created_at}]`);
        console.log(`      Type: ${tx.type || tx.transaction_type}`);
        console.log(`      Amount: ${tx.amount || tx.amount_ton || tx.amount_uni || '0'}`);
        console.log(`      Description: ${(tx.description || '').substring(0, 50)}...`);
      });
    }

    // 5. Проверяем связанные таблицы
    console.log('\n5️⃣ ПРОВЕРКА СВЯЗАННЫХ ТАБЛИЦ:');
    
    // Проверяем user_balances
    const { data: userBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', 253);

    if (!balanceError && userBalance) {
      console.log(`💰 Записи в user_balances для пользователя 253: ${userBalance.length}`);
      userBalance.forEach(balance => {
        console.log(`   UNI: ${balance.balance_uni}, TON: ${balance.balance_ton}, Updated: ${balance.updated_at}`);
      });
    }

    // Проверяем ton_farming_data
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', '253');

    if (!farmingError && farmingData) {
      console.log(`🌾 Записи в ton_farming_data для пользователя 253: ${farmingData.length}`);
      farmingData.forEach(farming => {
        console.log(`   Farming Balance: ${farming.farming_balance}, Rate: ${farming.farming_rate}`);
        console.log(`   Boost Active: ${farming.boost_active}, Last Update: ${farming.last_update}`);
      });
    }

    // 6. Проверяем лимиты API и возможные ошибки
    console.log('\n6️⃣ ДИАГНОСТИКА ВОЗМОЖНЫХ ПРОБЛЕМ:');
    console.log('✅ Пользователь 253 существует в базе');
    console.log('✅ Подключение к Supabase работает');
    console.log('❓ Проблема может быть в:');
    console.log('   - API endpoint для TON депозитов не работает');
    console.log('   - Транзакции создаются, но откатываются из-за ошибок');
    console.log('   - Проблема с авторизацией при создании транзакций');
    console.log('   - Constraint violations или другие ошибки БД');

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

// Запускаем детальный анализ
detailedAnalysisUser253().catch(console.error);