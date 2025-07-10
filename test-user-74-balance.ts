import { supabase } from './core/supabaseClient';

async function testUser74Balance() {
  console.log('Checking user 74 balance and testing deposit...\n');
  
  // Check initial balance
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();
  
  if (error || !user) {
    console.error('Error fetching user 74:', error);
    return;
  }
  
  console.log('User 74 current state:');
  console.log('- UNI Balance:', user.balance_uni);
  console.log('- TON Balance:', user.balance_ton);
  console.log('- Farming Active:', user.uni_farming_active);
  console.log('- Current Deposit:', user.uni_deposit_amount);
  
  // If balance is 0, add some test balance
  if (parseFloat(user.balance_uni) === 0) {
    console.log('\nAdding 1000 UNI to user 74 for testing...');
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance_uni: 1000 })
      .eq('id', 74);
    
    if (updateError) {
      console.error('Error updating balance:', updateError);
      return;
    }
    
    console.log('✅ Added 1000 UNI to user 74');
  }
  
  process.exit(0);
}

testUser74Balance();