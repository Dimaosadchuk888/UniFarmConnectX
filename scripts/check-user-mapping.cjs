#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkUserMapping() {
  console.log('=== ПРОВЕРКА МАППИНГА ПОЛЬЗОВАТЕЛЕЙ ===\n');

  // Проверяем user 74
  const { data: user74 } = await supabase
    .from('users')
    .select('id, telegram_id, username')
    .eq('id', 74)
    .single();
    
  console.log('User ID 74:');
  console.log(`  telegram_id: ${user74.telegram_id}`);
  console.log(`  username: ${user74.username}\n`);

  // Проверяем user 77
  const { data: user77 } = await supabase
    .from('users')
    .select('id, telegram_id, username')
    .eq('id', 77)
    .single();
    
  console.log('User ID 77:');
  console.log(`  telegram_id: ${user77.telegram_id}`);
  console.log(`  username: ${user77.username}\n`);
  
  // Проверяем транзакции обоих
  const { data: tx74 } = await supabase
    .from('transactions')
    .select('count')
    .eq('user_id', 74);
    
  const { data: tx77 } = await supabase
    .from('transactions')
    .select('count')
    .eq('user_id', 77);
    
  console.log(`Транзакций user 74: ${tx74?.[0]?.count || 0}`);
  console.log(`Транзакций user 77: ${tx77?.[0]?.count || 0}`);
}

checkUserMapping().catch(console.error);
