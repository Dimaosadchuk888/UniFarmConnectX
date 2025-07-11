import { supabase } from './core/supabaseClient';

async function checkTransactionsDetail() {
  console.log('=== Детальная проверка транзакций ===\n');
  
  // Проверяем последние транзакции для user_id = 74
  const { data: tx74, error: error74 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('Транзакции для user_id=74:');
  if (tx74 && tx74.length > 0) {
    tx74.forEach(tx => {
      console.log(`ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount}, Currency: ${tx.currency}, Created: ${tx.created_at}`);
    });
  } else {
    console.log('Нет транзакций');
  }
  
  console.log('\n');
  
  // Проверяем последние транзакции для user_id = 75
  const { data: tx75, error: error75 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 75)
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('Транзакции для user_id=75:');
  if (tx75 && tx75.length > 0) {
    tx75.forEach(tx => {
      console.log(`ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount}, Currency: ${tx.currency}, Created: ${tx.created_at}`);
    });
  } else {
    console.log('Нет транзакций');
  }
  
  console.log('\n');
  
  // Проверяем есть ли транзакции с amount != 0 для user_id = 74
  const { data: txWithAmount, error: errorAmount } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .neq('amount', 0)
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('Транзакции с amount != 0 для user_id=74:');
  if (txWithAmount && txWithAmount.length > 0) {
    console.log(`Найдено ${txWithAmount.length} транзакций с ненулевым amount`);
    txWithAmount.forEach(tx => {
      console.log(`ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount}, Currency: ${tx.currency}`);
    });
  } else {
    console.log('Все транзакции имеют amount = 0');
  }
  
  process.exit(0);
}

checkTransactionsDetail().catch(console.error);