#!/usr/bin/env npx tsx

import { supabase } from '../core/supabase';

async function checkAdminDuplicates() {
  console.log('=== CHECKING ADMIN DUPLICATES ===\n');
  
  const adminUsernames = ['a888bnd', 'DimaOsadchuk'];
  
  for (const username of adminUsernames) {
    console.log(`\nChecking: ${username}`);
    
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, telegram_id, username, is_admin, is_active, created_at')
        .eq('username', username);
        
      if (error) {
        console.log('❌ Error:', error.message);
        continue;
      }
      
      if (!users || users.length === 0) {
        console.log(`❌ No users found with username: ${username}`);
        continue;
      }
      
      console.log(`Found ${users.length} user(s):`);
      
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user.id}, Telegram: ${user.telegram_id}, Admin: ${user.is_admin}, Active: ${user.is_active}, Created: ${user.created_at}`);
      });
      
      if (users.length > 1) {
        console.log(`⚠️  DUPLICATE FOUND! Multiple users with username: ${username}`);
        
        // Найдем самую новую запись и сделаем её админом
        const latestUser = users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        console.log(`Latest user: ID ${latestUser.id}`);
        
        // Обновим самую новую запись
        const { error: updateError } = await supabase
          .from('users')
          .update({ is_admin: true, is_active: true })
          .eq('id', latestUser.id);
          
        if (updateError) {
          console.log('❌ Error updating latest user:', updateError.message);
        } else {
          console.log(`✅ Updated user ID ${latestUser.id} to admin`);
        }
        
        // Удалим дубликаты (оставим только самую новую запись)
        const duplicateIds = users.filter(u => u.id !== latestUser.id).map(u => u.id);
        
        if (duplicateIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .in('id', duplicateIds);
            
          if (deleteError) {
            console.log('❌ Error deleting duplicates:', deleteError.message);
          } else {
            console.log(`✅ Deleted ${duplicateIds.length} duplicate(s)`);
          }
        }
      } else {
        // Только одна запись, убедимся что у неё есть права админа
        const user = users[0];
        if (!user.is_admin) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ is_admin: true, is_active: true })
            .eq('id', user.id);
            
          if (updateError) {
            console.log('❌ Error updating admin rights:', updateError.message);
          } else {
            console.log(`✅ Updated user ID ${user.id} to admin`);
          }
        } else {
          console.log(`✅ User already has admin rights`);
        }
      }
    } catch (error) {
      console.log(`❌ ${username}: Error -`, error);
    }
  }
  
  console.log('\n=== CHECK COMPLETED ===');
}

checkAdminDuplicates().catch(console.error);