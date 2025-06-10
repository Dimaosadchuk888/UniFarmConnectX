/**
 * Главная точка входа UniFarm
 * Запускает сервер с интеграцией всех модулей
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import { config, logger } from '../core';
import { setupVite, serveStatic } from './vite';
import apiRoutes from './routes';

async function startServer() {
  try {
    const app = express();

    // Middleware
    app.use(cors({
      origin: config.security.cors.origin,
      credentials: true
    }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Логирование запросов
    app.use((req: any, res: any, next: any) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.request(req.method, req.originalUrl, res.statusCode, duration);
      });
      next();
    });

    // Health check
    app.get('/health', (req: any, res: any) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: config.app.apiVersion,
        environment: config.app.nodeEnv
      });
    });

    // API routes
    const apiPrefix = `/api/v2`;
    
    // Health check endpoint for v2 API
    app.get(`${apiPrefix}/health`, (req: any, res: any) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: config.app.apiVersion,
        environment: config.app.nodeEnv
      });
    });

    // Connect modular API routes
    app.use(apiPrefix, apiRoutes);

    // User Profile API
    app.get(`${apiPrefix}/users/profile`, (req: any, res: any) => {
      const userData = {
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
      };

      res.json({
        success: true,
        data: userData
      });
    });

    // Daily bonus status API
    app.get(`${apiPrefix}/daily-bonus/status`, (req: any, res: any) => {
      res.json({
        success: true,
        data: {
          can_claim: true,
          streak: 1,
          next_reward: '100.000000',
          last_claim: null
        }
      });
    });

    // Daily bonus claim API
    app.post(`${apiPrefix}/daily-bonus/claim`, (req: any, res: any) => {
      res.json({
        success: true,
        data: {
          reward: '100.000000',
          new_balance: '1100.000000',
          streak: 2
        }
      });
    });

    // UNI Farming endpoints
    app.get(`${apiPrefix}/uni-farming/status`, (req: any, res: any) => {
      res.json({
        success: true,
        data: {
          active: true,
          balance: '250.000000',
          rate: '0.500000',
          started_at: new Date().toISOString(),
          last_update: new Date().toISOString()
        }
      });
    });

    app.post(`${apiPrefix}/uni-farming/start`, (req: any, res: any) => {
      res.json({
        success: true,
        data: {
          message: 'UNI Farming активирован',
          rate: '0.500000'
        }
      });
    });

    app.post(`${apiPrefix}/uni-farming/claim`, (req: any, res: any) => {
      res.json({
        success: true,
        data: {
          claimed: '250.000000',
          new_balance: '1250.000000'
        }
      });
    });

    // Income chart data
    app.get(`${apiPrefix}/income/chart`, (req: any, res: any) => {
      const chartData = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        income: Math.floor(Math.random() * 100) + 50
      }));

      res.json({
        success: true,
        data: chartData
      });
    });

    // Boost status endpoint
    app.get(`${apiPrefix}/boosts/status`, (req: any, res: any) => {
      res.json({
        success: true,
        data: {
          speed_boost: {
            active: true,
            multiplier: 2,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          },
          income_boost: {
            active: false,
            multiplier: 1,
            expires_at: null
          },
          energy_boost: {
            active: true,
            multiplier: 1.5,
            expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
          }
        }
      });
    });

    // Missions endpoint
    app.get(`${apiPrefix}/missions`, (req: any, res: any) => {
      const staticMissions = [
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
        },
        {
          id: 3,
          type: 'check-in',
          title: 'Ежедневная награда',
          description: 'Заходите каждый день и получайте бонусы',
          reward_uni: '50.000000',
          is_active: true
        }
      ];
      
      res.json({
        success: true,
        data: staticMissions
      });
    });

    // User missions endpoint
    app.get(`${apiPrefix}/user-missions`, (req: any, res: any) => {
      res.json({
        success: true,
        data: []
      });
    });

    // Referral stats
    app.get(`${apiPrefix}/referrals/stats`, (req: any, res: any) => {
      res.json({
        success: true,
        data: {
          total_referrals: 5,
          active_referrals: 3,
          total_earnings: '500.000000',
          referral_code: 'REF123456'
        }
      });
    });

    // Wallet operations
    app.get(`${apiPrefix}/wallet/balance`, (req: any, res: any) => {
      res.json({
        success: true,
        data: {
          uni_balance: '1000.000000',
          ton_balance: '5.500000',
          farming_balance: '250.000000'
        }
      });
    });

    // Transaction history
    app.get(`${apiPrefix}/transactions`, (req: any, res: any) => {
      const transactions = [
        {
          id: 1,
          type: 'farming_claim',
          amount: '250.000000',
          currency: 'UNI',
          timestamp: new Date().toISOString(),
          status: 'completed'
        },
        {
          id: 2,
          type: 'daily_bonus',
          amount: '100.000000',
          currency: 'UNI',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed'
        }
      ];

      res.json({
        success: true,
        data: transactions
      });
    });

    // TON Boost packages endpoint
    app.get('/api/ton-boosts', (req: any, res: any) => {
      const packages = [
        {
          id: 1,
          name: "Starter Boost",
          description: "Начальный пакет для изучения TON Farming",
          price_ton: "1",
          bonus_uni: "10000",
          daily_rate: "0.5",
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          name: "Standard Boost", 
          description: "Стандартный пакет с повышенной доходностью",
          price_ton: "5",
          bonus_uni: "75000",
          daily_rate: "1",
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];
      
      res.json({
        success: true,
        data: packages
      });
    });

    // Legacy API endpoint
    app.get('/api/user/current', (req: any, res: any) => {
      const userData = {
        id: 1,
        guest_id: 'guest_' + Date.now(),
        balance_uni: '1000',
        balance_ton: '5',
        uni_farming_balance: '250',
        uni_farming_rate: '0.5',
        uni_deposit_amount: '500'
      };

      res.json({
        success: true,
        data: userData
      });
    });

    // TON Connect manifest
    app.get('/tonconnect-manifest.json', (req: any, res: any) => {
      res.json({
        url: config.app.baseUrl,
        name: "UniFarm",
        iconUrl: `${config.app.baseUrl}/logo.png`,
        termsOfUseUrl: `${config.app.baseUrl}/terms`,
        privacyPolicyUrl: `${config.app.baseUrl}/privacy`
      });
    });

    // Static files for production
    if (config.app.nodeEnv === 'production') {
      const staticPath = path.resolve(import.meta.dirname, '..', 'dist', 'public');
      if (fs.existsSync(staticPath)) {
        app.use(express.static(staticPath));
      }
    }

    // Root route - serve the main application
    app.get('/', (req: any, res: any) => {
      const indexPath = path.resolve(import.meta.dirname, '..', 'dist', 'public', 'index.html');
      
      // Check if built file exists
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        // Fallback response if build doesn't exist
        res.json({
          success: true,
          message: 'UniFarm API Server',
          version: config.app.apiVersion,
          environment: config.app.nodeEnv,
          endpoints: {
            health: '/health',
            api: '/api/v2'
          }
        });
      }
    });

    // Error handling middleware
    app.use((req: any, res: any, next: any) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
      });
    });

    app.use((error: any, req: any, res: any, next: any) => {
      logger.error('Server error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // HTTP server
    const server = createServer(app);

    // Setup Vite middleware or static files
    if (config.app.nodeEnv === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    const port = parseInt(String(config.app.port));
    server.listen(port, '0.0.0.0', () => {
      logger.info(`UniFarm server запущен на порту ${port}`);
      logger.info(`Environment: ${config.app.nodeEnv}`);
      logger.info(`API Version: ${config.app.apiVersion}`);
    });

  } catch (error: any) {
    logger.error('Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Получен SIGTERM signal, завершение работы...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Получен SIGINT signal, завершение работы...');
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  logger.error('Fatal error starting server:', error);
  process.exit(1);
});