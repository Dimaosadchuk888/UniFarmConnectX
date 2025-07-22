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
    logger.info('[AdminBot] Received webhook update');
    await adminBotController.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    logger.error('[AdminBot] Webhook error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).send('Error');
  }
});

export { router as adminBotRoutes };