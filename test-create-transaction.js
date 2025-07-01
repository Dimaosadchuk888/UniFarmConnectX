// Простой тест создания транзакции напрямую через Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreateTransaction() {
  console.log('Тест создания транзакции...');
  
  const transactionPayload = {
    user_id: 48,
    type: 'FARMING_REWARD',
    amount_uni: '40',
    amount_ton: '0',
    status: 'confirmed',
    description: 'Test direct transaction'
  };

  console.log('Payload:', transactionPayload);

  const { data, error } = await supabase
    .from('transactions')
    .insert([transactionPayload])
    .select()
    .single();

  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS:', data);
  }
}

testCreateTransaction().catch(console.error);