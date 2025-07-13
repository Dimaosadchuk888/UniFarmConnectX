import { supabase } from '../core/supabase';

async function checkLastMetadata() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, metadata, created_at')
    .eq('id', 631400)
    .single();
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('\nTransaction ID 631400 metadata check:');
  console.log('Created at:', new Date(data.created_at).toLocaleTimeString('ru-RU'));
  console.log('\nMetadata:');
  console.log(JSON.stringify(data.metadata, null, 2));
  
  console.log('\nExpected fields:');
  console.log('- original_type should be: TON_BOOST_INCOME');
  console.log('- actual original_type is:', data.metadata?.original_type || 'NOT SET');
  
  if (data.metadata?.original_type === 'TON_BOOST_INCOME') {
    console.log('\n✅ SUCCESS! Metadata is correct!');
  } else {
    console.log('\n❌ FAIL! Metadata is still wrong.');
  }
}

checkLastMetadata().catch(console.error);