/**
 * Скрипт для обновления только кнопки меню бота
 * Использует специальный метод для избежания проблем с обновлением
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
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`❌ Ошибка при вызове API ${method}:`, error.message);
    return { ok: false, description: error.message };
  }
}

// Получение информации о боте
async function getBotInfo() {
  console.log('🤖 Получение информации о боте...');
  
  const result = await callTelegramApi('getMe');
  
  if (!result.ok) {
    console.error('❌ Ошибка получения информации о боте:', result.description);
    process.exit(1);
  }
  
  const botInfo = result.result;
  console.log(`✅ Бот @${botInfo.username} (ID: ${botInfo.id}) найден и доступен`);
  
  return botInfo;
}

// Сброс меню к стандартным настройкам
async function resetMenuButton() {
  console.log('🔄 Сброс кнопки меню к стандартным настройкам...');
  
  // Сначала удаляем текущую кнопку
  const deleteResult = await callTelegramApi('deleteChatMenuButton');
  
  if (!deleteResult.ok) {
    console.error('❌ Ошибка при сбросе кнопки меню:', deleteResult.description);
    return false;
  }
  
  console.log('✅ Кнопка меню сброшена к стандартным настройкам');
  return true;
}

// Установка новой кнопки меню
async function setMenuButton() {
  console.log('🔄 Установка новой кнопки меню...');
  
  const menuButton = {
    type: 'web_app',
    text: 'Открыть приложение',
    web_app: { url: MINI_APP_URL }
  };
  
  const result = await callTelegramApi('setChatMenuButton', {
    menu_button: menuButton
  });
  
  if (!result.ok) {
    console.error('❌ Ошибка при установке кнопки меню:', result.description);
    return false;
  }
  
  console.log('✅ Новая кнопка меню установлена');
  return true;
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

// Функция для добавления задержки
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Главная функция
async function main() {
  console.log('🚀 Запуск обновления кнопки меню Telegram-бота...');
  
  // Получаем информацию о боте
  await getBotInfo();
  
  // Получаем текущие настройки
  await getCurrentMenuButton();
  
  // Сбрасываем кнопку к стандартным настройкам
  await resetMenuButton();
  
  // Добавляем задержку
  console.log('⏳ Ожидание применения изменений в API Telegram (3 секунды)...');
  await delay(3000);
  
  // Устанавливаем новую кнопку
  await setMenuButton();
  
  // Добавляем задержку
  console.log('⏳ Ожидание применения изменений в API Telegram (3 секунды)...');
  await delay(3000);
  
  // Проверяем результат
  await getCurrentMenuButton();
  
  console.log('\n✅ Процесс обновления кнопки меню завершен!');
}

// Запуск скрипта
main().catch(error => {
  console.error('❌ Произошла ошибка при выполнении скрипта:', error);
  process.exit(1);
});