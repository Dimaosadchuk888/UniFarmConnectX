/**
 * Тест системы Telegram для диагностики проблемы с /start
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function testTelegramSystem() {
  console.log('🔍 Диагностика системы Telegram...\n');

  // 1. Проверка токена бота
  console.log('1. Проверка токена бота:');
  if (!BOT_TOKEN) {
    console.log('❌ TELEGRAM_BOT_TOKEN не найден');
    return;
  }
  console.log('✅ Токен бота найден');

  // 2. Проверка статуса бота
  console.log('\n2. Проверка статуса бота:');
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const result = await response.json();
    
    if (result.ok) {
      console.log(`✅ Бот активен: @${result.result.username}`);
    } else {
      console.log('❌ Бот неактивен:', result.description);
    }
  } catch (error) {
    console.log('❌ Ошибка связи с Telegram API:', error.message);
  }

  // 3. Проверка webhook
  console.log('\n3. Проверка webhook:');
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const result = await response.json();
    
    if (result.ok) {
      const info = result.result;
      console.log(`📡 Webhook URL: ${info.url || 'НЕ УСТАНОВЛЕН'}`);
      console.log(`📊 Pending updates: ${info.pending_update_count}`);
      console.log(`🔗 Max connections: ${info.max_connections}`);
      
      if (info.last_error_message) {
        console.log(`❌ Последняя ошибка: ${info.last_error_message}`);
        console.log(`📅 Время ошибки: ${new Date(info.last_error_date * 1000)}`);
      }
    }
  } catch (error) {
    console.log('❌ Ошибка получения webhook info:', error.message);
  }

  // 4. Проверка доступности нашего webhook endpoint
  console.log('\n4. Проверка endpoint webhook:');
  try {
    const response = await fetch('https://uni-farm-connect-xo-osadchukdmitro2.replit.app/api/telegram/status');
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Telegram endpoint доступен');
      console.log(`📊 Статус: ${result.data.status}`);
    } else {
      console.log('❌ Telegram endpoint недоступен:', result.error);
    }
  } catch (error) {
    console.log('❌ Ошибка доступа к endpoint:', error.message);
  }

  // 5. Проверка обновлений
  console.log('\n5. Получение последних обновлений:');
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=1`);
    const result = await response.json();
    
    if (result.ok && result.result.length > 0) {
      const update = result.result[0];
      console.log(`📨 Последнее обновление ID: ${update.update_id}`);
      
      if (update.message) {
        console.log(`👤 От: ${update.message.from.username || update.message.from.first_name}`);
        console.log(`💬 Текст: ${update.message.text || 'NO TEXT'}`);
        console.log(`📅 Время: ${new Date(update.message.date * 1000)}`);
      }
    } else {
      console.log('📭 Нет новых обновлений');
    }
  } catch (error) {
    console.log('❌ Ошибка получения обновлений:', error.message);
  }
}

testTelegramSystem();