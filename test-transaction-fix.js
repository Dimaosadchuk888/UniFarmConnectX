const { supabase } = require('./core/supabase');

async function testTransactionFix() {
  try {
    console.log('Testing transaction creation and retrieval...');
    
    // Create a test transaction for user 48
    const { data: transaction, error: createError } = await supabase
      .from('transactions')
      .insert({
        user_id: 48,
        type: 'FARMING_REWARD',
        amount_uni: '50.00',
        amount_ton: '0',
        description: 'Test farming reward',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (createError) {
      console.error('Error creating transaction:', createError);
      return;
    }
    
    console.log('Transaction created:', transaction);
    
    // Now test retrieval by user_id
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 48)
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (fetchError) {
      console.error('Error fetching transactions:', fetchError);
      return;
    }
    
    console.log(`Found ${transactions.length} transactions for user 48:`);
    transactions.forEach(tx => {
      console.log(`- ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount_uni || tx.amount_ton} ${tx.amount_uni ? 'UNI' : 'TON'}`);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTransactionFix();