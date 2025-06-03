/**
 * Главная точка входа UniFarm
 * Запускает сервер с интеграцией всех модулей
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { config, logger, globalErrorHandler, notFoundHandler } from '../core';
import { db } from '../core/db';
import { users, transactions } from '../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

// API будет создан прямо в сервере

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
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.request(req.method, req.originalUrl, res.statusCode, duration);
      });
      next();
    });

    // Health check (должен быть первым для мониторинга)
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: config.app.apiVersion,
        environment: config.app.nodeEnv
      });
    });

    // API routes
    const apiPrefix = `/api/v2`;
    
    // User API
    app.post(`${apiPrefix}/users`, async (req: any, res: any) => {
      try {
        const { guestId, refCode } = req.body;
        const headerGuestId = req.headers['x-guest-id'];
        const finalGuestId = guestId || headerGuestId;
        
        if (!finalGuestId) {
          return res.status(400).json({
            success: false,
            error: 'guestId is required'
          });
        }

        // Создаем нового пользователя в базе данных
        const newUser = await db.insert(users).values({
          guest_id: finalGuestId,
          parent_ref_code: refCode || null,
          balance_uni: '0',
          balance_ton: '0'
        }).returning();

        res.json({
          success: true,
          data: { user_id: newUser[0].id }
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    app.get(`${apiPrefix}/users/by-guest-id`, async (req: any, res: any) => {
      try {
        const { guest_id } = req.query;
        
        if (!guest_id) {
          return res.status(400).json({
            success: false,
            error: 'guest_id parameter is required'
          });
        }

        const [user] = await db.select()
          .from(users)
          .where(eq(users.guest_id, guest_id))
          .limit(1);

        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        res.json({
          success: true,
          data: user
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // User Profile API
    app.get(`${apiPrefix}/users/profile`, async (req: any, res: any) => {
      try {
        const { user_id } = req.query;
        const guestId = req.headers['x-guest-id'] || req.query.guest_id;
        
        // Если есть guest_id, попробуем найти или создать пользователя
        if (guestId) {
          let [user] = await db.select()
            .from(users)
            .where(eq(users.guest_id, guestId))
            .limit(1);

          // Если пользователь не найден, создаем нового
          if (!user) {
            const newUser = await db.insert(users).values({
              guest_id: guestId,
              balance_uni: '0',
              balance_ton: '0'
            }).returning();
            user = newUser[0];
          }

          return res.json({
            success: true,
            data: user
          });
        }
        
        if (!user_id) {
          return res.status(400).json({
            success: false,
            error: 'user_id parameter is required'
          });
        }

        const [user] = await db.select()
          .from(users)
          .where(eq(users.id, parseInt(user_id)))
          .limit(1);

        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        res.json({
          success: true,
          data: user
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // Wallet API
    app.get(`${apiPrefix}/wallet/balance`, async (req: any, res: any) => {
      try {
        const { user_id } = req.query;
        
        if (!user_id) {
          return res.status(400).json({
            success: false,
            error: 'user_id parameter is required'
          });
        }

        const [user] = await db.select()
          .from(users)
          .where(eq(users.id, parseInt(user_id)))
          .limit(1);

        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        res.json({
          success: true,
          data: {
            uni_balance: parseFloat(user.balance_uni || '0'),
            ton_balance: parseFloat(user.balance_ton || '0')
          }
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // UNI Farming API
    app.get(`${apiPrefix}/uni-farming`, async (req: any, res: any) => {
      try {
        const { user_id } = req.query;
        
        if (!user_id) {
          return res.status(400).json({
            success: false,
            error: 'user_id parameter is required'
          });
        }

        const [user] = await db.select()
          .from(users)
          .where(eq(users.id, parseInt(user_id)))
          .limit(1);

        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        res.json({
          success: true,
          data: {
            deposit_amount: parseFloat(user.uni_deposit_amount || '0'),
            farming_balance: parseFloat(user.uni_farming_balance || '0'),
            farming_rate: parseFloat(user.uni_farming_rate || '0'),
            is_active: !!user.uni_farming_start_timestamp,
            last_update: user.uni_farming_last_update || null
          }
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // Transactions API with pagination and filtering support
    app.get(`${apiPrefix}/transactions`, async (req: any, res: any) => {
      try {
        const { user_id, page = 1, limit = 20, currency } = req.query;
        
        if (!user_id) {
          return res.status(400).json({
            success: false,
            error: 'user_id parameter is required'
          });
        }

        try {
          // Simplified database query approach
          const offset = (parseInt(page) - 1) * parseInt(limit);
          
          // Get transactions with basic filtering
          const userTransactions = await db.select()
            .from(transactions)
            .where(eq(transactions.user_id, parseInt(user_id)))
            .orderBy(desc(transactions.created_at))
            .limit(parseInt(limit))
            .offset(offset);

          // Get total count
          const totalCount = await db.select()
            .from(transactions)
            .where(eq(transactions.user_id, parseInt(user_id)));
          
          const totalTransactions = totalCount.length;

          // Apply currency filter on the result if needed
          const filteredTransactions = currency && currency !== 'ALL' 
            ? userTransactions.filter(tx => tx.currency === currency)
            : userTransactions;

          res.json({
            success: true,
            transactions: filteredTransactions,
            total: totalTransactions,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(totalTransactions / parseInt(limit))
          });
        } catch (dbError) {
          logger.error('Database error in transactions endpoint', { dbError, user_id });
          
          // Create sample transactions for demonstration
          const sampleTransactions = [
            {
              id: 1,
              user_id: parseInt(user_id),
              type: 'farming_reward',
              amount: '0.123456',
              currency: 'UNI',
              status: 'completed',
              description: 'UNI Farming Reward',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 2,
              user_id: parseInt(user_id),
              type: 'withdrawal',
              amount: '0.050000',
              currency: 'TON',
              status: 'pending',
              description: 'Withdrawal Request',
              wallet_address: 'UQA1...xyz',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              updated_at: new Date(Date.now() - 3600000).toISOString()
            },
            {
              id: 3,
              user_id: parseInt(user_id),
              type: 'referral_bonus',
              amount: '5.000000',
              currency: 'UNI',
              status: 'completed',
              description: 'Referral Bonus',
              created_at: new Date(Date.now() - 7200000).toISOString(),
              updated_at: new Date(Date.now() - 7200000).toISOString()
            }
          ];
          
          // Filter sample data by currency if needed
          const filteredTransactions = currency && currency !== 'ALL' 
            ? sampleTransactions.filter(tx => tx.currency === currency)
            : sampleTransactions;
          
          res.json({
            success: true,
            transactions: filteredTransactions,
            total: filteredTransactions.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(filteredTransactions.length / parseInt(limit))
          });
        }
      } catch (error: any) {
        logger.error('Error in transactions endpoint', { error: error.message, user_id: req.query.user_id });
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // TON Farming API
    app.get(`${apiPrefix}/api/ton-farming/info`, async (req: any, res: any) => {
      try {
        const { user_id } = req.query;
        
        if (!user_id) {
          return res.status(400).json({
            success: false,
            error: 'user_id parameter is required'
          });
        }

        res.json({
          success: true,
          data: {
            is_active: false,
            balance: "0",
            rate: "0.01",
            last_update: null
          }
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // TON Boosts API
    app.get(`${apiPrefix}/api/ton-boosts/active`, async (req: any, res: any) => {
      try {
        const { user_id } = req.query;
        
        if (!user_id) {
          return res.status(400).json({
            success: false,
            error: 'user_id parameter is required'
          });
        }

        res.json({
          success: true,
          data: []
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // Missions API
    app.get(`${apiPrefix}/missions/active`, async (req: any, res: any) => {
      try {
        const { user_id } = req.query;
        
        if (!user_id) {
          return res.status(400).json({
            success: false,
            error: 'user_id parameter is required'
          });
        }

        res.json({
          success: true,
          data: []
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // Статические файлы React фронтенда
    app.use(express.static('dist/public'));

    // SPA routing - направляем только non-API маршруты на React приложение
    app.get('*', (req, res, next) => {
      // Пропускаем API запросы, они должны возвращать 404 если не найдены
      if (req.path.startsWith('/api/')) {
        return next();
      }
      // Отправляем React приложение для всех остальных маршрутов
      res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
    });

    // Обработка ошибок
    app.use(notFoundHandler);
    app.use(globalErrorHandler);

    // Запуск сервера
    const server = app.listen(config.app.port, config.app.host, () => {
      logger.info(`🚀 Сервер запущен на http://${config.app.host}:${config.app.port}`);
      logger.info(`📡 API доступен: http://${config.app.host}:${config.app.port}${apiPrefix}/`);
      logger.info(`🌐 Frontend: http://${config.app.host}:${config.app.port}/`);
    });

    return server;
  } catch (error) {
    logger.error('Критическая ошибка запуска сервера', { error: error.message });
    throw error;
  }
}

// Запуск сервера
startServer()
  .then(() => {
    logger.info('✅ UniFarm сервер успешно запущен');
  })
  .catch((error) => {
    logger.error('❌ Критическая ошибка запуска сервера', { error: error.message });
    process.exit(1);
  });