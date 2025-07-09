import { supabase } from './core/supabase.js';

async function restoreBalance() {
  console.log('Restoring user 62 balance to original value...');
  
  const { data, error } = await supabase
    .from('users')
    .update({ balance_uni: 448.250107 })
    .eq('id', 62)
    .select();
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Balance restored:', data);
  }
}

restoreBalance();
