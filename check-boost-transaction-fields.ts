import { supabase } from './core/supabaseClient';

async function checkBoostTransactionFields() {
  console.log('=== ПРОВЕРКА ПОЛЕЙ ТРАНЗАКЦИЙ BOOST_PURCHASE ===\n');
  
  // Получаем несколько транзакций BOOST_PURCHASE с всеми полями
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .eq('type', 'BOOST_PURCHASE')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (transactions && transactions.length > 0) {
    console.log('Детальный анализ транзакций:\n');
    
    transactions.forEach((tx, i) => {
      console.log(`Транзакция ${i + 1}:`);
      console.log(`├── id: ${tx.id}`);
      console.log(`├── type: ${tx.type}`);
      console.log(`├── amount: ${tx.amount} (поле amount)`);
      console.log(`├── amount_ton: ${tx.amount_ton} (поле amount_ton)`);
      console.log(`├── amount_uni: ${tx.amount_uni} (поле amount_uni)`);
      console.log(`├── currency: ${tx.currency}`);
      console.log(`├── description: ${tx.description}`);
      console.log(`├── metadata: ${JSON.stringify(tx.metadata)}`);
      console.log(`└── created_at: ${tx.created_at}\n`);
    });
    
    // Проверяем транзакции с отрицательными суммами
    console.log('Проверка транзакций с отрицательными суммами в поле amount:');
    const { data: negativeTransactions } = await supabase
      .from('transactions')
      .select('type, amount, amount_ton, currency, description')
      .eq('user_id', 184)
      .lt('amount', 0)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (negativeTransactions && negativeTransactions.length > 0) {
      negativeTransactions.forEach(tx => {
        console.log(`├── ${tx.type}: amount=${tx.amount}, amount_ton=${tx.amount_ton}, currency=${tx.currency}`);
      });
    }
  } else {
    console.log('Транзакции BOOST_PURCHASE не найдены');
  }
}

checkBoostTransactionFields();