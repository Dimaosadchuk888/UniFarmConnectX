import { Router } from 'express';
import { AdminBotController } from './controller';
import { logger } from '../../core/logger';

const router = Router();
const adminBotController = new AdminBotController();

// Admin bot routes test endpoint
router.get('/test', (req, res) => {
  res.status(200).json({
    status: 'admin-bot routes working',
    timestamp: new Date().toISOString(),
    version: '2.0'
  });
});

// Admin bot webhook status endpoint (for Telegram verification)
router.get('/webhook', (req, res) => {
  res.status(200).json({
    status: 'ready',
    service: 'UniFarm Admin Bot',
    timestamp: new Date().toISOString(),
    message: 'Webhook endpoint is operational'
  });
});

// Admin bot webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    logger.info('[AdminBot] Received webhook update', { 
      updateId: req.body.update_id,
      hasMessage: !!req.body.message,
      hasCallbackQuery: !!req.body.callback_query
    });
    
    // Всегда отвечаем 200 OK для Telegram, даже если есть внутренние ошибки
    // Это предотвращает повторную отправку обновлений от Telegram
    res.status(200).send('OK');
    
    // Обрабатываем обновление асинхронно
    await adminBotController.handleUpdate(req.body);
    
    logger.info('[AdminBot] Webhook update processed successfully', { 
      updateId: req.body.update_id 
    });
    
  } catch (error) {
    logger.error('[AdminBot] Webhook processing error', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      updateId: req.body.update_id
    });
    
    // Уже отправили 200 OK, не отправляем 500 для предотвращения повторов
  }
});

export { router as adminBotRoutes };