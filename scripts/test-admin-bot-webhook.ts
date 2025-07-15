/**
 * Скрипт для проверки webhook endpoint админ-бота
 */

async function testWebhook() {
  const webhookUrl = 'https://uni-farm-connect-x-elizabethstone1.replit.app/api/v2/admin-bot/webhook';
  
  console.log('Testing Admin Bot Webhook...');
  console.log('URL:', webhookUrl);
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        update_id: 123456789,
        message: {
          message_id: 1,
          from: {
            id: 123456789,
            username: 'test_user',
            first_name: 'Test'
          },
          chat: {
            id: 123456789,
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: '/start'
        }
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);
    
    const text = await response.text();
    console.log('Response body:', text);
    
    if (response.status === 404) {
      console.log('\n❌ Webhook endpoint not found (404)');
      console.log('This means the route is not properly mounted or the server is not running.');
    } else if (response.status === 200) {
      console.log('\n✅ Webhook endpoint is working!');
    } else {
      console.log('\n⚠️  Unexpected status code:', response.status);
    }
  } catch (error) {
    console.error('Error testing webhook:', error);
  }
}

testWebhook()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });