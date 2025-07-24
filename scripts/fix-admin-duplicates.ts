#!/usr/bin/env npx tsx

import { supabase } from '../core/supabase';

async function fixAdminDuplicates() {
  console.log('=== FIXING ADMIN DUPLICATES ===\n');
  
  console.log('1. Updating existing admin records...');
  
  // Обновим существующие правильные записи
  const adminUpdates = [
    { id: 25, username: 'DimaOsadchuk' },    // Существующая запись DimaOsadchuk
    { id: 262, username: 'a888bnd' }         // Существующая запись a888bnd
  ];
  
  for (const admin of adminUpdates) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_admin: true, is_active: true })
        .eq('id', admin.id);
        
      if (error) {
        console.log(`❌ Error updating ${admin.username} (ID ${admin.id}):`, error.message);
      } else {
        console.log(`✅ Updated ${admin.username} (ID ${admin.id}) to admin`);
      }
    } catch (error) {
      console.log(`❌ Error updating ${admin.username}:`, error);
    }
  }
  
  console.log('\n2. Removing duplicate records...');
  
  // Удалим дубликаты которые я создал (ID 281, 282)
  const duplicateIds = [281, 282];
  
  for (const id of duplicateIds) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.log(`❌ Error deleting duplicate ID ${id}:`, error.message);
      } else {
        console.log(`✅ Deleted duplicate record ID ${id}`);
      }
    } catch (error) {
      console.log(`❌ Error deleting ID ${id}:`, error);
    }
  }
  
  console.log('\n3. Verifying final state...');
  
  const usernames = ['a888bnd', 'DimaOsadchuk'];
  
  for (const username of usernames) {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('id, telegram_id, username, is_admin, is_active')
        .eq('username', username);
        
      console.log(`\n${username}:`);
      users?.forEach(user => {
        console.log(`  ID: ${user.id}, Telegram: ${user.telegram_id}, Admin: ${user.is_admin}, Active: ${user.is_active}`);
      });
    } catch (error) {
      console.log(`❌ Error checking ${username}:`, error);
    }
  }
  
  console.log('\n=== FIX COMPLETED ===');
}

fixAdminDuplicates().catch(console.error);