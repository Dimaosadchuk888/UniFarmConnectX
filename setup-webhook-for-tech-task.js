/**
 * Скрипт для настройки Telegram webhook согласно техническому заданию
 */
const TOKEN = '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';
const WEBHOOK_URL = 'https://uni-farm-connect-2-misterxuniverse.replit.app/webhook';

async function setWebhook() {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: WEBHOOK_URL }),
      }
    );

    const result = await response.json();
    console.log('Установка webhook:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('Ошибка при установке webhook:', error);
    return { ok: false, description: error.message };
  }
}

async function getWebhookInfo() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
    const result = await response.json();
    
    console.log('\nТекущий webhook:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('Ошибка при получении информации о webhook:', error);
    return { ok: false, description: error.message };
  }
}

async function main() {
  console.log('=== Настройка webhook для Telegram бота ===');
  console.log(`Устанавливаем webhook на адрес: ${WEBHOOK_URL}\n`);
  
  // Устанавливаем webhook
  await setWebhook();
  
  // Проверяем настройки webhook
  await getWebhookInfo();
}

main().catch(console.error);