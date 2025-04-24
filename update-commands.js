/**
 * Скрипт для обновления команд бота в соответствии с ТЗ
 */

import { config } from 'dotenv';
import fetch from 'node-fetch';

// Загружаем переменные окружения
config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Проверка наличия токена
if (!BOT_TOKEN) {
  console.error('❌ Ошибка: Переменная окружения TELEGRAM_BOT_TOKEN не определена');
  process.exit(1);
}

// Функция для вызова Telegram API
async function callTelegramApi(method, data = {}) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Ошибка при вызове API ${method}:`, error.message);
    return { ok: false, description: error.message };
  }
}

// Получение текущих команд бота
async function getCurrentCommands() {
  console.log('📋 Получение текущих команд бота...');
  
  const result = await callTelegramApi('getMyCommands');
  
  if (!result.ok) {
    console.error('❌ Ошибка получения команд бота:', result.description);
    return null;
  }
  
  console.log('✅ Текущие команды бота:', JSON.stringify(result.result, null, 2));
  return result.result;
}

// Обновление команд в соответствии с ТЗ
async function updateCommands() {
  console.log('🔄 Обновление команд бота в соответствии с ТЗ...');
  
  const commands = [
    { command: 'start', description: 'Запустить бота и получить приветственное сообщение' },
    { command: 'app', description: 'Открыть Mini App для фарминга и заработка' },
    { command: 'refcode', description: 'Получить ваш реферальный код' },
    { command: 'info', description: 'Информация о вашем аккаунте' },
    { command: 'ping', description: 'Проверка соединения с ботом' }
  ];
  
  const result = await callTelegramApi('setMyCommands', { commands });
  
  if (!result.ok) {
    console.error('❌ Ошибка при обновлении команд бота:', result.description);
    return false;
  }
  
  console.log('✅ Команды бота успешно обновлены!');
  return true;
}

// Главная функция
async function main() {
  console.log('🚀 Запуск обновления команд Telegram-бота в соответствии с ТЗ...');
  
  // Получаем текущие команды
  await getCurrentCommands();
  
  // Обновляем команды
  await updateCommands();
  
  // Проверяем, что команды обновились
  console.log('🔍 Проверка обновления команд...');
  await getCurrentCommands();
  
  console.log('\n✅ Обновление команд успешно завершено!');
}

// Запуск скрипта
main().catch(error => {
  console.error('❌ Произошла ошибка при выполнении скрипта:', error);
  process.exit(1);
});