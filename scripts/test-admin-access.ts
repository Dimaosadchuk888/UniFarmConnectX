#!/usr/bin/env npx tsx

import { AdminBotService } from '../modules/adminBot/service';
import { supabase } from '../core/supabase';

async function testAdminAccess() {
  console.log('=== TESTING ADMIN ACCESS ===\n');
  
  console.log('1. Checking admins in database...');
  
  const adminUsernames = ['a888bnd', 'DimaOsadchuk'];
  
  for (const username of adminUsernames) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, telegram_id, username, is_admin, is_active')
        .eq('username', username)
        .single();
        
      if (user) {
        console.log(`✅ ${username}: Found (ID: ${user.id}, Admin: ${user.is_admin}, Active: ${user.is_active})`);
      } else {
        console.log(`❌ ${username}: Not found in database`);
        console.log('Error:', error?.message);
      }
    } catch (error) {
      console.log(`❌ ${username}: Error -`, error);
    }
  }
  
  console.log('\n2. Testing admin bot authorization logic...');
  
  const adminBotService = new AdminBotService();
  
  for (const username of adminUsernames) {
    try {
      const isAuthorized = await adminBotService.isAuthorizedAdmin(username);
      console.log(`${isAuthorized ? '✅' : '❌'} ${username}: Authorization = ${isAuthorized}`);
    } catch (error) {
      console.log(`❌ ${username}: Authorization error -`, error);
    }
  }
  
  console.log('\n3. Testing with @ prefix...');
  
  for (const username of adminUsernames) {
    try {
      const isAuthorized = await adminBotService.isAuthorizedAdmin(`@${username}`);
      console.log(`${isAuthorized ? '✅' : '❌'} @${username}: Authorization = ${isAuthorized}`);
    } catch (error) {
      console.log(`❌ @${username}: Authorization error -`, error);
    }
  }
  
  console.log('\n=== TEST COMPLETED ===');
}

testAdminAccess().catch(console.error);