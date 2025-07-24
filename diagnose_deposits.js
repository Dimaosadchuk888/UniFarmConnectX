// Диагностический скрипт для проверки депозитов User #25
import { supabase } from './core/supabaseClient.js';

async function diagnoseUser25Deposits() {
  console.log('🔍 ДИАГНОСТИКА ДЕПОЗИТОВ USER #25');
  console.log('================================');
  
  try {
    // 1. Проверяем баланс пользователя
    console.log('\n1. ТЕКУЩИЙ БАЛАНС:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton, updated_at')
      .eq('id', 25)
      .single();
    
    if (userError) {
      console.log('❌ Ошибка получения пользователя:', userError.message);
      return;
    }
    
    console.log(`   TON: ${user.balance_ton || 0}`);
    console.log(`   UNI: ${user.balance_uni || 0}`);
    console.log(`   Обновлен: ${user.updated_at}`);
    
    // 2. Проверяем последние транзакции
    console.log('\n2. ПОСЛЕДНИЕ ТРАНЗАКЦИИ (все типы):');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, type, amount, amount_ton, amount_uni, currency, status, description, created_at, metadata, tx_hash_unique')
      .eq('user_id', 25)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (txError) {
      console.log('❌ Ошибка получения транзакций:', txError.message);
      return;
    }
    
    if (!transactions || transactions.length === 0) {
      console.log('   ⚠️ Транзакции не найдены!');
    } else {
      transactions.forEach((tx, i) => {
        console.log(`   ${i+1}. ID: ${tx.id}`);
        console.log(`      Тип: ${tx.type} | Статус: ${tx.status}`);
        console.log(`      TON: ${tx.amount_ton || 0} | UNI: ${tx.amount_uni || 0}`);
        console.log(`      Создана: ${tx.created_at}`);
        console.log(`      tx_hash_unique: ${tx.tx_hash_unique || 'NULL'}`);
        console.log(`      Описание: ${tx.description || 'Нет'}`);
        console.log('      ---');
      });
    }
    
    // 3. Проверяем TON депозиты за последние 24 часа
    console.log('\n3. TON ДЕПОЗИТЫ ЗА 24 ЧАСА:');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: tonDeposits, error: tonError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .or('type.eq.TON_DEPOSIT,currency.eq.TON,amount_ton.gt.0')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });
    
    if (tonError) {
      console.log('❌ Ошибка получения TON депозитов:', tonError.message);
    } else if (!tonDeposits || tonDeposits.length === 0) {
      console.log('   ⚠️ TON депозиты за 24 часа не найдены!');
    } else {
      console.log(`   ✅ Найдено ${tonDeposits.length} TON депозитов:`);
      tonDeposits.forEach((dep, i) => {
        console.log(`   ${i+1}. ${dep.amount_ton} TON (${dep.created_at}) - Статус: ${dep.status}`);
      });
    }
    
    // 4. Проверяем записи в таблице deposits (если существует)
    console.log('\n4. ПРОВЕРКА ТАБЛИЦЫ DEPOSITS:');
    const { data: deposits, error: depError } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', 25)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (depError) {
      console.log('   ⚠️ Таблица deposits недоступна или не существует');
    } else if (!deposits || deposits.length === 0) {
      console.log('   ⚠️ Записи в deposits не найдены');
    } else {
      console.log(`   ✅ Найдено ${deposits.length} записей в deposits`);
      deposits.forEach((dep, i) => {
        console.log(`   ${i+1}. ${dep.amount} ${dep.currency} (${dep.created_at})`);
      });
    }
    
    // 5. Статистика по всем пользователям для сравнения
    console.log('\n5. СРАВНИТЕЛЬНАЯ СТАТИСТИКА:');
    const { data: allUsers, error: statsError } = await supabase
      .from('transactions')
      .select('user_id, amount_ton')
      .not('amount_ton', 'is', null)
      .gt('amount_ton', 0)
      .gte('created_at', yesterday.toISOString());
    
    if (!statsError && allUsers) {
      const userStats = {};
      allUsers.forEach(tx => {
        if (!userStats[tx.user_id]) userStats[tx.user_id] = 0;
        userStats[tx.user_id] += parseFloat(tx.amount_ton || 0);
      });
      
      console.log(`   Пользователей с TON депозитами за 24ч: ${Object.keys(userStats).length}`);
      console.log(`   User #25 в списке: ${userStats[25] ? `Да (${userStats[25]} TON)` : 'НЕТ!'}`);
    }
    
  } catch (error) {
    console.log('💥 КРИТИЧНАЯ ОШИБКА:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Запускаем диагностику
diagnoseUser25Deposits()
  .then(() => {
    console.log('\n✅ Диагностика завершена');
    process.exit(0);
  })
  .catch(err => {
    console.log('💥 Ошибка запуска диагностики:', err.message);
    process.exit(1);
  });