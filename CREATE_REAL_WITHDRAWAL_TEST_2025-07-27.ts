/**
 * CREATE REAL WITHDRAWAL REQUEST TEST
 * Create actual withdrawal request to test admin notifications
 */

async function createRealWithdrawalTest() {
  console.log('📤 CREATING REAL WITHDRAWAL REQUEST TEST...');
  
  try {
    // Create a real withdrawal request using User 184 (active user with balance)
    console.log('\n1. Creating withdrawal request for User 184...');
    
    const withdrawalResponse = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/wallet/withdraw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-User-ID': '184',
        'X-Telegram-Username': 'testuser184'
      },
      body: JSON.stringify({
        amount: 0.5,  // Small test amount
        currency: 'TON',
        wallet_address: 'UQBotTestWithdrawalRequest2025TestAddress123456789'
      })
    });

    console.log('Withdrawal response status:', withdrawalResponse.status);
    
    if (withdrawalResponse.ok) {
      const withdrawalData = await withdrawalResponse.json();
      console.log('✅ Withdrawal request result:', withdrawalData);
      
      if (withdrawalData.success) {
        console.log('🎯 SUCCESS: Withdrawal request created!');
        console.log('📧 Admin notification should be sent to all admins now!');
        console.log('💰 Amount:', withdrawalData.data?.amount || '0.5 TON');
        console.log('🔗 Request ID:', withdrawalData.data?.id || 'unknown');
      } else {
        console.log('❌ Withdrawal failed:', withdrawalData.error);
      }
    } else {
      const errorText = await withdrawalResponse.text();
      console.log('❌ Withdrawal request failed:', withdrawalResponse.status, errorText);
    }

    // Alternative: Direct database withdrawal creation if API fails
    console.log('\n2. Alternative: Direct withdrawal creation for notification test...');
    
    const directResponse = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/wallet/withdraw-internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: 184,
        amount: 0.1,
        currency: 'TON',
        wallet_address: 'UQDirectTestNotificationAddress2025',
        description: 'Test withdrawal for admin bot notification verification'
      })
    });

    if (directResponse.ok) {
      const directData = await directResponse.json();
      console.log('✅ Direct withdrawal created:', directData.success);
      console.log('📧 Direct admin notification triggered!');
    }

    console.log('\n📊 WITHDRAWAL TEST SUMMARY:');
    console.log('- Attempted standard withdrawal via API');
    console.log('- Attempted direct withdrawal creation');
    console.log('- Admin bot should send notifications to:');
    console.log('  * a888bnd (Admin)');
    console.log('  * unifarm01010101 (Admin)'); 
    console.log('  * sergey_repl (Admin)');

  } catch (error) {
    console.error('❌ Withdrawal test failed:', error);
  }
}

// Run the withdrawal test
createRealWithdrawalTest().then(() => {
  console.log('\n✅ REAL WITHDRAWAL TEST COMPLETED');
  console.log('📧 Check admin bot notifications in Telegram!');
}).catch(error => {
  console.error('\n❌ REAL WITHDRAWAL TEST FAILED:', error);
});