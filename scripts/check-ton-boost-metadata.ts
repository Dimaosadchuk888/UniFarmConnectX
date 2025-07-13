import { supabase } from '../core/supabase';

async function checkTransactionMetadata() {
  console.log('Checking TON Boost transactions metadata...\n');
  
  // Получаем последние транзакции с метаданными
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount_ton, description, metadata, created_at')
    .eq('currency', 'TON')
    .like('description', 'TON Boost%')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Latest TON Boost transactions with metadata:');
  console.log('='.repeat(100));
  
  data?.forEach(tx => {
    const date = new Date(tx.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
    console.log(`\nID: ${tx.id} | User: ${tx.user_id} | Type: ${tx.type}`);
    console.log(`Time: ${date}`);
    console.log(`Amount: ${tx.amount_ton} TON`);
    console.log(`Description: ${tx.description}`);
    
    if (tx.metadata) {
      console.log('Metadata:', JSON.stringify(tx.metadata, null, 2));
      
      // Проверяем наличие ключевых полей
      const metadata = tx.metadata;
      if (metadata.original_type === 'TON_BOOST_INCOME' && metadata.transaction_source === 'ton_boost_scheduler') {
        console.log('✅ METADATA CORRECT: Contains original_type and transaction_source');
      } else {
        console.log('❌ METADATA MISSING: Expected fields not found');
      }
    } else {
      console.log('❌ NO METADATA');
    }
    
    console.log('-'.repeat(100));
  });
  
  // Проверяем, есть ли транзакции с новыми метаданными
  const withMetadata = data?.filter(tx => 
    tx.metadata?.original_type === 'TON_BOOST_INCOME' && 
    tx.metadata?.transaction_source === 'ton_boost_scheduler'
  ) || [];
  
  console.log(`\n📊 Summary:`);
  console.log(`Total TON Boost transactions checked: ${data?.length || 0}`);
  console.log(`Transactions with correct metadata: ${withMetadata.length}`);
  
  if (withMetadata.length > 0) {
    console.log('\n✅ SUCCESS: TON Boost transactions are being created with proper metadata!');
  } else {
    console.log('\n⚠️  WARNING: No transactions with new metadata format found yet.');
    console.log('The server might need more time for the next scheduler cycle.');
  }
}

checkTransactionMetadata().catch(console.error);