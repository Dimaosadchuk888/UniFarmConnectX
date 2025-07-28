/**
 * DIRECT TELEGRAM ADMIN BOT NOTIFICATION TEST
 * Send notification directly through Telegram API
 */

async function testDirectTelegramNotification() {
  console.log('📱 TESTING DIRECT TELEGRAM ADMIN NOTIFICATION...');
  
  try {
    // Get admin bot token from environment
    const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN || 'SET';
    
    if (ADMIN_BOT_TOKEN === 'SET') {
      console.log('❌ ADMIN_BOT_TOKEN not configured');
      return;
    }

    // Test message to send
    const testMessage = {
      text: `🚨 <b>Тест уведомления админского бота</b>

📝 <b>Заявка на вывод #12345</b>
👤 Пользователь: @test_user
💰 Сумма: 1.5 TON
📧 Кошелек: UQTest...Address
📅 Дата: ${new Date().toLocaleString('ru-RU')}

<i>Это тестовое сообщение для проверки работы админского бота после перезапуска системы.</i>`,
      parse_mode: 'HTML'
    };

    // Try to send to known admin chat IDs
    const adminChatIds = [
      '987654321',  // Test admin ID
      '123456789'   // Another test admin ID
    ];

    console.log('\n📤 Sending test notifications...');

    for (const chatId of adminChatIds) {
      try {
        const telegramResponse = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: testMessage.text,
            parse_mode: testMessage.parse_mode
          })
        });

        const responseData = await telegramResponse.json();
        
        if (responseData.ok) {
          console.log(`✅ Notification sent to chat ${chatId}`);
        } else {
          console.log(`❌ Failed to send to chat ${chatId}:`, responseData.description);
        }
        
      } catch (error) {
        console.log(`❌ Error sending to chat ${chatId}:`, error.message);
      }
    }

    // Test webhook endpoint directly
    console.log('\n🔧 Testing admin bot webhook endpoint...');
    
    const webhookTest = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/admin-bot/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        update_id: Date.now(),
        message: {
          message_id: 5001,
          from: {
            id: 999888777,
            is_bot: false,
            first_name: 'TestAdmin',
            username: 'test_admin_bot'
          },
          chat: {
            id: 999888777,
            first_name: 'TestAdmin',
            username: 'test_admin_bot',
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: '/status'
        }
      })
    });

    console.log('Admin webhook test status:', webhookTest.status);
    if (webhookTest.ok) {
      const webhookResponse = await webhookTest.text();
      console.log('✅ Admin webhook response:', webhookResponse);
    }

    console.log('\n📊 DIRECT TELEGRAM TEST SUMMARY:');
    console.log('- Attempted direct Telegram API calls');
    console.log('- Tested admin bot webhook endpoint');
    console.log('- Admin bot token configured:', ADMIN_BOT_TOKEN !== 'SET');

  } catch (error) {
    console.error('❌ Direct Telegram test failed:', error);
  }
}

// Run direct telegram test
testDirectTelegramNotification().then(() => {
  console.log('\n✅ DIRECT TELEGRAM ADMIN TEST COMPLETED');
}).catch(error => {
  console.error('\n❌ DIRECT TELEGRAM ADMIN TEST FAILED:', error);
});