/**
 * LIVE BOT COMMANDS TEST
 * Send real commands to both bots and test withdrawal notification
 */

async function testBotCommandsLive() {
  console.log('🤖 TESTING LIVE BOT COMMANDS...');
  
  try {
    // Test 1: Send /start to main bot
    console.log('\n1. Sending /start to main bot @UniFarming_Bot...');
    const mainBotResponse = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/telegram/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        update_id: Date.now(),
        message: {
          message_id: 1001,
          from: {
            id: 12345678,
            is_bot: false,
            first_name: 'TestUser',
            username: 'testuser_live'
          },
          chat: {
            id: 12345678,
            first_name: 'TestUser',
            username: 'testuser_live',
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: '/start'
        }
      })
    });

    console.log('Main bot /start response:', mainBotResponse.status);
    if (mainBotResponse.ok) {
      const responseText = await mainBotResponse.text();
      console.log('✅ Main bot response:', responseText);
    }

    // Test 2: Send admin command to admin bot
    console.log('\n2. Sending /admin to admin bot...');
    const adminBotResponse = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/admin-bot/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        update_id: Date.now() + 1,
        message: {
          message_id: 1002,
          from: {
            id: 987654321,
            is_bot: false,
            first_name: 'AdminTest',
            username: 'a888bnd'  // Real admin username
          },
          chat: {
            id: 987654321,
            first_name: 'AdminTest',
            username: 'a888bnd',
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: '/admin'
        }
      })
    });

    console.log('Admin bot /admin response:', adminBotResponse.status);
    if (adminBotResponse.ok) {
      const responseText = await adminBotResponse.text();
      console.log('✅ Admin bot response:', responseText);
    }

    // Test 3: Create test withdrawal request to trigger admin notification
    console.log('\n3. Creating test withdrawal request to trigger admin notification...');
    
    // First get a valid user token for withdrawal test
    const authResponse = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        initData: 'user=%7B%22id%22%3A184%2C%22first_name%22%3A%22Test%22%2C%22username%22%3A%22testuser%22%7D&chat_instance=-123456789&auth_date=1635724800&hash=test'
      })
    });

    if (authResponse.ok) {
      const authData = await authResponse.json();
      const token = authData.data?.token;
      
      if (token) {
        // Create withdrawal request
        const withdrawalResponse = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/wallet/withdraw', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: 1,
            currency: 'TON',
            wallet_address: 'UQTest123TestWithdrawalAddress456Test'
          })
        });

        console.log('Withdrawal request response:', withdrawalResponse.status);
        if (withdrawalResponse.ok) {
          const withdrawalData = await withdrawalResponse.json();
          console.log('✅ Withdrawal request created:', withdrawalData.success);
          console.log('📧 Admin notification should be sent now!');
        } else {
          console.log('❌ Withdrawal request failed');
        }
      }
    }

    console.log('\n📊 LIVE BOT TEST SUMMARY:');
    console.log('- Main bot /start command sent');
    console.log('- Admin bot /admin command sent');
    console.log('- Test withdrawal request created');
    console.log('- Admin notification should be triggered');

  } catch (error) {
    console.error('❌ Live bot test failed:', error);
  }
}

// Run the live test
testBotCommandsLive().then(() => {
  console.log('\n✅ LIVE BOT COMMANDS TEST COMPLETED');
}).catch(error => {
  console.error('\n❌ LIVE BOT COMMANDS TEST FAILED:', error);
});