/**
 * Test Supabase API connection with proper environment variables
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('Testing Supabase API connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseAPI() {
  try {
    // Test basic connection with a simple query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Table access error:', error.message);
      
      // Check if it's a "table doesn't exist" error
      if (error.message.includes('does not exist')) {
        console.log('🔧 Need to create database schema in Supabase');
        console.log('📝 Run the SQL script: create-supabase-schema.sql');
        return false;
      }
      
      return false;
    }
    
    console.log('✅ Supabase API connection successful');
    console.log('✅ Users table accessible');
    return true;
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

testSupabaseAPI()
  .then(success => {
    if (success) {
      console.log('🎉 Supabase API fully operational');
    } else {
      console.log('💡 Next step: Create database schema in Supabase');
    }
    process.exit(success ? 0 : 1);
  });