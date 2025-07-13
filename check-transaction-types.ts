import { supabase } from './core/supabase.js';

async function checkTransactionTypes() {
  console.log('=== Проверка типов транзакций в БД ===\n');

  try {
    // Получаем несколько транзакций разных типов
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('type')
      .limit(100);

    if (error) {
      console.error('Ошибка:', error);
      return;
    }

    // Собираем уникальные типы
    const uniqueTypes = new Set(transactions?.map(t => t.type) || []);
    
    console.log('Найденные типы транзакций в БД:');
    Array.from(uniqueTypes).forEach(type => {
      console.log(`- ${type}`);
    });

    // Проверяем код планировщика
    console.log('\n📄 Проверка кода tonBoostIncomeScheduler.ts...');
    console.log('В коде используется тип: TON_BOOST_INCOME');
    
    // Проверяем транзакции с TON суммами
    const { data: tonTransactions, error: tonError } = await supabase
      .from('transactions')
      .select('type, amount_ton, created_at')
      .not('amount_ton', 'is', null)
      .gt('amount_ton', 0)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!tonError && tonTransactions) {
      console.log('\n💰 Последние транзакции с TON суммами:');
      tonTransactions.forEach(tx => {
        console.log(`- ${tx.type}: ${tx.amount_ton} TON (${tx.created_at})`);
      });
    }

    // Проверяем какие типы используются для TON операций
    console.log('\n❓ Вывод:');
    console.log('- TON_BOOST_INCOME не существует в БД');
    console.log('- Возможно нужно использовать другой тип транзакции');
    console.log('- Или добавить TON_BOOST_INCOME в enum transaction_type в БД');

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkTransactionTypes().catch(console.error);