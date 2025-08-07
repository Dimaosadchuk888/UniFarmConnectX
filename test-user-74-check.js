import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser74() {
  console.log('Checking user ID 74 in database...\n');
  
  // Check by ID
  const { data: userById, error: errorById } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton')
    .eq('id', 74)
    .single();
    
  if (errorById) {
    console.error('Error finding user by ID:', errorById);
  } else {
    console.log('✅ User found by ID 74:', userById);
  }
  
  // Check by telegram_id
  const { data: userByTg, error: errorByTg } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton')
    .eq('telegram_id', 999489)
    .single();
    
  if (errorByTg) {
    console.error('Error finding user by telegram_id:', errorByTg);
  } else {
    console.log('✅ User found by telegram_id 999489:', userByTg);
  }
  
  // List all users with ID >= 70
  const { data: nearbyUsers, error: errorNearby } = await supabase
    .from('users')
    .select('id, telegram_id, username')
    .gte('id', 70)
    .lte('id', 80)
    .order('id');
    
  if (errorNearby) {
    console.error('Error listing nearby users:', errorNearby);
  } else {
    console.log('\n📋 Users with ID 70-80:');
    nearbyUsers.forEach(u => {
      console.log(`  ID ${u.id}: ${u.username} (telegram_id: ${u.telegram_id})`);
    });
  }
}

checkUser74().catch(console.error);