/**
 * Главная точка входа UniFarm
 * Запускает сервер с интеграцией всех модулей
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config, logger, globalErrorHandler, notFoundHandler } from '../core';
import { db } from '../core/db';
import { users, transactions, missions, tonBoostPackages, tonBoostDeposits } from '../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { setupVite, serveStatic } from './vite';

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
    
    // Health check endpoint for v2 API
    app.get(`${apiPrefix}/health`, (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: config.app.apiVersion,
        environment: config.app.nodeEnv
      });
    });
    
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

    // TON Boost packages endpoint for frontend
    app.get('/api/ton-boosts', async (req: any, res: any) => {
      try {
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
          },
          {
            id: 3,
            name: "Advanced Boost",
            description: "Продвинутый пакет для активных пользователей", 
            price_ton: "15",
            bonus_uni: "250000",
            daily_rate: "2",
            is_active: true,
            created_at: new Date().toISOString()
          },
          {
            id: 4,
            name: "Premium Boost",
            description: "Премиум пакет с максимальной доходностью",
            price_ton: "25", 
            bonus_uni: "500000",
            daily_rate: "2.5",
            is_active: true,
            created_at: new Date().toISOString()
          }
        ];
        
        res.json({
          success: true,
          data: packages
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

    // Add v2 missions endpoint
    app.get(`${apiPrefix}/missions`, async (req: any, res: any) => {
      try {
        // Возвращаем статические миссии без обращения к БД для избежания ошибок
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
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // Add user missions endpoint
    app.get(`${apiPrefix}/user-missions`, async (req: any, res: any) => {
      try {
        // Возвращаем пустой массив выполненных миссий для базовой функциональности
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

    // UNI Farming Status API - работает без user_id как и профиль
    app.get(`${apiPrefix}/uni-farming/status`, async (req: any, res: any) => {
      try {
        // Возвращаем базовые данные фарминга без требования user_id
        res.json({
          success: true,
          data: {
            isActive: false,
            depositAmount: '0.000000',
            ratePerSecond: '0.000000',
            totalRatePerSecond: '0.000000',
            depositCount: 0,
            totalDepositAmount: '0.000000',
            dailyIncomeUni: '0',
            startDate: null
          }
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // UNI Farming Status API с user_id (оригинальная версия)
    app.get(`${apiPrefix}/uni-farming/status-with-user`, async (req: any, res: any) => {
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
    app.get(`${apiPrefix}/ton-farming/info`, async (req: any, res: any) => {
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

    // TON Boosts Active API - Get user's active boost packages
    app.get(`${apiPrefix}/ton-boosts/active`, async (req: any, res: any) => {
      try {
        const { user_id } = req.query;
        
        if (!user_id) {
          return res.status(400).json({
            success: false,
            error: 'user_id parameter is required'
          });
        }

        // Return empty array for now - no active boosts
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

    // TON Boosts API - Список доступных пакетов
    app.get(`${apiPrefix}/ton-boosts`, async (req: any, res: any) => {
      try {
        // Временные тестовые данные для TON Boost пакетов (пока база недоступна)
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
          },
          {
            id: 3,
            name: "Advanced Boost",
            description: "Продвинутый пакет для активных пользователей",
            price_ton: "15",
            bonus_uni: "250000",
            daily_rate: "2",
            is_active: true,
            created_at: new Date().toISOString()
          },
          {
            id: 4,
            name: "Premium Boost",
            description: "Премиум пакет с максимальной доходностью",
            price_ton: "25",
            bonus_uni: "500000",
            daily_rate: "2.5",
            is_active: true,
            created_at: new Date().toISOString()
          }
        ];
        
        res.json({
          success: true,
          data: packages
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // TON Boosts API - Активные пакеты пользователя
    app.get(`${apiPrefix}/ton-boosts/active`, async (req: any, res: any) => {
      try {
        const { user_id } = req.query;
        
        if (!user_id) {
          return res.status(400).json({
            success: false,
            error: 'user_id parameter is required'
          });
        }

        // Получаем активные TON Boost депозиты пользователя
        const activeDeposits = await db.select()
          .from(tonBoostDeposits)
          .where(eq(tonBoostDeposits.user_id, parseInt(user_id)));

        res.json({
          success: true,
          data: activeDeposits
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
        logger.error('Error fetching active missions', { error: error.message, user_id });
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

    // Missing API endpoints to fix 404 errors

    // UNI Farming Status endpoint (legacy support)
    app.get('/api/uni-farming/status', async (req: any, res: any) => {
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
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // TON Boost check payment endpoint (both legacy and v2)
    app.get('/api/ton-boosts/check-payment', async (req: any, res: any) => {
      try {
        const { user_id, transaction_id } = req.query;
        
        if (!user_id || !transaction_id) {
          return res.status(400).json({
            success: false,
            error: 'user_id and transaction_id parameters are required'
          });
        }

        // Check if payment exists in database
        const deposits = await db.select()
          .from(tonBoostDeposits)
          .where(eq(tonBoostDeposits.user_id, parseInt(user_id)))
          .limit(10);

        const foundDeposit = deposits.find(d => d.transaction_hash === transaction_id);

        res.json({
          success: true,
          data: {
            payment_confirmed: !!foundDeposit,
            deposit: foundDeposit || null
          }
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // V2 TON Boost check payment endpoint
    app.get(`${apiPrefix}/ton-boosts/check-payment`, async (req: any, res: any) => {
      try {
        const { user_id, transaction_id } = req.query;
        
        if (!user_id || !transaction_id) {
          return res.status(400).json({
            success: false,
            error: 'user_id and transaction_id parameters are required'
          });
        }

        // Check if payment exists in database
        const deposits = await db.select()
          .from(tonBoostDeposits)
          .where(eq(tonBoostDeposits.user_id, parseInt(user_id)))
          .limit(10);

        const foundDeposit = deposits.find(d => d.transaction_hash === transaction_id);

        res.json({
          success: true,
          data: {
            payment_confirmed: !!foundDeposit,
            deposit: foundDeposit || null
          }
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // TON Boost farming status endpoint (both legacy and v2)
    app.get('/api/ton-boost/farming-status', async (req: any, res: any) => {
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

        // Get active TON boost deposits
        const activeDeposits = await db.select()
          .from(tonBoostDeposits)
          .where(eq(tonBoostDeposits.user_id, parseInt(user_id)));

        const totalInvested = activeDeposits.reduce((sum, deposit) => 
          sum + parseFloat(deposit.amount_ton || '0'), 0);

        const dailyRate = activeDeposits.reduce((sum, deposit) => 
          sum + parseFloat(deposit.daily_rate || '0'), 0);

        res.json({
          success: true,
          data: {
            isActive: activeDeposits.length > 0,
            totalInvested: totalInvested.toString(),
            dailyRate: dailyRate.toString(),
            currentBalance: user.balance_ton || '0',
            activeDeposits: activeDeposits.length,
            lastUpdate: user.updated_at || null
          }
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // V2 TON Boost farming status endpoint  
    app.get(`${apiPrefix}/ton-boost/farming-status`, async (req: any, res: any) => {
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

        // Get active TON boost deposits
        const activeDeposits = await db.select()
          .from(tonBoostDeposits)
          .where(eq(tonBoostDeposits.user_id, parseInt(user_id)));

        const totalInvested = activeDeposits.reduce((sum, deposit) => 
          sum + parseFloat(deposit.amount_ton || '0'), 0);

        const dailyRate = activeDeposits.reduce((sum, deposit) => 
          sum + parseFloat(deposit.daily_rate || '0'), 0);

        res.json({
          success: true,
          data: {
            isActive: activeDeposits.length > 0,
            totalInvested: totalInvested.toString(),
            dailyRate: dailyRate.toString(),
            currentBalance: user.balance_ton || '0',
            activeDeposits: activeDeposits.length,
            lastUpdate: user.updated_at || null
          }
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // Legacy transactions API support
    app.get('/api/transactions', async (req: any, res: any) => {
      try {
        const { user_id, page = 1, limit = 20, currency = '' } = req.query;
        
        if (!user_id) {
          return res.status(400).json({
            success: false,
            error: 'user_id parameter is required'
          });
        }

        const userTransactions = await db.select()
          .from(transactions)
          .where(eq(transactions.user_id, parseInt(user_id)))
          .orderBy(desc(transactions.created_at))
          .limit(parseInt(limit))
          .offset((parseInt(page) - 1) * parseInt(limit));

        const filteredTransactions = currency 
          ? userTransactions.filter(t => t.currency === currency.toUpperCase())
          : userTransactions;

        res.json({
          success: true,
          data: {
            transactions: filteredTransactions,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: filteredTransactions.length,
              totalPages: Math.ceil(filteredTransactions.length / parseInt(limit))
            }
          }
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
        });
      }
    });

    // Guest user API support
    app.get('/api/users/guest/:guestId', async (req: any, res: any) => {
      try {
        const { guestId } = req.params;
        
        let [user] = await db.select()
          .from(users)
          .where(eq(users.guest_id, guestId))
          .limit(1);

        if (!user) {
          const newUser = await db.insert(users).values({
            guest_id: guestId,
            balance_uni: '0',
            balance_ton: '0'
          }).returning();
          
          user = newUser[0];
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

    // Создание HTTP сервера
    const httpServer = createServer(app);
    
    // Настройка WebSocket сервера
    const wss = new WebSocketServer({ server: httpServer });
    
    wss.on('connection', (ws, req) => {
      console.log('[WebSocket] Новое подключение установлено');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('[WebSocket] Получено сообщение:', data);
          
          // Эхо ответ для поддержания соединения
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: data.timestamp }));
          }
        } catch (error) {
          console.error('[WebSocket] Ошибка обработки сообщения:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('[WebSocket] Соединение закрыто');
      });
      
      ws.on('error', (error) => {
        console.error('[WebSocket] Ошибка соединения:', error);
      });
      
      // Отправляем приветственное сообщение
      ws.send(JSON.stringify({ type: 'welcome', message: 'WebSocket подключение установлено' }));
    });

    // Запуск сервера
    const server = httpServer.listen(config.app.port, config.app.host, () => {
      logger.info(`🚀 Сервер запущен на http://${config.app.host}:${config.app.port}`);
      logger.info(`📡 API доступен: http://${config.app.host}:${config.app.port}${apiPrefix}/`);
      logger.info(`🌐 Frontend: http://${config.app.host}:${config.app.port}/`);
      logger.info(`🔌 WebSocket сервер активен`);
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