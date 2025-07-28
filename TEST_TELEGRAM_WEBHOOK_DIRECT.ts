/**
 * DIRECT TELEGRAM WEBHOOK TEST
 * Test webhook endpoints without external dependencies
 */

async function testTelegramWebhook() {
  console.log('🔧 DIRECT TELEGRAM WEBHOOK TEST STARTING...');
  
  try {
    // Test main bot webhook
    console.log('\n1. Testing main bot webhook...');
    const mainBotResponse = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/telegram/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        update_id: 123456,
        message: {
          message_id: 1,
          from: {
            id: 123456789,
            is_bot: false,
            first_name: 'Test',
            username: 'testuser'
          },
          chat: {
            id: 123456789,
            first_name: 'Test',
            username: 'testuser',
            type: 'private'
          },
          date: 1753706000,
          text: '/start'
        }
      })
    });

    console.log('Main bot response status:', mainBotResponse.status);
    console.log('Main bot response headers:', Object.fromEntries(mainBotResponse.headers.entries()));
    
    if (mainBotResponse.ok) {
      const mainBotText = await mainBotResponse.text();
      console.log('Main bot response body:', mainBotText);
    } else {
      console.log('Main bot ERROR - Status:', mainBotResponse.status);
      const errorText = await mainBotResponse.text();
      console.log('Main bot error body:', errorText);
    }

    // Test admin bot webhook  
    console.log('\n2. Testing admin bot webhook...');
    const adminBotResponse = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/admin-bot/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        update_id: 123457,
        message: {
          message_id: 2,
          from: {
            id: 987654321,
            is_bot: false,
            first_name: 'Admin',
            username: 'testadmin'
          },
          chat: {
            id: 987654321,
            first_name: 'Admin',
            username: 'testadmin',
            type: 'private'
          },
          date: 1753706000,
          text: '/stats'
        }
      })
    });

    console.log('Admin bot response status:', adminBotResponse.status);
    console.log('Admin bot response headers:', Object.fromEntries(adminBotResponse.headers.entries()));
    
    if (adminBotResponse.ok) {
      const adminBotText = await adminBotResponse.text();
      console.log('Admin bot response body:', adminBotText);
    } else {
      console.log('Admin bot ERROR - Status:', adminBotResponse.status);
      const errorText = await adminBotResponse.text();
      console.log('Admin bot error body:', errorText);
    }

    // Test route availability
    console.log('\n3. Testing route availability...');
    const routeTest = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/test-routes');
    
    if (routeTest.ok) {
      const routeData = await routeTest.json();
      console.log('Routes test successful:', routeData);
    } else {
      console.log('Routes test failed:', routeTest.status);
    }

  } catch (error) {
    console.error('ERROR during webhook test:', error);
  }
}

// Run the test
testTelegramWebhook().then(() => {
  console.log('\n✅ WEBHOOK TEST COMPLETED');
}).catch(error => {
  console.error('\n❌ WEBHOOK TEST FAILED:', error);
});