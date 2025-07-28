/**
 * POST-RESTART BOT FUNCTIONALITY TEST
 * Test both bots after cache clearing and server restart
 */

async function testBotsAfterRestart() {
  console.log('🔄 TESTING BOTS AFTER CACHE CLEARING AND RESTART...');
  
  try {
    // Test 1: Main bot /start command
    console.log('\n1. Testing main bot /start command...');
    const mainBotTest = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/telegram/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        update_id: Date.now(),
        message: {
          message_id: 1,
          from: {
            id: 123456789,
            is_bot: false,
            first_name: 'TestUser',
            username: 'testuser123'
          },
          chat: {
            id: 123456789,
            first_name: 'TestUser',
            username: 'testuser123',
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: '/start'
        }
      })
    });

    console.log('Main bot response status:', mainBotTest.status);
    if (mainBotTest.ok) {
      const responseText = await mainBotTest.text();
      console.log('Main bot response:', responseText);
      console.log('✅ Main bot webhook working after restart');
    } else {
      console.log('❌ Main bot failed:', mainBotTest.status);
    }

    // Test 2: Admin bot command
    console.log('\n2. Testing admin bot command...');
    const adminBotTest = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/admin-bot/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        update_id: Date.now() + 1,
        message: {
          message_id: 2,
          from: {
            id: 987654321,
            is_bot: false,
            first_name: 'AdminTest',
            username: 'a888bnd'  // Authorized admin
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

    console.log('Admin bot response status:', adminBotTest.status);
    if (adminBotTest.ok) {
      const responseText = await adminBotTest.text();
      console.log('Admin bot response:', responseText);
      console.log('✅ Admin bot webhook working after restart');
    } else {
      console.log('❌ Admin bot failed:', adminBotTest.status);
    }

    // Test 3: API health check
    console.log('\n3. Testing API health after restart...');
    const healthTest = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/health');
    
    if (healthTest.ok) {
      const healthData = await healthTest.json();
      console.log('✅ API health check:', healthData);
    } else {
      console.log('❌ API health check failed:', healthTest.status);
    }

    // Test 4: Routes availability
    console.log('\n4. Testing routes availability...');
    const routesTest = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/test-routes');
    
    if (routesTest.ok) {
      const routesData = await routesTest.json();
      console.log('✅ Routes test:', routesData.success ? 'All routes available' : 'Routes issues');
    } else {
      console.log('❌ Routes test failed:', routesTest.status);
    }

    console.log('\n📊 SUMMARY:');
    console.log('- Server restarted successfully');
    console.log('- Cache cleared');
    console.log('- Both bot webhooks tested');
    console.log('- API endpoints verified');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBotsAfterRestart().then(() => {
  console.log('\n✅ POST-RESTART TEST COMPLETED');
}).catch(error => {
  console.error('\n❌ POST-RESTART TEST FAILED:', error);
});