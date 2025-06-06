#!/usr/bin/env node
/**
 * Vite сервер со встроенным API для UniFarm
 */

import { createServer as createViteServer } from 'vite';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();
  
  // Middleware
  app.use(express.json());
  
  // API endpoints
  const apiPrefix = '/api/v2';
  
  // User Profile API
  app.get(`${apiPrefix}/users/profile`, (req, res) => {
    res.json({
      success: true,
      data: {
        id: 1,
        guest_id: 'guest_demo_' + Date.now(),
        balance_uni: '1000.000000',
        balance_ton: '5.500000',
        uni_farming_balance: '250.000000',
        uni_farming_rate: '0.500000',
        uni_deposit_amount: '500.000000',
        uni_farming_start_timestamp: new Date().toISOString(),
        uni_farming_last_update: new Date().toISOString(),
        uni_farming_active: true
      }
    });
  });

  // Daily bonus API
  app.get(`${apiPrefix}/daily-bonus/status`, (req, res) => {
    res.json({
      success: true,
      data: {
        can_claim: true,
        streak: 1,
        last_claim_date: null,
        next_claim_time: null,
        bonus_amount: 100
      }
    });
  });

  // Wallet balance API
  app.get(`${apiPrefix}/wallet/balance`, (req, res) => {
    res.json({
      success: true,
      data: {
        balance_uni: '1000.000000',
        balance_ton: '5.500000',
        uni_farming_balance: '250.000000',
        accumulated_ton: '0.150000'
      }
    });
  });

  // UNI Farming status API
  app.get(`${apiPrefix}/uni-farming/status`, (req, res) => {
    res.json({
      success: true,
      data: {
        isActive: true,
        depositAmount: '500.000000',
        ratePerSecond: '0.000006',
        totalRatePerSecond: '0.000006',
        depositCount: 1,
        totalDepositAmount: '500.000000'
      }
    });
  });

  // TON Farming info API
  app.get(`${apiPrefix}/ton-farming/info`, (req, res) => {
    res.json({
      success: true,
      data: {
        deposit_amount: 2.5,
        farming_balance: 0.15,
        farming_rate: 0.0001,
        is_active: true,
        last_update: new Date().toISOString()
      }
    });
  });

  // Missions API
  app.get(`${apiPrefix}/missions`, (req, res) => {
    res.json({
      success: true,
      data: [
        {
          id: 1,
          type: 'social',
          title: 'Подписаться на Telegram канал',
          description: 'Подпишитесь на наш официальный Telegram канал',
          reward_uni: '100.000000',
          is_active: true
        },
        {
          id: 2,
          type: 'invite',
          title: 'Пригласить друга',
          description: 'Пригласите друга и получите бонус',
          reward_uni: '200.000000',
          is_active: true
        }
      ]
    });
  });

  // User missions API
  app.get(`${apiPrefix}/user-missions`, (req, res) => {
    res.json({
      success: true,
      data: []
    });
  });

  // Create Vite server
  const vite = await createViteServer({
    root: path.join(__dirname, 'client'),
    server: { 
      middlewareMode: true,
      host: '0.0.0.0'
    },
    appType: 'spa',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client/src'),
        '@shared': path.resolve(__dirname, 'shared'),
        '@assets': path.resolve(__dirname, 'attached_assets'),
      },
    }
  });

  // Use vite's connect instance as middleware
  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);

  const server = createServer(app);
  const port = process.env.PORT || 3000;

  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 UniFarm сервер запущен на порту ${port}`);
    console.log(`📱 Приложение: http://localhost:${port}`);
    console.log(`📡 API: http://localhost:${port}/api/v2`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    server.close(() => {
      vite.close();
    });
  });
}

createServer().catch(err => {
  console.error('Ошибка запуска сервера:', err);
  process.exit(1);
});