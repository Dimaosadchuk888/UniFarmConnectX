/**
 * Скрипт для обновления кнопки меню бота в соответствии с ТЗ
 */

import { config } from 'dotenv';
import fetch from 'node-fetch';

// Загружаем переменные окружения
config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MINI_APP_URL = 'https://t.me/UniFarming_Bot/UniFarm';

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

// Получение текущей настройки кнопки меню
async function getCurrentMenuButton() {
  console.log('📋 Получение текущей настройки кнопки меню...');
  
  const result = await callTelegramApi('getChatMenuButton');
  
  if (!result.ok) {
    console.error('❌ Ошибка получения информации о кнопке меню:', result.description);
    return null;
  }
  
  console.log('✅ Текущая кнопка меню:', JSON.stringify(result.result, null, 2));
  return result.result;
}

// Обновление кнопки меню в соответствии с ТЗ
async function updateMenuButton() {
  console.log('🔄 Обновление кнопки меню в соответствии с ТЗ...');
  
  const menuButton = {
    type: 'web_app',
    text: 'Открыть приложение',
    web_app: { url: MINI_APP_URL }
  };
  
  const result = await callTelegramApi('setChatMenuButton', {
    menu_button: menuButton
  });
  
  if (!result.ok) {
    console.error('❌ Ошибка при обновлении кнопки меню:', result.description);
    return false;
  }
  
  console.log('✅ Кнопка меню успешно обновлена!');
  return true;
}

// Обновление описаний команд в соответствии с ТЗ
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
  console.log('🚀 Запуск обновления настроек Telegram-бота в соответствии с ТЗ...');
  
  // Получаем текущие настройки
  const currentMenuButton = await getCurrentMenuButton();
  
  // Обновляем кнопку меню
  await updateMenuButton();
  
  // Обновляем команды
  await updateCommands();
  
  console.log('\n✅ Все настройки успешно обновлены!');
}

// Запуск скрипта
main().catch(error => {
  console.error('❌ Произошла ошибка при выполнении скрипта:', error);
  process.exit(1);
});