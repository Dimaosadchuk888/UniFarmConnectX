import { supabase } from '../core/supabase';

async function checkUnifiedTransactions() {
  console.log('=== Проверка унификации транзакций ===\n');

  // Проверяем транзакции с metadata
  const { data: transactionsWithMetadata, error } = await supabase
    .from('transactions')
    .select('*')
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Ошибка при получении транзакций:', error);
    return;
  }

  console.log(`🔍 Найдено ${transactionsWithMetadata?.length || 0} транзакций с metadata:\n`);

  transactionsWithMetadata?.forEach(tx => {
    console.log(`ID: ${tx.id}`);
    console.log(`User: ${tx.user_id}`);
    console.log(`Type: ${tx.type}`);
    console.log(`Amount: ${tx.amount_uni} UNI / ${tx.amount_ton} TON`);
    console.log(`Metadata: ${JSON.stringify(tx.metadata)}`);
    console.log(`Created: ${tx.created_at}`);
    console.log('---');
  });

  // Проверяем последние транзакции TON Boost
  const { data: tonBoostTx } = await supabase
    .from('transactions')
    .select('*')
    .ilike('description', '%TON Boost%')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`\n🔍 Последние 5 транзакций TON Boost:`);
  console.log(`Найдено: ${tonBoostTx?.length || 0}\n`);

  tonBoostTx?.forEach(tx => {
    console.log(`ID: ${tx.id}, Type: ${tx.type}, Metadata: ${tx.metadata ? 'Есть' : 'Нет'}`);
  });

  // Проверяем последние реферальные транзакции  
  const { data: referralTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'REFERRAL_REWARD')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`\n🔍 Последние 5 реферальных транзакций:`);
  console.log(`Найдено: ${referralTx?.length || 0}\n`);

  referralTx?.forEach(tx => {
    console.log(`ID: ${tx.id}, Metadata: ${tx.metadata ? 'Есть' : 'Нет'}, Description: ${tx.description}`);
  });
}

checkUnifiedTransactions()
  .then(() => process.exit(0))
  .catch(console.error);