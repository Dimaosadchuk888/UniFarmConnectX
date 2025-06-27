import { createClient } from '@supabase/supabase-js';

// Supabase connection test
const supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkwMzA3NywiZXhwIjoyMDY1NDc5MDc3fQ.pjlz8qlmQLUa9BZb12pt9QZU5Fk9YvqxpSZGA84oqog';

async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test 1: Check recent users
    console.log('\n📊 Checking recent users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, telegram_id, username, first_name, ref_code, balance_uni, balance_ton, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (usersError) {
      console.error('❌ Users query error:', usersError);
    } else {
      console.log(`✅ Found ${users.length} recent users:`);
      users.forEach(user => {
        console.log(`  - User ${user.id}: telegram_id=${user.telegram_id}, ref_code=${user.ref_code}, balance_uni=${user.balance_uni}, balance_ton=${user.balance_ton}`);
      });
    }
    
    // Test 2: Check total counts
    console.log('\n📈 Getting database statistics...');
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ Total users: ${totalUsers}`);
    console.log(`✅ Total transactions: ${totalTransactions}`);
    
    // Test 3: Check ref_code generation pattern
    console.log('\n🔗 Checking ref_code patterns...');
    const { data: refCodes, error: refError } = await supabase
      .from('users')
      .select('ref_code')
      .not('ref_code', 'is', null)
      .limit(3);
    
    if (refError) {
      console.error('❌ Ref codes query error:', refError);
    } else {
      console.log('✅ Ref code examples:');
      refCodes.forEach(user => {
        console.log(`  - ${user.ref_code}`);
      });
    }
    
    console.log('\n✅ Supabase connection test completed successfully');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

testSupabaseConnection();