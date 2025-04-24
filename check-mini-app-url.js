/**
 * Скрипт для проверки URL мини-приложения
 * Этот скрипт позволяет проверить правильность настройки вашего мини-приложения в BotFather
 */

import fetch from 'node-fetch';
const botToken = process.env.TELEGRAM_BOT_TOKEN;

async function callTelegramApi(method, data = {}) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/${method}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error calling Telegram API (${method}):`, error);
    return { ok: false, error: error.message };
  }
}

async function getBotInfo() {
  const result = await callTelegramApi('getMe');
  if (result.ok) {
    console.log('Bot Information:');
    console.log(`- Name: ${result.result.first_name}`);
    console.log(`- Username: @${result.result.username}`);
    console.log(`- Bot ID: ${result.result.id}`);
    return result.result;
  } else {
    console.error('Failed to get bot info:', result);
    return null;
  }
}

async function getMyCommands() {
  const result = await callTelegramApi('getMyCommands');
  if (result.ok) {
    console.log('\nBot Commands:');
    result.result.forEach(cmd => {
      console.log(`/${cmd.command} - ${cmd.description}`);
    });
    return result.result;
  } else {
    console.error('Failed to get commands:', result);
    return [];
  }
}

async function getWebAppInfo() {
  // Эта функция не использует API, а проверяет
  // правильность ссылки для Mini App
  
  console.log('\nMini App URL Check:');
  
  // Проверка стандартной URL-структуры для Mini App
  const botUsername = 'UniFarming_Bot';
  const miniAppName = 'UniFarm';
  
  const standardUrl = `https://t.me/${botUsername}/${miniAppName}`;
  console.log(`- Standard Format URL: ${standardUrl}`);
  
  // Проверка URL для меню
  console.log('\nMenu Button URL Info:');
  console.log('⚠️ Для полной проверки используйте BotFather');
  console.log('  Команды: /mybots → @UniFarming_Bot → Bot Settings → Menu Button');
  
  // Проверка добавленного Mini App
  console.log('\nRegistered Mini Apps:');
  console.log('⚠️ Для полной проверки используйте BotFather');
  console.log('  Команды: /mybots → @UniFarming_Bot → Bot Settings → Mini Apps');
  
  // Тестирование доступности основного домена
  try {
    const domain = 'https://uni-farm-connect-2-misterxuniverse.replit.app';
    console.log(`\nПроверка доступности домена:\n- ${domain}`);
    
    const response = await fetch(domain);
    console.log(`- Статус: ${response.status} ${response.statusText}`);
    console.log(`- Домен доступен: ${response.ok ? 'ДА ✅' : 'НЕТ ❌'}`);
  } catch (error) {
    console.error('Ошибка при проверке домена:', error.message);
  }
}

async function main() {
  if (!botToken) {
    console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в переменных окружения');
    console.log('   Убедитесь, что вы запускаете скрипт в среде с установленным токеном бота');
    return;
  }
  
  console.log('🔍 Проверка мини-приложения для Telegram...\n');
  
  await getBotInfo();
  await getMyCommands();
  await getWebAppInfo();
  
  console.log('\n✅ Проверка завершена');
  console.log('📋 Используйте информацию выше для проверки настроек мини-приложения');
  console.log('❗️ Для точной проверки URL используйте BotFather');
}

main().catch(err => {
  console.error('Неожиданная ошибка при выполнении скрипта:', err);
});