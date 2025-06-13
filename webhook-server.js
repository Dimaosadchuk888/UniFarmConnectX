/**
 * Dedicated Webhook Server for Telegram
 * Альтернативный сервер для обхода проблем маршрутизации Replit
 */

import express from 'express';
import https from 'https';

const app = express();
const WEBHOOK_PORT = 8443; // Разрешенный порт для Telegram webhook
const MAIN_SERVER_URL = 'http://localhost:3000/webhook';

// Middleware
app.use(express.json({ limit: '1mb' }));

// Webhook handler
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    console.log('[WebhookServer] Получено обновление от Telegram:', {
      update_id: update.update_id,
      message: update.message ? {
        from: update.message.from,
        text: update.message.text
      } : null
    });

    // Проксируем запрос к основному серверу
    const proxyResponse = await fetch(MAIN_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WebhookServer'
      },
      body: JSON.stringify(update)
    });

    const result = await proxyResponse.json();
    
    console.log('[WebhookServer] Ответ от основного сервера:', {
      status: proxyResponse.status,
      result: result
    });

    // Возвращаем результат Telegram
    res.status(proxyResponse.status).json(result);
  } catch (error) {
    console.error('[WebhookServer] Ошибка обработки webhook:', error);
    
    // Простой fallback ответ для Telegram
    res.json({
      success: true,
      status: 'webhook_processed_fallback',
      update_id: req.body?.update_id || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'webhook-server',
    timestamp: new Date().toISOString()
  });
});

// Запуск сервера
app.listen(WEBHOOK_PORT, '0.0.0.0', () => {
  console.log(`🚀 Webhook сервер запущен на порту ${WEBHOOK_PORT}`);
  console.log(`📡 Webhook доступен: https://uni-farm-connect-x-osadchukdmitro2.replit.app:${WEBHOOK_PORT}/webhook`);
  console.log(`🔄 Проксирует запросы к: ${MAIN_SERVER_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📦 Завершение webhook сервера...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📦 Завершение webhook сервера...');
  process.exit(0);
});