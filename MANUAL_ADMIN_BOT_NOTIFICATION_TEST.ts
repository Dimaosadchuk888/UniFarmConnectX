/**
 * MANUAL ADMIN BOT NOTIFICATION TEST
 * Directly call AdminBotService to send notification
 */

import { AdminBotService } from './modules/adminBot/service';

async function manualAdminBotTest() {
  console.log('🚨 MANUAL ADMIN BOT NOTIFICATION TEST...');
  
  try {
    const adminBotService = new AdminBotService();
    
    // Create test withdrawal data
    const testWithdrawal = {
      id: 999999,
      user_id: 184,
      amount: '1.5',
      currency: 'TON',
      wallet_address: 'UQManualTestNotification2025BotVerification',
      status: 'pending',
      created_at: new Date().toISOString(),
      user: {
        username: 'test_user_notification',
        first_name: 'TestUser',
        last_name: 'BotVerification'
      }
    };

    console.log('📤 Sending manual notification to all admins...');
    
    await adminBotService.notifyWithdrawal(testWithdrawal);
    
    console.log('✅ Manual notification sent!');
    console.log('📧 Check Telegram admin bot for notification');
    console.log('💰 Test withdrawal: 1.5 TON to manual test address');

  } catch (error) {
    console.error('❌ Manual notification failed:', error);
  }
}

// Run manual test
manualAdminBotTest().then(() => {
  console.log('\n✅ MANUAL ADMIN BOT TEST COMPLETED');
}).catch(error => {
  console.error('\n❌ MANUAL ADMIN BOT TEST FAILED:', error);
});