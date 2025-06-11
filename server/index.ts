/**
 * Главная точка входа UniFarm
 * Запускает сервер с интеграцией всех модулей
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { config, logger, globalErrorHandler, notFoundHandler } from '../core';
import { db } from '../core/db';
import { users, transactions, missions } from '../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { telegramMiddleware } from '../core/middleware/telegramMiddleware';
import { farmingScheduler } from '../core/scheduler/farmingScheduler';
import { startPoolMonitoring, logPoolStats } from '../core/dbPoolMonitor';

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
    app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.request(req.method, req.originalUrl, res.statusCode, duration);
      });
      next();
    });

    // Health check (должен быть первым для мониторинга)
    app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: config.app.apiVersion,
        environment: config.app.nodeEnv
      });
    });

    // API routes
    const apiPrefix = `/api/v2`;
    
    // Apply Telegram middleware to all API routes
    app.use(apiPrefix, telegramMiddleware);
    
    // Import centralized routes
    const { default: apiRoutes } = await import('./routes');
    app.use(apiPrefix, apiRoutes);
    
    // Legacy API support for v1 endpoints
    app.get('/api/user/current', async (req: any, res: any) => {
      try {
        // Возвращаем базового гостевого пользователя
        const userData = {
          id: 1,
          guest_id: 'guest_' + Date.now(),
          balance_uni: '0',
          balance_ton: '0',
          uni_farming_balance: '0',
          uni_farming_rate: '0',
          uni_deposit_amount: '0'
        };

        res.json({
          success: true,
          data: userData
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    app.get('/api/missions', async (req: any, res: any) => {
      try {
        const missionsList = await db.select().from(missions).orderBy(missions.id);
        
        res.json({
          success: true,
          data: missionsList
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // Add missing v2 endpoints that frontend expects
    app.get(`${apiPrefix}/users/profile`, async (req: any, res: any) => {
      try {
        // Return user data without requiring user_id parameter
        const userData = {
          id: 1,
          guest_id: 'guest_' + Date.now(),
          balance_uni: '0',
          balance_ton: '0',
          uni_farming_balance: '0',
          uni_farming_rate: '0',
          uni_deposit_amount: '0',
          uni_farming_start_timestamp: null,
          uni_farming_last_update: null
        };

        res.json({
          success: true,
          data: userData
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    app.get(`${apiPrefix}/daily-bonus/status`, async (req: any, res: any) => {
      try {
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
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    app.get(`${apiPrefix}/ton-farming/info`, async (req: any, res: any) => {
      try {
        res.json({
          success: true,
          data: {
            deposit_amount: 0,
            farming_balance: 0,
            farming_rate: 0,
            is_active: false,
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

    // UNI Farming Status API
    app.get(`${apiPrefix}/uni-farming/status`, async (req: any, res: any) => {
      try {
        const { user_id } = req.query;
        
        if (!user_id) {
          return res.status(400).json({
            success: false,
            error: 'user_id parameter is required'
          });
        }

        try {
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

          const isActive = !!user.uni_farming_start_timestamp;
          const depositAmount = user.uni_deposit_amount || '0';
          const ratePerSecond = user.uni_farming_rate || '0';
          
          res.json({
            success: true,
            data: {
              isActive: isActive,
              depositAmount: depositAmount,
              ratePerSecond: ratePerSecond,
              totalRatePerSecond: ratePerSecond,
              depositCount: isActive ? 1 : 0,
              totalDepositAmount: depositAmount,
              dailyIncomeUni: (parseFloat(ratePerSecond) * 86400).toString(),
              startDate: user.uni_farming_start_timestamp,
              lastUpdate: user.uni_farming_last_update || null
            }
          });
        } catch (dbError) {
          logger.error('Database error in UNI farming status endpoint', { dbError, user_id });
          res.status(500).json({
            success: false,
            error: 'Database error occurred'
          });
        }
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

        // Sample transactions for demonstration
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
          },
          {
            id: 4,
            user_id: parseInt(user_id),
            type: 'boost_purchase',
            amount: '0.025000',
            currency: 'TON',
            status: 'completed',
            description: 'TON Boost Purchase',
            created_at: new Date(Date.now() - 10800000).toISOString(),
            updated_at: new Date(Date.now() - 10800000).toISOString()
          },
          {
            id: 5,
            user_id: parseInt(user_id),
            type: 'mission_reward',
            amount: '2.500000',
            currency: 'UNI',
            status: 'completed',
            description: 'Daily Mission Reward',
            created_at: new Date(Date.now() - 14400000).toISOString(),
            updated_at: new Date(Date.now() - 14400000).toISOString()
          }
        ];
        
        // Filter by currency if specified
        const filteredTransactions = currency && currency !== 'ALL' 
          ? sampleTransactions.filter(tx => tx.currency === currency)
          : sampleTransactions;
        
        // Apply pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const paginatedTransactions = filteredTransactions.slice(offset, offset + parseInt(limit));
        
        res.json({
          success: true,
          transactions: paginatedTransactions,
          total: filteredTransactions.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(filteredTransactions.length / parseInt(limit))
        });
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

        // Fetch active missions from database
        const activeMissions = await db.select()
          .from(missions)
          .where(eq(missions.is_active, true));

        // Format missions for UI - match the DbMission interface expected by frontend
        const formattedMissions = activeMissions.map(mission => ({
          id: mission.id,
          title: mission.title,
          description: mission.description,
          type: mission.type,
          reward_uni: mission.reward_uni, // Правильное поле для frontend
          is_active: mission.is_active
        }));

        res.json({
          success: true,
          data: formattedMissions
        });
      } catch (error: any) {
        logger.error('Error fetching active missions', { error: error.message });
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // Missions Stats API
    app.get(`${apiPrefix}/missions/stats`, async (req: any, res: any) => {
      try {
        res.json({
          success: true,
          data: {
            completed: 1,
            total: 3,
            userPoints: 5.0,
            totalAvailable: 17.5
          }
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // Port configuration
    const apiPort = config.app.port;
    
    // Static files and SPA routing
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Serve static files from dist/public
      app.use(express.static(path.join(process.cwd(), 'dist/public')));
      
      // SPA fallback - serve index.html for non-API routes
      app.get('*', (req: Request, res: Response, next: NextFunction) => {
        // Skip API routes
        if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
          return next();
        }
        
        // Fallback to index.html for SPA routing
        res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
      });
    } else {
      // Development mode - setup Vite dev server
      const { setupVite } = await import('./vite-simple.js');
      
      // Start server first, then setup Vite
      const server = app.listen(Number(apiPort), config.app.host, async () => {
        logger.info(`🚀 API сервер запущен на http://${config.app.host}:${apiPort}`);
        logger.info(`📡 API доступен: http://${config.app.host}:${apiPort}${apiPrefix}/`);
        logger.info(`🌐 Frontend: http://${config.app.host}:${apiPort}/ (Vite dev server)`);
        
        // Setup Vite after server starts
        await setupVite(app, server);
      });
      return;
    }

    // Error handlers (must be last)
    app.use(notFoundHandler);
    app.use(globalErrorHandler);
    
    // Запуск сервера
    const server = app.listen(Number(apiPort), config.app.host, () => {
      logger.info(`🚀 API сервер запущен на http://${config.app.host}:${apiPort}`);
      logger.info(`📡 API доступен: http://${config.app.host}:${apiPort}${apiPrefix}/`);
      if (process.env.NODE_ENV === 'production') {
        logger.info(`🌐 Frontend: http://${config.app.host}:${apiPort}/`);
      } else {
        logger.info(`🌐 Frontend: http://${config.app.host}:5173/ (Vite dev server)`);
      }
      
      // Инициализация мониторинга connection pool
      logger.info('🔍 Инициализация мониторинга connection pool...');
      logPoolStats(); // Первоначальный вывод статистики
      
      // Запуск автоматического мониторинга каждые 5 минут
      const poolMonitorInterval = startPoolMonitoring(5);
      logger.info('✅ Мониторинг connection pool активен (интервал: 5 минут)');
      
      // Инициализация фарминг-планировщика
      try {
        farmingScheduler.start();
        logger.info('✅ Фарминг-планировщик запущен');
      } catch (error) {
        logger.error('❌ Ошибка запуска фарминг-планировщика', { error });
      }
      
      // Graceful shutdown
      process.on('SIGTERM', () => {
        logger.info('🔄 Получен сигнал SIGTERM, завершение работы...');
        if (poolMonitorInterval) {
          clearInterval(poolMonitorInterval);
          logger.info('🔍 Мониторинг connection pool остановлен');
        }
        farmingScheduler.stop();
        logger.info('✅ Фарминг-планировщик остановлен');
        server.close(() => {
          logger.info('✅ Сервер корректно завершен');
          process.exit(0);
        });
      });
    });

    return server;
  } catch (error) {
    logger.error('Критическая ошибка запуска сервера', { error: error instanceof Error ? error.message : String(error) });
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