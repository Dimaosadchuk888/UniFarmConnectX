/**
 * ПРИНУДИТЕЛЬНАЯ ОЧИСТКА КЕША TELEGRAM
 * 
 * Этот скрипт полностью перенастраивает Telegram бота и принудительно
 * очищает весь кеш для загрузки новой версии приложения
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PRODUCTION_URL = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app';

async function callTelegramAPI(method, data = {}) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`❌ Ошибка API ${method}:`, error.message);
    return { ok: false, error: error.message };
  }
}

async function forceClearTelegramCache() {
  console.log('🔥 ПРИНУДИТЕЛЬНАЯ ОЧИСТКА КЕША TELEGRAM');
  console.log('==========================================');
  console.log(`🎯 Продакшн URL: ${PRODUCTION_URL}`);
  console.log('');
  
  try {
    // 1. Удаляем текущий webhook
    console.log('🗑️ 1. Удаляем старый webhook...');
    const deleteWebhook = await callTelegramAPI('deleteWebhook', {
      drop_pending_updates: true
    });
    
    if (deleteWebhook.ok) {
      console.log('✅ Webhook удален');
    } else {
      console.log(`⚠️ Предупреждение при удалении webhook: ${deleteWebhook.description}`);
    }
    
    // 2. Удаляем кнопку меню
    console.log('\n🗑️ 2. Удаляем кнопку меню...');
    const deleteMenu = await callTelegramAPI('setChatMenuButton', {
      menu_button: { type: 'default' }
    });
    
    if (deleteMenu.ok) {
      console.log('✅ Кнопка меню удалена');
    } else {
      console.log(`⚠️ Предупреждение при удалении меню: ${deleteMenu.description}`);
    }
    
    // 3. Ждем 3 секунды для обработки изменений
    console.log('\n⏱️ 3. Ожидание 3 секунды...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. Устанавливаем новый webhook с уникальным параметром
    const uniqueParam = `?cache_bust=${Date.now()}&force_reload=true`;
    const webhookUrl = `${PRODUCTION_URL}/api/telegram/webhook${uniqueParam}`;
    
    console.log('\n🔗 4. Устанавливаем новый webhook...');
    const setWebhook = await callTelegramAPI('setWebhook', {
      url: webhookUrl,
      drop_pending_updates: true,
      allowed_updates: ["message", "callback_query"],
      secret_token: `unifarm_${Date.now()}`
    });
    
    if (setWebhook.ok) {
      console.log(`✅ Webhook установлен: ${webhookUrl}`);
    } else {
      console.log(`❌ Ошибка установки webhook: ${setWebhook.description}`);
    }
    
    // 5. Устанавливаем новую кнопку меню с уникальным параметром
    const appUrl = `${PRODUCTION_URL}${uniqueParam}&app_version=${Date.now()}`;
    
    console.log('\n📱 5. Устанавливаем новую кнопку меню...');
    const setMenu = await callTelegramAPI('setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: 'Открыть UniFarm ⚡',
        web_app: { url: appUrl }
      }
    });
    
    if (setMenu.ok) {
      console.log(`✅ Кнопка меню установлена: ${appUrl}`);
    } else {
      console.log(`❌ Ошибка установки меню: ${setMenu.description}`);
    }
    
    // 6. Обновляем команды бота
    console.log('\n⚙️ 6. Обновляем команды бота...');
    const setCommands = await callTelegramAPI('setMyCommands', {
      commands: [
        {
          command: 'start',
          description: '🚀 Запустить UniFarm (новая версия)'
        },
        {
          command: 'app',
          description: '📱 Открыть приложение'
        },
        {
          command: 'help',
          description: '❓ Помощь'
        }
      ]
    });
    
    if (setCommands.ok) {
      console.log('✅ Команды обновлены');
    } else {
      console.log(`⚠️ Предупреждение при обновлении команд: ${setCommands.description}`);
    }
    
    // 7. Проверяем результат
    console.log('\n🔍 7. Проверяем результат...');
    const webhookInfo = await callTelegramAPI('getWebhookInfo');
    
    if (webhookInfo.ok) {
      console.log(`📡 Активный webhook: ${webhookInfo.result.url}`);
      console.log(`📊 Pending updates: ${webhookInfo.result.pending_update_count}`);
      console.log(`🔑 Secret token: ${webhookInfo.result.has_custom_certificate ? 'Да' : 'Нет'}`);
    }
    
    console.log('\n🎉 ПРИНУДИТЕЛЬНАЯ ОЧИСТКА ЗАВЕРШЕНА!');
    console.log('==========================================');
    console.log('📋 КРИТИЧЕСКИ ВАЖНЫЕ ДЕЙСТВИЯ:');
    console.log('');
    console.log('1. 🔄 ПОЛНОСТЬЮ ПЕРЕЗАГРУЗИТЕ Telegram');
    console.log('2. ❌ Закройте все чаты с ботом');
    console.log('3. 🗑️ Очистите кеш Telegram (настройки → хранилище)');
    console.log('4. 📱 Откройте чат с ботом заново');
    console.log('5. 🎯 Нажмите /start или "Открыть UniFarm ⚡"');
    console.log('');
    console.log('💡 Telegram теперь загрузит приложение с правильного URL!');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

forceClearTelegramCache();