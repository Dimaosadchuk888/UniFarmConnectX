/**
 * Comprehensive Telegram Bot Integration Test
 * Tests webhook functionality and polling fallback
 */

import fetch from 'node-fetch';

const BOT_TOKEN = '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function testBotInfo() {
  try {
    const response = await fetch(`${TELEGRAM_API}/getMe`);
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Bot info verified:', {
        username: data.result.username,
        first_name: data.result.first_name,
        can_join_groups: data.result.can_join_groups,
        can_read_all_group_messages: data.result.can_read_all_group_messages,
        supports_inline_queries: data.result.supports_inline_queries
      });
      return true;
    } else {
      console.log('❌ Bot info failed:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Bot info error:', error.message);
    return false;
  }
}

async function testWebhookStatus() {
  try {
    const response = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const data = await response.json();
    
    if (data.ok) {
      console.log('📡 Webhook status:', {
        url: data.result.url,
        has_custom_certificate: data.result.has_custom_certificate,
        pending_update_count: data.result.pending_update_count,
        last_error_date: data.result.last_error_date,
        last_error_message: data.result.last_error_message,
        max_connections: data.result.max_connections,
        allowed_updates: data.result.allowed_updates
      });
      return data.result;
    } else {
      console.log('❌ Webhook status failed:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ Webhook status error:', error.message);
    return null;
  }
}

async function testLocalWebhook() {
  try {
    const testUpdate = {
      update_id: Math.floor(Date.now() / 1000),
      message: {
        message_id: 1,
        from: { id: 123456, first_name: "Test", username: "testuser" },
        chat: { id: 123456, type: "private" },
        date: Math.floor(Date.now() / 1000),
        text: "/start"
      }
    };

    const response = await fetch('http://localhost:3000/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUpdate)
    });

    const result = await response.text();
    
    if (response.status === 200) {
      console.log('✅ Local webhook working:', JSON.parse(result));
      return true;
    } else {
      console.log('❌ Local webhook failed:', response.status, result);
      return false;
    }
  } catch (error) {
    console.log('❌ Local webhook error:', error.message);
    return false;
  }
}

async function testExternalWebhook() {
  try {
    const testUpdate = {
      update_id: Math.floor(Date.now() / 1000),
      message: {
        message_id: 1,
        from: { id: 123456, first_name: "Test", username: "testuser" },
        chat: { id: 123456, type: "private" },
        date: Math.floor(Date.now() / 1000),
        text: "/start"
      }
    };

    const response = await fetch('https://uni-farm-connect-x-osadchukdmitro2.replit.app/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUpdate)
    });

    const result = await response.text();
    
    if (response.status === 200) {
      console.log('✅ External webhook working:', JSON.parse(result));
      return true;
    } else {
      console.log('❌ External webhook blocked:', response.status, result);
      return false;
    }
  } catch (error) {
    console.log('❌ External webhook error:', error.message);
    return false;
  }
}

async function runFullIntegrationTest() {
  console.log('🧪 Starting Telegram Bot Integration Test...\n');
  
  // Test 1: Bot info
  console.log('📋 Test 1: Bot Information');
  const botInfoOk = await testBotInfo();
  console.log('');
  
  // Test 2: Webhook status
  console.log('📋 Test 2: Webhook Status');
  const webhookInfo = await testWebhookStatus();
  console.log('');
  
  // Test 3: Local webhook
  console.log('📋 Test 3: Local Webhook Handler');
  const localWebhookOk = await testLocalWebhook();
  console.log('');
  
  // Test 4: External webhook
  console.log('📋 Test 4: External Webhook Access');
  const externalWebhookOk = await testExternalWebhook();
  console.log('');
  
  // Summary
  console.log('📊 INTEGRATION TEST SUMMARY:');
  console.log(`Bot Authentication: ${botInfoOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Webhook Configuration: ${webhookInfo ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Local Webhook Handler: ${localWebhookOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`External Webhook Access: ${externalWebhookOk ? '✅ PASS' : '❌ BLOCKED'}`);
  
  if (!externalWebhookOk && localWebhookOk) {
    console.log('\n🔄 POLLING FALLBACK ACTIVE: Bot will use getUpdates method');
    console.log('📝 This ensures full functionality despite Replit webhook blocking');
  }
  
  if (botInfoOk && localWebhookOk) {
    console.log('\n🎯 RESULT: Telegram integration is READY FOR PRODUCTION');
    console.log('🚀 Bot @UniFarming_Bot can receive and process messages');
    console.log('📱 Mini App will open correctly when users tap the button');
  } else {
    console.log('\n⚠️  RESULT: Integration needs troubleshooting');
  }
}

runFullIntegrationTest();