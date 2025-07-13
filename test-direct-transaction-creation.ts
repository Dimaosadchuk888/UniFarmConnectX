import { supabase } from './core/supabase';

async function testDirectTransactionCreation() {
  console.log('=== TESTING DIRECT TRANSACTION CREATION ===\n');
  
  // Test creating a FARMING_REWARD transaction directly
  const testData = {
    user_id: 74,
    type: 'FARMING_REWARD',
    amount: '2080.236189',
    amount_uni: '2080.236189',
    amount_ton: '0',
    currency: 'UNI',
    status: 'completed',
    description: 'UNI farming income: 2080.236189 UNI (rate: 0.01)',
    source_user_id: 74,
    created_at: new Date().toISOString()
  };
  
  console.log('Creating FARMING_REWARD transaction with data:', testData);
  
  const { data, error } = await supabase
    .from('transactions')
    .insert(testData)
    .select();
    
  if (error) {
    console.error('❌ Failed to create transaction:', error.message);
    console.error('Error details:', error);
  } else {
    console.log('✅ Transaction created successfully!');
    console.log('Transaction ID:', data[0].id);
    console.log('Created at:', data[0].created_at);
  }
  
  // Now check if we can retrieve it
  const { data: checkData } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', data?.[0]?.id)
    .single();
    
  if (checkData) {
    console.log('\n✅ Transaction verified in database');
    console.log('Amount:', checkData.amount_uni, 'UNI');
  }
}

testDirectTransactionCreation().catch(console.error);