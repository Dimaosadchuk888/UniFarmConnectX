import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzc2MzEsImV4cCI6MjA2Njk1MzYzMX0.2UwGVg_pXKo89FQSLPYzlcBCH-g9V29bWMw3CrlWyPo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDepositFlow() {
  console.log('Testing farming deposit flow for user 74...\n');

  // Get user 74 data
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();

  if (userError) {
    console.error('Error fetching user:', userError);
    return;
  }

  console.log('User 74 data:');
  console.log('- ID:', user.id);
  console.log('- balance_uni:', user.balance_uni, '(type:', typeof user.balance_uni, ')');
  console.log('- balance_ton:', user.balance_ton, '(type:', typeof user.balance_ton, ')');
  console.log('- uni_farming_active:', user.uni_farming_active);
  console.log('- uni_deposit_amount:', user.uni_deposit_amount, '(type:', typeof user.uni_deposit_amount, ')');
  
  // Test amount parsing
  const testAmount = '50';
  console.log('\nTesting amount parsing:');
  console.log('- Test amount string:', testAmount);
  console.log('- parseFloat(testAmount):', parseFloat(testAmount));
  console.log('- Number(testAmount):', Number(testAmount));
  
  // Test balance check
  const depositAmount = parseFloat(testAmount);
  const currentBalance = parseFloat(user.balance_uni);
  console.log('\nBalance check:');
  console.log('- Current balance (parsed):', currentBalance);
  console.log('- Deposit amount (parsed):', depositAmount);
  console.log('- Has sufficient balance:', currentBalance >= depositAmount);
  console.log('- Difference:', currentBalance - depositAmount);

  // Check if balance_uni is stored as string in DB
  const { data: rawData, error: rawError } = await supabase
    .rpc('get_user_balance_raw', { user_id: 74 })
    .single();

  if (!rawError && rawData) {
    console.log('\nRaw DB check via RPC (if available):', rawData);
  }

  // Try direct SQL query
  const { data: sqlData, error: sqlError } = await supabase
    .from('users')
    .select('balance_uni::text as balance_uni_text, balance_uni')
    .eq('id', 74)
    .single();

  if (!sqlError && sqlData) {
    console.log('\nDirect SQL cast check:');
    console.log('- balance_uni as text:', sqlData.balance_uni_text);
    console.log('- balance_uni raw:', sqlData.balance_uni);
  }
}

testDepositFlow().catch(console.error);