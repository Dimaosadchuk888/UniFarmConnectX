/**
 * Обработчик webhook для Telegram
 * Этот файл содержит отдельный Express-сервер для обработки вебхуков от Telegram API
 */

import express from 'express';
import bodyParser from 'body-parser';
import * as telegramBot from './telegramBot';

// Создаем отдельное Express-приложение
const webhookApp = express();

// Настраиваем middleware
webhookApp.use(bodyParser.json());
webhookApp.use(bodyParser.urlencoded({ extended: true }));

// Маршрут для обработки вебхуков от Telegram
webhookApp.post('/webhook', async (req, res) => {
  // Добавляем метки времени и делаем вывод более структурированным
  console.log(`\n[Telegram Webhook] [${new Date().toISOString()}] Получен входящий запрос на /webhook:`);
  
  // Проверка структуры запроса для лучшей диагностики
  if (!req.body) {
    console.warn('[Telegram Webhook] Получен пустой запрос без тела');
    return res.status(400).json({ ok: false, error: 'Empty request body' });
  }
  
  // Логирование в более читабельном формате
  console.log(JSON.stringify(req.body, null, 2));
  
  try {
    // Добавляем проверку на наличие ключевых полей в обновлении
    if (req.body.message) {
      console.log(`[Telegram Webhook] Сообщение от: ${req.body.message.from?.username || req.body.message.from?.id || 'неизвестно'}`);
      if (req.body.message.text) {
        console.log(`[Telegram Webhook] Текст: "${req.body.message.text}"`);
      }
    }
    
    // Обрабатываем обновление
    await telegramBot.handleTelegramUpdate(req.body);
    
    // Успешный ответ
    console.log('[Telegram Webhook] Обновление успешно обработано');
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    // Расширенное логирование ошибок
    console.error('[Telegram Webhook] Ошибка при обработке вебхука:');
    console.error(`   Тип: ${error.name}`);
    console.error(`   Сообщение: ${error.message}`);
    console.error(`   Стек: ${error.stack}`);
    
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Простой маршрут для проверки работоспособности
webhookApp.get('/webhook/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Webhook server is running'
  });
});

export { webhookApp };