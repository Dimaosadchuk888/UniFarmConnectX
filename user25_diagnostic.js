import { supabase } from './core/supabaseClient.js';

async function diagnoseUser25() {
  console.log('🔍 КРИТИЧНАЯ ДИАГНОСТИКА USER #25 - ДЕПОЗИТЫ');
  console.log('================================================');
  
  try {
    // 1. Проверяем баланс пользователя
    console.log('\n1. БАЛАНС USER #25:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton, updated_at')
      .eq('id', 25)
      .single();
    
    if (userError) {
      console.log(`❌ Ошибка: ${userError.message}`);
    } else {
      console.log(`   TON баланс: ${user.balance_ton || 0}`);
      console.log(`   UNI баланс: ${user.balance_uni || 0}`);
      console.log(`   Последнее обновление: ${user.updated_at}`);
    }
    
    // 2. Проверяем ВСЕ транзакции за последние 48 часов
    console.log('\n2. ВСЕ ТРАНЗАКЦИИ ЗА 48 ЧАСОВ:');
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: allTx, error: allTxError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', twoDaysAgo)
      .order('created_at', { ascending: false });
    
    if (allTxError) {
      console.log(`❌ Ошибка: ${allTxError.message}`);
    } else if (!allTx || allTx.length === 0) {
      console.log('   ⚠️ НЕТ ТРАНЗАКЦИЙ за 48 часов!');
    } else {
      console.log(`   ✅ Найдено ${allTx.length} транзакций:`);
      allTx.forEach((tx, i) => {
        console.log(`   ${i+1}. ID: ${tx.id} | ${tx.type}`);
        console.log(`      TON: ${tx.amount_ton || 0} | UNI: ${tx.amount_uni || 0}`);
        console.log(`      Статус: ${tx.status} | Создана: ${tx.created_at}`);
        console.log(`      Описание: ${tx.description || 'Нет'}`);
        console.log(`      tx_hash_unique: ${tx.tx_hash_unique || 'NULL'}`);
        console.log(`      ---`);
      });
    }
    
    // 3. Проверяем TON депозиты конкретно
    console.log('\n3. TON ДЕПОЗИТЫ (все время):');
    const { data: tonDeposits, error: tonError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .or('type.eq.TON_DEPOSIT,currency.eq.TON,type.ilike.%ton%')
      .order('created_at', { ascending: false });
    
    if (tonError) {
      console.log(`❌ Ошибка: ${tonError.message}`);
    } else if (!tonDeposits || tonDeposits.length === 0) {
      console.log('   ⚠️ НЕТ TON ДЕПОЗИТОВ в истории!');
    } else {
      console.log(`   ✅ Найдено ${tonDeposits.length} TON депозитов:`);
      tonDeposits.forEach((dep, i) => {
        console.log(`   ${i+1}. ${dep.amount_ton} TON | ${dep.created_at} | Статус: ${dep.status}`);
        console.log(`      ID: ${dep.id} | Hash: ${dep.tx_hash_unique || 'NULL'}`);
      });
    }
    
    // 4. Проверяем есть ли таблица deposits
    console.log('\n4. ТАБЛИЦА DEPOSITS:');
    const { data: deposits, error: depError } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', 25)
      .order('created_at', { ascending: false });
    
    if (depError) {
      console.log(`   ⚠️ ${depError.message}`);
    } else if (!deposits || deposits.length === 0) {
      console.log('   ⚠️ НЕТ записей в deposits');
    } else {
      console.log(`   ✅ Найдено ${deposits.length} записей в deposits`);
    }
    
    // 5. Сравнение с другими пользователями
    console.log('\n5. СРАВНЕНИЕ С ДРУГИМИ ПОЛЬЗОВАТЕЛЯМИ:');
    const { data: recentDeposits, error: recentError } = await supabase
      .from('transactions')
      .select('user_id, amount_ton, created_at')
      .not('amount_ton', 'is', null)
      .gt('amount_ton', 0)
      .gte('created_at', twoDaysAgo)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!recentError && recentDeposits) {
      console.log(`   Последние TON депозиты в системе:`);
      recentDeposits.forEach((dep, i) => {
        const isUser25 = dep.user_id === 25 ? ' ← USER #25!' : '';
        console.log(`   ${i+1}. User ${dep.user_id}: ${dep.amount_ton} TON | ${dep.created_at}${isUser25}`);
      });
    }
    
  } catch (error) {
    console.log('💥 КРИТИЧНАЯ ОШИБКА:', error.message);
  }
}

// Запуск диагностики
diagnoseUser25().then(() => {
  console.log('\n✅ Диагностика завершена');
  process.exit(0);
}).catch(err => {
  console.log('💥 Ошибка:', err.message);
  process.exit(1);
});