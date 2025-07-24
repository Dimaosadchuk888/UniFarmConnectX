#!/usr/bin/env npx tsx

import { supabase } from '../core/supabase';
import { adminBotConfig } from '../config/adminBot';
import { logger } from '../core/logger';

async function fixAdminBot() {
  console.log('=== FIXING ADMIN BOT ===\n');
  
  // 1. Добавление админов в базу данных
  console.log('1. Adding admins to database...');
  
  const admins = [
    {
      username: 'a888bnd',
      telegram_id: 111111111, // Уникальный ID для первого админа
      first_name: 'Admin User 1',
      is_admin: true,
      is_active: true,
      ref_code: `ADMIN_${Date.now()}_1`,
      balance_uni: 0,
      balance_ton: 0
    },
    {
      username: 'DimaOsadchuk',
      telegram_id: 222222222, // Уникальный ID для второго админа
      first_name: 'Admin User 2',
      is_admin: true,
      is_active: true,
      ref_code: `ADMIN_${Date.now()}_2`,
      balance_uni: 0,
      balance_ton: 0
    }
  ];
  
  for (const admin of admins) {
    try {
      // Проверяем, существует ли уже админ
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, username, is_admin')
        .eq('username', admin.username)
        .single();
        
      if (existingUser) {
        // Обновляем права админа
        const { error: updateError } = await supabase
          .from('users')
          .update({ is_admin: true, is_active: true })
          .eq('username', admin.username);
          
        if (updateError) {
          console.log(`❌ Error updating admin ${admin.username}:`, updateError.message);
        } else {
          console.log(`✅ Updated admin rights for ${admin.username}`);
        }
      } else {
        // Создаем нового админа
        const { error: insertError } = await supabase
          .from('users')
          .insert([admin]);
          
        if (insertError) {
          console.log(`❌ Error creating admin ${admin.username}:`, insertError.message);
        } else {
          console.log(`✅ Created admin user ${admin.username}`);
        }
      }
    } catch (error) {
      console.log(`❌ Error processing admin ${admin.username}:`, error);
    }
  }
  
  // 2. Проверка webhook endpoint
  console.log('\n2. Testing webhook endpoint...');
  
  try {
    const webhookUrl = 'https://30617961-85b2-47c7-8b0b-ed0860f31963-00-13g90ou3z7lh2.sisko.replit.dev/api/v2/admin-bot/webhook';
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          message_id: 1,
          from: {
            id: 999999999,
            is_bot: false,
            first_name: 'Test Admin',
            username: 'a888bnd'
          },
          chat: {
            id: 999999999,
            first_name: 'Test Admin',
            username: 'a888bnd',
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: '/start'
        }
      })
    });
    
    if (response.ok) {
      console.log('✅ Webhook endpoint responds correctly (200 OK)');
    } else {
      console.log(`❌ Webhook endpoint error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.log('❌ Error testing webhook:', error);
  }
  
  // 3. Проверка админов в БД
  console.log('\n3. Verifying admins in database...');
  
  for (const adminUsername of adminBotConfig.authorizedAdmins) {
    const cleanUsername = adminUsername.replace('@', '');
    
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, telegram_id, username, is_admin, is_active')
        .eq('username', cleanUsername)
        .single();
        
      if (user) {
        console.log(`✅ ${adminUsername}: Found (ID: ${user.id}, Admin: ${user.is_admin}, Active: ${user.is_active})`);
      } else {
        console.log(`❌ ${adminUsername}: Not found in database`);
      }
    } catch (error) {
      console.log(`❌ ${adminUsername}: Error checking -`, error);
    }
  }
  
  // 4. Перезапуск webhook
  console.log('\n4. Re-setting webhook...');
  
  try {
    const { AdminBotService } = await import('../modules/adminBot/service');
    const adminBot = new AdminBotService();
    
    const appUrl = process.env.TELEGRAM_WEBAPP_URL || process.env.APP_DOMAIN || 'https://uni-farm-connect-unifarm01010101.replit.app';
    const webhookUrl = `${appUrl}/api/v2/admin-bot/webhook`;
    
    const webhookSet = await adminBot.setupWebhook(webhookUrl);
    if (webhookSet) {
      console.log('✅ Webhook re-configured successfully');
    } else {
      console.log('❌ Failed to re-configure webhook');
    }
  } catch (error) {
    console.log('❌ Error re-setting webhook:', error);
  }
  
  console.log('\n=== FIX COMPLETED ===');
}

fixAdminBot().catch(console.error);