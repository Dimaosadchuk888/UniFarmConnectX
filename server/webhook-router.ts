/**
 * Отдельный роутер для обработки Telegram webhook
 * Этот файл должен импортироваться до всех остальных middleware и маршрутов
 */

import express from 'express';
import * as telegramBot from './telegramBot';

// Создаем Express роутер
const webhookRouter = express.Router();

// Middleware для обработки JSON
webhookRouter.use('/webhook', express.json());

// Маршрут для обработки запросов от Telegram
webhookRouter.post('/webhook', async (req, res) => {
  // Добавляем метки времени
  console.log(`\n[Telegram Webhook] [${new Date().toISOString()}] Получен входящий запрос`);
  
  try {
    // Проверка структуры запроса
    if (!req.body) {
      console.warn('[Telegram Webhook] Получен пустой запрос без тела');
      return res.status(400).json({ ok: false, error: 'Empty request body' });
    }
    
    // Логирование запроса
    console.log('[Telegram Webhook] Тело запроса:');
    console.log(JSON.stringify(req.body, null, 2));
    
    // Обработка сообщения, если есть
    if (req.body.message) {
      console.log(`[Telegram Webhook] Сообщение от: ${req.body.message.from?.username || req.body.message.from?.id || 'неизвестно'}`);
      if (req.body.message.text) {
        console.log(`[Telegram Webhook] Текст: "${req.body.message.text}"`);
      }
    }
    
    // Обработка обновления через Telegram Bot API
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
    
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// Тестовый маршрут для проверки работы webhook
webhookRouter.get('/webhook/test', (req, res) => {
  console.log('[Telegram Webhook] Запрос к тестовому маршруту /webhook/test');
  return res.status(200).json({
    ok: true,
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString()
  });
});

export default webhookRouter;