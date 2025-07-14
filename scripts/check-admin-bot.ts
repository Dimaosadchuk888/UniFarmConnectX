/**
 * Скрипт для проверки функциональности админ-бота
 */

import { supabase } from '../core/supabase';
import { logger } from '../core/logger';
import { adminBotConfig } from '../config/adminBot';

async function checkAdminBotStatus() {
  console.log('=== ADMIN BOT STATUS CHECK ===\n');
  
  // 1. Проверка конфигурации
  console.log('1. Configuration Check:');
  console.log('- Bot Username:', adminBotConfig.username);
  console.log('- Token configured:', !!adminBotConfig.token);
  console.log('- Authorized Admins:', adminBotConfig.authorizedAdmins);
  console.log('- Webhook Path:', adminBotConfig.webhookPath);
  console.log('- API URL:', adminBotConfig.apiUrl);
  
  // 2. Проверка токена через Telegram API
  if (adminBotConfig.token) {
    console.log('\n2. Bot Token Validation:');
    try {
      const response = await fetch(`${adminBotConfig.apiUrl}/bot${adminBotConfig.token}/getMe`);
      const data = await response.json();
      
      if (data.ok) {
        console.log('✅ Bot token is valid');
        console.log('- Bot ID:', data.result.id);
        console.log('- Bot Username:', data.result.username);
        console.log('- Bot First Name:', data.result.first_name);
        console.log('- Can Join Groups:', data.result.can_join_groups);
        console.log('- Supports Inline Queries:', data.result.supports_inline_queries);
      } else {
        console.log('❌ Invalid bot token:', data.description);
      }
    } catch (error) {
      console.log('❌ Error checking bot token:', error);
    }
  } else {
    console.log('\n❌ Bot token not configured');
  }
  
  // 3. Проверка webhook статуса
  if (adminBotConfig.token) {
    console.log('\n3. Webhook Status:');
    try {
      const response = await fetch(`${adminBotConfig.apiUrl}/bot${adminBotConfig.token}/getWebhookInfo`);
      const data = await response.json();
      
      if (data.ok) {
        console.log('- Webhook URL:', data.result.url || 'Not set');
        console.log('- Pending Updates:', data.result.pending_update_count || 0);
        console.log('- Last Error:', data.result.last_error_message || 'None');
        console.log('- Max Connections:', data.result.max_connections || 40);
      }
    } catch (error) {
      console.log('❌ Error checking webhook:', error);
    }
  }
  
  // 4. Проверка админов в БД
  console.log('\n4. Database Admin Check:');
  try {
    const adminUsernames = adminBotConfig.authorizedAdmins;
    
    for (const username of adminUsernames) {
      const cleanUsername = username.replace('@', '');
      const { data: user, error } = await supabase
        .from('users')
        .select('id, telegram_id, username, is_admin')
        .eq('username', cleanUsername)
        .single();
      
      if (user) {
        console.log(`- ${username}: Found (ID: ${user.id}, Admin: ${user.is_admin})`);
      } else {
        console.log(`- ${username}: Not found in database`);
      }
    }
  } catch (error) {
    console.log('❌ Error checking admins:', error);
  }
  
  // 5. Проверка последних withdraw_requests
  console.log('\n5. Recent Withdrawal Requests:');
  try {
    const { data: requests, error } = await supabase
      .from('withdraw_requests')
      .select('id, user_id, amount, currency, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (requests && requests.length > 0) {
      console.log(`Found ${requests.length} recent requests:`);
      requests.forEach(req => {
        console.log(`- ID: ${req.id}, User: ${req.user_id}, Amount: ${req.amount} ${req.currency}, Status: ${req.status}`);
      });
    } else {
      console.log('No withdrawal requests found');
    }
  } catch (error) {
    console.log('❌ Error checking withdrawal requests:', error);
  }
  
  // 6. Проверка роутов админ-бота
  console.log('\n6. Admin Bot Routes:');
  console.log('- Webhook endpoint: /api/v2/admin-bot/webhook');
  console.log('- Routes mounted at: /api/v2/admin-bot');
  
  console.log('\n=== END OF CHECK ===');
}

// Запуск проверки
checkAdminBotStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });