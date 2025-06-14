/**
 * Test Supabase API connection and basic operations
 */
import { supabase } from './core/supabaseClient.js';

async function testSupabaseConnection() {
  console.log('🔥 Testing Supabase API connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    
    // Test user table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Users table access failed:', tableError.message);
      return false;
    }
    
    console.log('✅ Users table accessible');
    console.log('Table structure sample:', tableInfo?.[0] || 'No data');
    
    return true;
  } catch (error) {
    console.error('❌ Supabase test failed:', error.message);
    return false;
  }
}

// Run test
testSupabaseConnection()
  .then(success => {
    if (success) {
      console.log('🎉 All Supabase tests passed - system ready');
    } else {
      console.log('💥 Supabase tests failed - check connection');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test error:', error);
    process.exit(1);
  });