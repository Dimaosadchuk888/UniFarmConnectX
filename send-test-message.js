/**
 * Скрипт для проверки работы Telegram бота через API
 */
const TOKEN = '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';

// Функция для отправки запроса к API
async function callTelegramApi(method, data = {}) {
  try {
    console.log(`Отправляем запрос к API: ${method}`);
    console.log(`Данные: ${JSON.stringify(data)}`);
    
    const response = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    console.log(`Результат: ${JSON.stringify(result, null, 2)}`);
    return result;
  } catch (error) {
    console.error(`Ошибка при вызове ${method}:`, error);
    return null;
  }
}

// Отправка тестового сообщения боту от имени тестового пользователя
async function simulateMessage() {
  const testUser = {
    id: 122121121, // тестовый ID пользователя
    first_name: 'Тестовый',
    last_name: 'Пользователь',
    username: 'test_user'
  };
  
  const message = {
    message_id: 12345,
    from: testUser,
    chat: {
      id: testUser.id,
      first_name: testUser.first_name,
      last_name: testUser.last_name,
      username: testUser.username,
      type: 'private'
    },
    date: Math.floor(Date.now() / 1000),
    text: '/ping'
  };
  
  const update = {
    update_id: 10000,
    message: message
  };
  
  // Напрямую отправляем сообщение в наш webhook
  const webhookUrl = 'https://uni-farm-connect-2-misterxuniverse.replit.app/webhook';
  
  try {
    console.log(`Отправляем тестовое обновление на webhook: ${webhookUrl}`);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    });
    
    const result = await response.text();
    console.log(`Ответ от webhook: ${result}`);
    return { ok: true, result };
  } catch (error) {
    console.error('Ошибка при отправке тестового сообщения на webhook:', error);
    return { ok: false, error: error.message };
  }
}

// Отправка команды getMe для проверки работы бота
async function getMe() {
  return await callTelegramApi('getMe');
}

async function main() {
  console.log('=== Тестирование Telegram бота ===\n');
  
  // Проверка информации о боте
  console.log('Получение информации о боте:');
  const botInfo = await getMe();
  
  if (botInfo && botInfo.ok) {
    console.log(`\nБот успешно подключен!`);
    console.log(`Имя: ${botInfo.result.first_name}`);
    console.log(`Username: @${botInfo.result.username}`);
    console.log(`ID: ${botInfo.result.id}`);
    
    // Симулируем отправку сообщения
    console.log('\nОтправка тестового сообщения на webhook:');
    await simulateMessage();
  } else {
    console.error('\nОшибка при подключении к боту!');
  }
}

main().catch(console.error);