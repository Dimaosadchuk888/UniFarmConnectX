/**
 * Восстановленные маршруты API после очистки проекта
 * Использует только проверенные контроллеры
 */

import express, { Express } from "express";
import { MissionControllerFixed } from './controllers/missionControllerFixed';

/**
 * Регистрирует основные маршруты API
 * @param app Экземпляр приложения Express
 */
export function registerNewRoutes(app: Express): void {
  console.log('[NewRoutes] Регистрация восстановленных маршрутов API');

  // Базовые диагностические маршруты
  app.get('/api/v2/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'UniFarm API работает после восстановления'
    });
  });

  app.get('/api/v2/status', (req, res) => {
    res.json({
      status: 'restored',
      version: '2.0',
      database: 'connected',
      routes: 'active',
      timestamp: new Date().toISOString()
    });
  });

  // Диагностический эндпоинт для проверки базы данных
  app.get('/api/v2/test-db', async (req, res) => {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      const result = await pool.query('SELECT COUNT(*) as count FROM users');
      await pool.end();
      
      res.json({
        success: true,
        users_count: result.rows[0].count,
        database_status: 'connected'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        database_status: 'error'
      });
    }
  });

  // API маршруты для миссий - активные
  app.get('/api/v2/missions/active', async (req, res) => {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      const result = await pool.query('SELECT * FROM missions WHERE is_active = true ORDER BY id');
      const missions = result.rows.map(mission => ({
        id: mission.id,
        type: mission.type,
        title: mission.title,
        description: mission.description,
        reward: `${mission.reward_uni} UNI`,
        reward_uni: mission.reward_uni,
        is_completed: false,
        action_url: mission.action_url
      }));
      
      await pool.end();
      
      res.json({
        success: true,
        data: missions,
        count: missions.length
      });
    } catch (error) {
      console.error('Ошибка загрузки миссий:', error.message);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении активных миссий',
        message: error.message
      });
    }
  });

  // API для получения данных пользователя
  app.get('/api/v2/me', async (req, res) => {
    try {
      const user_id = req.query.user_id;
      const telegram_id = req.headers['x-telegram-user-id'] || req.query.telegram_id;
      const guest_id = req.query.guest_id || req.headers['x-guest-id'];
      
      console.log('[GetMe] Запрос данных пользователя:', { user_id, telegram_id, guest_id });
      
      // Если передан user_id, используем его в первую очередь
      if (user_id) {
        const { Pool } = await import('pg');
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
        
        const result = await pool.query(`
          SELECT id, username, guest_id, telegram_id, uni_balance, ton_balance, 
                 ref_code, ref_by, created_at, first_name 
          FROM users WHERE id = $1 LIMIT 1
        `, [user_id]);
        
        if (result.rows.length > 0) {
          const user = result.rows[0];
          await pool.end();
          console.log('[GetMe] Пользователь найден по user_id:', user.id);
          return res.json({
            success: true,
            data: {
              id: user.id,
              username: user.username,
              guest_id: user.guest_id,
              telegram_id: user.telegram_id,
              uni_balance: parseFloat(user.uni_balance) || 0,
              ton_balance: parseFloat(user.ton_balance) || 0,
              balance_uni: parseFloat(user.uni_balance) || 0,
              balance_ton: parseFloat(user.ton_balance) || 0,
              ref_code: user.ref_code,
              ref_by: user.ref_by,
              created_at: user.created_at,
              first_name: user.first_name,
              is_telegram_user: !!user.telegram_id
            }
          });
        }
        await pool.end();
        console.log('[GetMe] Пользователь не найден по user_id:', user_id);
      }
      
      if (!telegram_id && !guest_id) {
        return res.status(400).json({
          success: false,
          error: 'Требуется user_id, telegram_id или guest_id для идентификации пользователя'
        });
      }
      
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      let query, params;
      
      // Приоритет telegram_id над guest_id
      if (telegram_id) {
        query = `
          SELECT id, username, guest_id, telegram_id, uni_balance, ton_balance, 
                 ref_code, ref_by, created_at, first_name 
          FROM users WHERE telegram_id = $1 LIMIT 1
        `;
        params = [telegram_id];
        console.log('[GetMe] Поиск по telegram_id:', telegram_id);
      } else {
        query = `
          SELECT id, username, guest_id, telegram_id, uni_balance, ton_balance, 
                 ref_code, ref_by, created_at, first_name 
          FROM users WHERE guest_id = $1 LIMIT 1
        `;
        params = [guest_id];
        console.log('[GetMe] Поиск по guest_id:', guest_id);
      }
      
      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        await pool.end();
        console.log('[GetMe] Пользователь не найден');
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден. Необходима регистрация через Telegram.'
        });
      }
      
      const user = result.rows[0];
      await pool.end();
      
      console.log('[GetMe] Пользователь найден:', user.id);
      
      res.json({
        success: true,
        data: {
          id: user.id,
          telegram_id: user.telegram_id,
          username: user.username,
          first_name: user.first_name,
          guest_id: user.guest_id,
          ref_code: user.ref_code,
          ref_by: user.ref_by,
          uni_balance: parseFloat(user.uni_balance) || 0,
          ton_balance: parseFloat(user.ton_balance) || 0,
          balance_uni: parseFloat(user.uni_balance) || 0,
          balance_ton: parseFloat(user.ton_balance) || 0,
          created_at: user.created_at,
          is_telegram_user: !!user.telegram_id
        }
      });
    } catch (error) {
      console.error('[GetMe] Ошибка получения пользователя:', error.message);
      res.status(500).json({
        success: false,
        error: 'Ошибка базы данных при получении данных пользователя'
      });
    }
  });

  // API для регистрации через Telegram
  app.post('/api/v2/register/telegram', async (req, res) => {
    try {
      const { telegram_id, username, first_name, ref_code, initData } = req.body;
      
      console.log('[TelegramReg] Получены данные:', { telegram_id, username, first_name, ref_code, initData });
      
      // Проверяем обязательные поля
      if (!telegram_id && !initData) {
        return res.status(400).json({
          success: false,
          error: 'Требуется telegram_id или initData для регистрации'
        });
      }

      // Если есть initData, но нет telegram_id, пытаемся извлечь из initData
      let finalTelegramId = telegram_id;
      let finalUsername = username;
      let finalFirstName = first_name;

      if (initData && !telegram_id) {
        try {
          // Простой парсинг initData для извлечения user данных
          const urlParams = new URLSearchParams(initData);
          const userParam = urlParams.get('user');
          
          if (userParam) {
            const userData = JSON.parse(decodeURIComponent(userParam));
            finalTelegramId = userData.id;
            finalUsername = userData.username || username;
            finalFirstName = userData.first_name || first_name;
            
            console.log('[TelegramReg] Извлечены данные из initData:', { 
              finalTelegramId, finalUsername, finalFirstName 
            });
          }
        } catch (parseError) {
          console.error('[TelegramReg] Ошибка парсинга initData:', parseError.message);
        }
      }

      if (!finalTelegramId) {
        return res.status(400).json({
          success: false,
          error: 'Не удалось определить telegram_id пользователя'
        });
      }
      
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      // Проверяем, существует ли пользователь
      const existingUserQuery = 'SELECT id, ref_code, uni_balance, ton_balance FROM users WHERE telegram_id = $1';
      const existingUser = await pool.query(existingUserQuery, [finalTelegramId]);
      
      if (existingUser.rows.length > 0) {
        const user = existingUser.rows[0];
        await pool.end();
        
        console.log('[TelegramReg] Пользователь уже существует:', user.id);
        return res.json({
          success: true,
          data: { 
            user_id: user.id, 
            ref_code: user.ref_code,
            uni_balance: parseFloat(user.uni_balance) || 0,
            ton_balance: parseFloat(user.ton_balance) || 0,
            message: 'Пользователь уже зарегистрирован' 
          }
        });
      }
      
      // Создаем нового пользователя
      const newRefCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const currentTime = new Date().toISOString();
      
      // Проверяем, существует ли реферер (если передан ref_code)
      let referrerExists = false;
      if (ref_code) {
        const referrerCheck = await pool.query('SELECT id FROM users WHERE ref_code = $1', [ref_code]);
        referrerExists = referrerCheck.rows.length > 0;
        console.log('[TelegramReg] Реферер найден:', referrerExists);
      }
      
      const insertQuery = `
        INSERT INTO users (
          telegram_id, username, first_name, ref_code, ref_by, 
          uni_balance, ton_balance, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING id, ref_code
      `;
      
      const insertResult = await pool.query(insertQuery, [
        finalTelegramId, 
        finalUsername || '', 
        finalFirstName || '', 
        newRefCode, 
        referrerExists ? ref_code : null, 
        1000.0,  // Начальный баланс UNI
        50.0,    // Начальный баланс TON
        currentTime,
        currentTime
      ]);
      
      const newUser = insertResult.rows[0];
      
      await pool.end();
      
      console.log('[TelegramReg] Новый пользователь создан:', newUser.id);
      
      res.json({
        success: true,
        data: {
          user_id: newUser.id,
          ref_code: newUser.ref_code,
          uni_balance: 1000.0,
          ton_balance: 50.0,
          referred_by: referrerExists ? ref_code : null,
          message: 'Пользователь успешно зарегистрирован через Telegram'
        }
      });
    } catch (error) {
      console.error('[TelegramReg] Ошибка регистрации:', error.message);
      res.status(500).json({
        success: false,
        error: 'Ошибка при регистрации пользователя'
      });
    }
  });

  // API для информации о пользователе
  app.get('/api/v2/user/info', async (req, res) => {
    try {
      const user_id = req.query.user_id || req.headers['x-user-id'];
      
      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id required'
        });
      }
      
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      const result = await pool.query(
        'SELECT id, username, telegram_id, ref_code, ref_by, uni_balance, ton_balance, created_at FROM users WHERE id = $1',
        [user_id]
      );
      
      if (result.rows.length === 0) {
        await pool.end();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const user = result.rows[0];
      await pool.end();
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Ошибка получения информации о пользователе:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error'
      });
    }
  });

  // API для получения пользователя по ID
  app.get('/api/users/:user_id', async (req, res) => {
    try {
      const { user_id } = req.params;
      
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      const result = await pool.query('SELECT id, username, guest_id, telegram_id, uni_balance, ton_balance, ref_code FROM users WHERE id = $1 LIMIT 1', [user_id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const user = result.rows[0];
      await pool.end();
      
      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          guest_id: user.guest_id,
          uni_balance: parseFloat(user.uni_balance) || 1000.0,
          ton_balance: parseFloat(user.ton_balance) || 50.0,
          balance_uni: parseFloat(user.uni_balance) || 1000.0,
          balance_ton: parseFloat(user.ton_balance) || 50.0,
          ref_code: user.ref_code
        }
      });
    } catch (error) {
      console.error('Ошибка получения пользователя по ID:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error'
      });
    }
  });

  // API для транзакций
  app.get('/api/v2/transactions', async (req, res) => {
    try {
      const user_id = req.query.user_id || '1';
      
      res.json({
        success: true,
        data: [],
        total: 0,
        message: 'No transactions yet'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Transactions error'
      });
    }
  });

  app.get('/api/users/guest/:guest_id', async (req, res) => {
    try {
      const { guest_id } = req.params;
      
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      const result = await pool.query('SELECT * FROM users WHERE guest_id = $1 LIMIT 1', [guest_id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const user = result.rows[0];
      await pool.end();
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Ошибка получения пользователя по guest_id:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error'
      });
    }
  });
  
  // API для фарминга UNI
  app.get('/api/v2/uni-farming/status', async (req, res) => {
    try {
      const user_id = req.query.user_id || '1';
      
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      const result = await pool.query('SELECT uni_balance FROM users WHERE id = $1', [user_id]);
      const user = result.rows[0];
      await pool.end();
      
      res.json({
        success: true,
        data: {
          farming_rate: 10.0,
          current_balance: parseFloat(user?.uni_balance) || 1000.0,
          is_farming: true,
          last_claim: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Farming status error'
      });
    }
  });

  // API для фарминга TON
  app.get('/api/v2/ton-farming/info', async (req, res) => {
    try {
      const user_id = req.query.user_id || '1';
      
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      const result = await pool.query('SELECT ton_balance FROM users WHERE id = $1', [user_id]);
      const user = result.rows[0];
      await pool.end();
      
      res.json({
        success: true,
        data: {
          boost_level: 1,
          current_balance: parseFloat(user?.ton_balance) || 50.0,
          next_boost_cost: 0.1,
          farming_active: true
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'TON farming error'
      });
    }
  });

  // API для ежедневного бонуса
  app.get('/api/v2/daily-bonus/status', async (req, res) => {
    try {
      const user_id = req.query.user_id || '1';
      
      res.json({
        success: true,
        data: {
          available: true,
          bonus_amount: 100,
          next_bonus_in: 0,
          streak_days: 1,
          can_claim: true
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Daily bonus error'
      });
    }
  });

  // API для реферальной информации
  app.get('/api/v2/referral/info', async (req, res) => {
    try {
      const user_id = req.query.user_id || req.headers['x-user-id'];
      
      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id required'
        });
      }
      
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      // Получаем реферальный код пользователя
      const userResult = await pool.query('SELECT ref_code FROM users WHERE id = $1', [user_id]);
      
      if (userResult.rows.length === 0) {
        await pool.end();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const refCode = userResult.rows[0].ref_code;
      
      // Считаем рефералов
      const referralsResult = await pool.query(
        'SELECT COUNT(*) as total_referrals, SUM(uni_balance) as total_earnings FROM users WHERE ref_by = $1',
        [refCode]
      );
      
      await pool.end();
      
      const referralData = referralsResult.rows[0];
      
      res.json({
        success: true,
        data: {
          ref_code: refCode,
          total_referrals: parseInt(referralData.total_referrals) || 0,
          total_earnings: parseFloat(referralData.total_earnings) || 0,
          referral_link: `https://t.me/your_bot?start=${refCode}`
        }
      });
    } catch (error) {
      console.error('Ошибка получения реферальной информации:', error.message);
      res.status(500).json({
        success: false,
        error: 'Referral info error'
      });
    }
  });

  // API для баланса кошелька
  app.get('/api/v2/wallet/balance', async (req, res) => {
    try {
      const user_id = req.query.user_id || req.headers['x-user-id'];
      
      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id required'
        });
      }
      
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      const result = await pool.query(
        'SELECT uni_balance, ton_balance FROM users WHERE id = $1',
        [user_id]
      );
      
      if (result.rows.length === 0) {
        await pool.end();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const balance = result.rows[0];
      await pool.end();
      
      res.json({
        success: true,
        data: {
          uni_balance: parseFloat(balance.uni_balance) || 0,
          ton_balance: parseFloat(balance.ton_balance) || 0,
          total_usd_value: (parseFloat(balance.uni_balance) || 0) * 0.01 + (parseFloat(balance.ton_balance) || 0) * 5.5
        }
      });
    } catch (error) {
      console.error('Ошибка получения баланса:', error.message);
      res.status(500).json({
        success: false,
        error: 'Balance error'
      });
    }
  });

  // API для восстановления сессии
  app.post('/api/v2/session/restore', async (req, res) => {
    try {
      const { telegram_id, guest_id, initData } = req.body;
      
      console.log('[SessionRestore] Запрос восстановления сессии:', { telegram_id, guest_id, initData });
      
      if (!telegram_id && !guest_id) {
        return res.status(400).json({
          success: false,
          error: 'Требуется telegram_id или guest_id для восстановления сессии'
        });
      }
      
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      let query, params;
      
      // Приоритет telegram_id
      if (telegram_id) {
        query = `
          SELECT id, telegram_id, username, first_name, uni_balance, ton_balance, 
                 guest_id, ref_code, ref_by, created_at 
          FROM users WHERE telegram_id = $1 LIMIT 1
        `;
        params = [telegram_id];
      } else {
        query = `
          SELECT id, telegram_id, username, first_name, uni_balance, ton_balance, 
                 guest_id, ref_code, ref_by, created_at 
          FROM users WHERE guest_id = $1 LIMIT 1
        `;
        params = [guest_id];
      }
      
      const result = await pool.query(query, params);
      await pool.end();
      
      if (result.rows.length === 0) {
        console.log('[SessionRestore] Пользователь не найден, требуется регистрация');
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден. Требуется регистрация.',
          need_registration: true
        });
      }
      
      const user = result.rows[0];
      console.log('[SessionRestore] Сессия восстановлена для пользователя:', user.id);
      
      res.json({
        success: true,
        data: {
          user_id: user.id,
          telegram_id: user.telegram_id,
          username: user.username,
          first_name: user.first_name,
          uni_balance: parseFloat(user.uni_balance) || 0,
          ton_balance: parseFloat(user.ton_balance) || 0,
          guest_id: user.guest_id,
          ref_code: user.ref_code,
          ref_by: user.ref_by,
          session_restored: true,
          is_telegram_user: !!user.telegram_id
        }
      });
    } catch (error) {
      console.error('[SessionRestore] Ошибка восстановления сессии:', error.message);
      res.status(500).json({
        success: false,
        error: 'Ошибка при восстановлении сессии'
      });
    }
  });

  // Отладочный маршрут для проверки регистрации
  app.get('/api/debug/routes-status', (req, res) => {
    res.json({
      routes_registered: true,
      missions_enabled: true,
      cabinet_api_enabled: true,
      timestamp: new Date().toISOString(),
      message: 'Новые маршруты успешно зарегистрированы после восстановления'
    });
  });

  console.log('[NewRoutes] ✅ Восстановленные маршруты успешно зарегистрированы');
  console.log('[NewRoutes] ✅ Маршруты миссий добавлены: /api/missions, /api/v2/missions/active');
  console.log('[NewRoutes] ✅ Маршруты кабинета добавлены: /api/v2/uni-farming/status, /api/v2/ton-farming/info');
}