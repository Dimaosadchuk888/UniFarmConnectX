
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkUserBalances() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, uni_balance, ton_balance')
    .eq('id', 74)
    .single();
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('User 74 data:', data);
    console.log('Table columns:', Object.keys(data));
  }
}

checkUserBalances();

