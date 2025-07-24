#!/usr/bin/env npx tsx

import express from 'express';
import cors from 'cors';
import { adminBotRoutes } from '../modules/adminBot/routes';
import { logger } from '../core/logger';

async function testAdminWebhook() {
  console.log('=== TESTING ADMIN WEBHOOK ===\n');
  
  const app = express();
  const port = 3333; // Отдельный порт для тестирования
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // Логирование всех входящих запросов
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log('Headers:', req.headers);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    next();
  });
  
  // Admin bot routes
  app.use('/api/v2/admin-bot', adminBotRoutes);
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Test endpoint
  app.get('/test', (req, res) => {
    res.json({ 
      message: 'Admin webhook test server is running',
      endpoints: [
        'GET /health',
        'GET /test', 
        'POST /api/v2/admin-bot/webhook'
      ]
    });
  });
  
  // Error handler
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('❌ ERROR:', error);
    res.status(500).json({ error: error.message });
  });
  
  // Start server
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Admin webhook test server running on port ${port}`);
    console.log(`Test URL: http://localhost:${port}/test`);
    console.log(`Webhook URL: http://localhost:${port}/api/v2/admin-bot/webhook`);
    console.log('\nTo test webhook, send POST to /api/v2/admin-bot/webhook with Telegram update data');
    console.log('\nPress Ctrl+C to stop');
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n⏹️  Shutting down test server...');
    server.close(() => {
      console.log('✅ Test server stopped');
      process.exit(0);
    });
  });
}

testAdminWebhook().catch(console.error);