import { supabase } from '../core/supabase';

async function checkNewTablesContent() {
  console.log('\n=== CHECKING NEW TABLES CONTENT ===\n');
  
  try {
    // Check uni_farming_data
    console.log('1. uni_farming_data table:');
    const { data: uniData, error: uniError } = await supabase
      .from('uni_farming_data')
      .select('*')
      .order('user_id')
      .limit(5);
      
    if (uniError) {
      console.error('Error reading uni_farming_data:', uniError);
    } else {
      console.log(`Found ${uniData?.length || 0} records`);
      console.table(uniData);
    }
    
    // Check ton_farming_data
    console.log('\n2. ton_farming_data table:');
    const { data: tonData, error: tonError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .order('user_id')
      .limit(5);
      
    if (tonError) {
      console.error('Error reading ton_farming_data:', tonError);
    } else {
      console.log(`Found ${tonData?.length || 0} records`);
      console.table(tonData);
    }
    
    // Check if user 62 is in new tables
    console.log('\n3. Checking user 62 in new tables:');
    
    const { data: uni62 } = await supabase
      .from('uni_farming_data')
      .select('*')
      .eq('user_id', '62')
      .single();
      
    const { data: ton62 } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', '62')
      .single();
      
    console.log('User 62 in uni_farming_data:', uni62 ? 'YES' : 'NO');
    console.log('User 62 in ton_farming_data:', ton62 ? 'YES' : 'NO');
    
    // Check repository behavior
    console.log('\n4. Testing repository behavior:');
    const { uniFarmingRepository } = await import('../modules/farming/UniFarmingRepository');
    
    // Direct query to new table
    try {
      const directQuery = await supabase
        .from('uni_farming_data')
        .select('*')
        .eq('user_id', '62')
        .single();
        
      console.log('Direct query to uni_farming_data for user 62:', directQuery.data ? 'SUCCESS' : 'FAILED');
    } catch (e) {
      console.log('Direct query error:', e.message);
    }
    
    console.log('\n=== CHECK COMPLETED ===\n');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkNewTablesContent().catch(console.error);