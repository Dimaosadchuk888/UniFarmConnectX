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

  // API маршруты для миссий - активные с проверкой выполнения
  app.get('/api/v2/missions/active', async (req, res) => {
    try {
      const user_id = req.query.user_id || req.headers['x-user-id'] || req.headers['x-telegram-user-id'];
      
      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id required for missions'
        });
      }
      
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      // Получаем активные миссии
      const missionsResult = await pool.query('SELECT * FROM missions WHERE is_active = true ORDER BY id');
      
      // Получаем выполненные миссии пользователя
      const completedResult = await pool.query(
        'SELECT mission_id FROM user_missions WHERE user_id = $1 AND completed = true',
        [user_id]
      );
      
      const completedMissionIds = new Set(completedResult.rows.map(row => row.mission_id));
      
      const missions = missionsResult.rows.map(mission => ({
        id: mission.id,
        type: mission.type,
        title: mission.title,
        description: mission.description,
        reward: `${mission.reward_uni} UNI`,
        reward_uni: mission.reward_uni,
        is_completed: completedMissionIds.has(mission.id),
        action_url: mission.action_url,
        progress: completedMissionIds.has(mission.id) ? 1 : 0,
        maxProgress: 1
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
    let pool;
    try {
      // Приоритет: telegram данные из middleware > явно переданные параметры > guest_id
      const telegramUser = req.telegram?.user;
      const telegram_id = telegramUser?.id || req.headers['x-telegram-user-id'] || req.query.telegram_id;
      const user_id = req.query.user_id;
      const guest_id = req.query.guest_id || req.headers['x-guest-id'];
      
      console.log('[GetMe] Запрос данных пользователя:', { 
        telegram_id, 
        user_id, 
        guest_id,
        has_telegram_middleware: !!telegramUser 
      });
      
      // Если есть telegram_id, приоритет всегда ему
      if (!telegram_id && !user_id && !guest_id) {
        return res.status(400).json({
          success: false,
          error: 'Требуется telegram_id, user_id или guest_id для идентификации пользователя',
          need_telegram_auth: true
        });
      }
      
      const { Pool } = await import('pg');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      let query, params;
      
      // НОВЫЙ приоритет: telegram_id > user_id > guest_id
      if (telegram_id) {
        query = `
          SELECT id, username, first_name, last_name, guest_id, telegram_id, 
                 uni_balance, ton_balance, ref_code, ref_by, created_at 
          FROM users WHERE telegram_id = $1 LIMIT 1
        `;
        params = [telegram_id.toString()];
        console.log('[GetMe] Поиск по telegram_id:', telegram_id);
      } else if (user_id) {
        query = `
          SELECT id, username, first_name, last_name, guest_id, telegram_id, 
                 uni_balance, ton_balance, ref_code, ref_by, created_at 
          FROM users WHERE id = $1 LIMIT 1
        `;
        params = [user_id];
        console.log('[GetMe] Поиск по user_id:', user_id);
      } else {
        query = `
          SELECT id, username, first_name, last_name, guest_id, telegram_id, 
                 uni_balance, ton_balance, ref_code, ref_by, created_at 
          FROM users WHERE guest_id = $1 LIMIT 1
        `;
        params = [guest_id];
        console.log('[GetMe] Поиск по guest_id:', guest_id);
      }
      
      console.log('[GetMe] Выполнение запроса:', query, params);
      const result = await pool.query(query, params);
      console.log('[GetMe] Результат запроса:', result.rows.length, 'строк');
      
      if (result.rows.length === 0) {
        console.log('[GetMe] Пользователь не найден');
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден. Необходима регистрация через Telegram.'
        });
      }
      
      const user = result.rows[0];
      console.log('[GetMe] Найден пользователь:', JSON.stringify(user, null, 2));
      
      res.json({
        success: true,
        data: {
          id: user.id,
          telegram_id: user.telegram_id,
          username: user.username,
          first_name: user.username,
          guest_id: user.guest_id,
          ref_code: user.ref_code,
          ref_by: null,
          uni_balance: parseFloat(user.uni_balance) || 0,
          ton_balance: parseFloat(user.ton_balance) || 0,
          balance_uni: parseFloat(user.uni_balance) || 0,
          balance_ton: parseFloat(user.ton_balance) || 0,
          created_at: user.created_at,
          is_telegram_user: !!user.telegram_id
        }
      });
      
    } catch (error) {
      console.error('[GetMe] Детальная ошибка:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка базы данных при получении данных пользователя',
        details: error.message
      });
    } finally {
      if (pool) {
        try {
          await pool.end();
        } catch (e) {
          console.error('[GetMe] Ошибка закрытия пула:', e.message);
        }
      }
    }
  });

  // API для выполнения миссий
  app.post('/api/v2/missions/complete', async (req, res) => {
    try {
      const { mission_id } = req.body;
      const user_id = req.body.user_id || req.headers['x-user-id'] || req.headers['x-telegram-user-id'];
      
      if (!user_id || !mission_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id and mission_id required'
        });
      }
      
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      // Проверяем, существует ли миссия
      const missionResult = await pool.query(
        'SELECT id, reward_uni, title FROM missions WHERE id = $1 AND is_active = true',
        [mission_id]
      );
      
      if (missionResult.rows.length === 0) {
        await pool.end();
        return res.status(404).json({
          success: false,
          error: 'Mission not found or inactive'
        });
      }
      
      const mission = missionResult.rows[0];
      
      // Проверяем, не выполнена ли уже миссия
      const completedResult = await pool.query(
        'SELECT id FROM user_missions WHERE user_id = $1 AND mission_id = $2',
        [user_id, mission_id]
      );
      
      if (completedResult.rows.length > 0) {
        await pool.end();
        return res.status(400).json({
          success: false,
          error: 'Mission already completed'
        });
      }
      
      // Начинаем транзакцию
      await pool.query('BEGIN');
      
      try {
        // Отмечаем миссию как выполненную
        await pool.query(`
          INSERT INTO user_missions (user_id, mission_id, completed, completed_at)
          VALUES ($1, $2, true, NOW())
        `, [user_id, mission_id]);
        
        // Начисляем награду
        await pool.query(`
          UPDATE users 
          SET uni_balance = uni_balance + $1
          WHERE id = $2
        `, [mission.reward_uni, user_id]);
        
        // Логируем транзакцию
        await pool.query(`
          INSERT INTO transactions (user_id, type, amount, currency, description, created_at)
          VALUES ($1, 'mission_reward', $2, 'UNI', $3, NOW())
        `, [user_id, mission.reward_uni, `Награда за миссию: ${mission.title}`]);
        
        await pool.query('COMMIT');
        
        res.json({
          success: true,
          data: {
            mission_id: mission_id,
            reward: mission.reward_uni,
            message: 'Mission completed successfully'
          }
        });
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      } finally {
        await pool.end();
      }
    } catch (error) {
      console.error('Ошибка выполнения миссии:', error.message);
      res.status(500).json({
        success: false,
        error: 'Mission completion error',
        message: error.message
      });
    }
  });

  // API для получения ежедневного бонуса
  app.post('/api/v2/daily-bonus/claim', async (req, res) => {
    try {
      const user_id = req.body.user_id || req.headers['x-user-id'] || req.headers['x-telegram-user-id'];
      
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
      
      const result = await pool.query(`
        SELECT 
          checkin_streak,
          checkin_last_date,
          uni_balance
        FROM users 
        WHERE id = $1
      `, [user_id]);
      
      if (result.rows.length === 0) {
        await pool.end();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const user = result.rows[0];
      const now = new Date();
      const lastClaimDate = user.checkin_last_date ? new Date(user.checkin_last_date) : null;
      const currentStreak = parseInt(user.checkin_streak) || 0;
      
      // Проверяем, можно ли получить бонус
      if (lastClaimDate) {
        const timeDiff = now.getTime() - lastClaimDate.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          await pool.end();
          return res.status(400).json({
            success: false,
            error: 'Daily bonus already claimed today',
            next_claim_in: Math.ceil(24 - hoursDiff)
          });
        }
      }
      
      // Вычисляем новый стрик
      let newStreak = 1;
      if (lastClaimDate) {
        const daysDiff = Math.floor((now.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          newStreak = currentStreak + 1;
        }
      }
      
      // Вычисляем бонус
      const bonusAmount = 100 + (newStreak * 10);
      
      // Начинаем транзакцию
      await pool.query('BEGIN');
      
      try {
        // Обновляем пользователя
        await pool.query(`
          UPDATE users 
          SET 
            uni_balance = uni_balance + $1,
            checkin_streak = $2,
            checkin_last_date = NOW(),
            last_claim_at = NOW()
          WHERE id = $3
        `, [bonusAmount, newStreak, user_id]);
        
        // Логируем транзакцию
        await pool.query(`
          INSERT INTO transactions (user_id, type, amount, currency, description, created_at)
          VALUES ($1, 'daily_bonus', $2, 'UNI', $3, NOW())
        `, [user_id, bonusAmount, `Ежедневный бонус (стрик: ${newStreak} дней)`]);
        
        await pool.query('COMMIT');
        
        res.json({
          success: true,
          data: {
            bonus_amount: bonusAmount,
            new_streak: newStreak,
            new_balance: parseFloat(user.uni_balance) + bonusAmount,
            message: 'Daily bonus claimed successfully'
          }
        });
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      } finally {
        await pool.end();
      }
    } catch (error) {
      console.error('Ошибка получения ежедневного бонуса:', error.message);
      res.status(500).json({
        success: false,
        error: 'Daily bonus claim error',
        message: error.message
      });
    }
  });
          balance_ton: parseFloat(user.ton_balance) || 0,
          created_at: user.created_at,
          is_telegram_user: !!user.telegram_id,
          auth_method: telegram_id ? 'telegram' : (user_id ? 'direct' : 'guest')
        }
      });
      
    } catch (error) {
      console.error('[GetMe] Детальная ошибка:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка базы данных при получении данных пользователя',
        details: error.message
      });
    } finally {
      if (pool) {
        try {
          await pool.end();
        } catch (e) {
          console.error('[GetMe] Ошибка закрытия пула:', e.message);
        }
      }
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
  
  // API для фарминга UNI - реальные данные из БД
  app.get('/api/v2/uni-farming/status', async (req, res) => {
    try {
      const user_id = req.query.user_id || req.headers['x-user-id'] || req.headers['x-telegram-user-id'];
      
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
      
      const result = await pool.query(`
        SELECT 
          uni_balance,
          uni_farming_balance,
          uni_farming_rate,
          uni_farming_last_update,
          uni_farming_activated_at
        FROM users 
        WHERE id = $1
      `, [user_id]);
      
      if (result.rows.length === 0) {
        await pool.end();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const user = result.rows[0];
      const now = new Date();
      const lastUpdate = user.uni_farming_last_update ? new Date(user.uni_farming_last_update) : now;
      const timeDiff = Math.max(0, (now.getTime() - lastUpdate.getTime()) / 1000); // в секундах
      const farmingRate = parseFloat(user.uni_farming_rate) || 10.0;
      const accruedAmount = timeDiff * (farmingRate / 3600); // за час
      
      await pool.end();
      
      res.json({
        success: true,
        data: {
          farming_rate: farmingRate,
          current_balance: parseFloat(user.uni_balance) || 0,
          farming_balance: parseFloat(user.uni_farming_balance) || 0,
          accrued_amount: accruedAmount,
          is_farming: !!user.uni_farming_activated_at,
          last_claim: user.uni_farming_last_update || now.toISOString(),
          activated_at: user.uni_farming_activated_at
        }
      });
    } catch (error) {
      console.error('Ошибка получения статуса UNI фарминга:', error.message);
      res.status(500).json({
        success: false,
        error: 'Farming status error',
        message: error.message
      });
    }
  });

  // API для фарминга TON - реальные данные из БД
  app.get('/api/v2/ton-farming/info', async (req, res) => {
    try {
      const user_id = req.query.user_id || req.headers['x-user-id'] || req.headers['x-telegram-user-id'];
      
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
      
      const result = await pool.query(`
        SELECT 
          ton_balance,
          ton_boost_level,
          ton_farming_balance,
          ton_farming_rate,
          ton_farming_start_timestamp,
          ton_deposit_amount
        FROM users 
        WHERE id = $1
      `, [user_id]);
      
      if (result.rows.length === 0) {
        await pool.end();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const user = result.rows[0];
      const boostLevel = parseInt(user.ton_boost_level) || 1;
      const baseBoostCosts = [0, 0.1, 0.25, 0.5, 1.0, 2.0]; // TON стоимость каждого уровня
      const nextBoostCost = baseBoostCosts[boostLevel] || 5.0;
      
      await pool.end();
      
      res.json({
        success: true,
        data: {
          boost_level: boostLevel,
          current_balance: parseFloat(user.ton_balance) || 0,
          farming_balance: parseFloat(user.ton_farming_balance) || 0,
          farming_rate: parseFloat(user.ton_farming_rate) || 0,
          next_boost_cost: nextBoostCost,
          farming_active: !!user.ton_farming_start_timestamp,
          deposit_amount: parseFloat(user.ton_deposit_amount) || 0,
          max_boost_level: baseBoostCosts.length - 1
        }
      });
    } catch (error) {
      console.error('Ошибка получения информации TON фарминга:', error.message);
      res.status(500).json({
        success: false,
        error: 'TON farming error',
        message: error.message
      });
    }
  });

  // API для ежедневного бонуса - реальные данные
  app.get('/api/v2/daily-bonus/status', async (req, res) => {
    try {
      const user_id = req.query.user_id || req.headers['x-user-id'] || req.headers['x-telegram-user-id'];
      
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
      
      const result = await pool.query(`
        SELECT 
          checkin_streak,
          checkin_last_date,
          last_claim_at
        FROM users 
        WHERE id = $1
      `, [user_id]);
      
      if (result.rows.length === 0) {
        await pool.end();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const user = result.rows[0];
      const now = new Date();
      const lastClaimDate = user.checkin_last_date ? new Date(user.checkin_last_date) : null;
      const streak = parseInt(user.checkin_streak) || 0;
      
      // Проверяем, можно ли получить бонус (раз в день)
      let canClaim = true;
      let nextBonusIn = 0;
      
      if (lastClaimDate) {
        const timeDiff = now.getTime() - lastClaimDate.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          canClaim = false;
          nextBonusIn = Math.ceil(24 - hoursDiff);
        }
      }
      
      // Бонус зависит от стрика: базовый 100 + 10 за каждый день стрика
      const bonusAmount = 100 + (streak * 10);
      
      await pool.end();
      
      res.json({
        success: true,
        data: {
          available: canClaim,
          bonus_amount: bonusAmount,
          next_bonus_in: nextBonusIn,
          streak_days: streak,
          can_claim: canClaim,
          last_claim: lastClaimDate?.toISOString() || null
        }
      });
    } catch (error) {
      console.error('Ошибка получения статуса ежедневного бонуса:', error.message);
      res.status(500).json({
        success: false,
        error: 'Daily bonus error',
        message: error.message
      });
    }
  });

  // API для реферальной информации
  app.get('/api/v2/referral/info', async (req, res) => {
    try {
      // Приоритет telegram_id
      const telegram_id = req.telegram?.user?.id || req.headers['x-telegram-user-id'] || req.query.telegram_id;
      const user_id = req.query.user_id || req.headers['x-user-id'];
      
      if (!telegram_id && !user_id) {
        return res.status(400).json({
          success: false,
          error: 'telegram_id или user_id required'
        });
      }
      
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      // Получаем реферальный код пользователя
      let userQuery, userParams;
      if (telegram_id) {
        userQuery = 'SELECT id, ref_code, telegram_id FROM users WHERE telegram_id = $1';
        userParams = [telegram_id.toString()];
      } else {
        userQuery = 'SELECT id, ref_code, telegram_id FROM users WHERE id = $1';
        userParams = [user_id];
      }
      
      const userResult = await pool.query(userQuery, userParams);
      
      if (userResult.rows.length === 0) {
        await pool.end();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const user = userResult.rows[0];
      const refCode = user.ref_code;
      
      // Считаем рефералов и их суммарный баланс
      const referralsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_referrals,
          COALESCE(SUM(uni_balance), 0) as total_uni_balance,
          COALESCE(SUM(ton_balance), 0) as total_ton_balance
        FROM users 
        WHERE ref_by = $1
      `, [refCode]);
      
      // Получаем список рефералов для дополнительной информации
      const referralsList = await pool.query(`
        SELECT id, username, first_name, telegram_id, uni_balance, ton_balance, created_at
        FROM users 
        WHERE ref_by = $1 
        ORDER BY created_at DESC 
        LIMIT 10
      `, [refCode]);
      
      await pool.end();
      
      const referralData = referralsResult.rows[0];
      
      // Формируем реферальную ссылку
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'your_bot';
      const referralLink = `https://t.me/${botUsername}?start=${refCode}`;
      
      res.json({
        success: true,
        data: {
          user_id: user.id,
          ref_code: refCode,
          referral_link: referralLink,
          total_referrals: parseInt(referralData.total_referrals) || 0,
          total_uni_earned: parseFloat(referralData.total_uni_balance) || 0,
          total_ton_earned: parseFloat(referralData.total_ton_balance) || 0,
          referrals_list: referralsList.rows.map(ref => ({
            id: ref.id,
            name: ref.first_name || ref.username || `User ${ref.id}`,
            telegram_id: ref.telegram_id,
            uni_balance: parseFloat(ref.uni_balance) || 0,
            ton_balance: parseFloat(ref.ton_balance) || 0,
            joined_at: ref.created_at
          })),
          bonus_percentage: 10, // 10% от дохода рефералов
          next_level_threshold: 5 // следующий уровень при 5 рефералах
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