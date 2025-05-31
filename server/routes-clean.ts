/**
 * Чистые рабочие маршруты API для UniFarm
 */
import { Express } from 'express';
import { sql } from '@vercel/postgres';

export function registerCleanRoutes(app: Express): void {
  
  // Базовый статус API
  app.get('/api/v2/status', (req, res) => {
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        status: 'restored',
        version: '2.0',
        database: 'connected',
        routes: 'active',
        timestamp: new Date().toISOString()
      }
    });
  });

  // Основной эндпоинт для получения данных пользователя
  app.get('/api/v2/me', async (req, res) => {
    try {
      // ПРИОРИТЕТ: Только Telegram данные из middleware
      const telegramUser = req.telegram?.user;
      const isValidated = req.telegram?.validated;
      
      console.log('[GetMe] Запрос данных пользователя:', { 
        has_telegram_user: !!telegramUser,
        validated: isValidated,
        telegram_id: telegramUser?.telegram_id
      });
      
      // Проверяем наличие Telegram данных из middleware
      if (!telegramUser || !isValidated) {
        console.log('[GetMe] Отсутствуют валидные Telegram данные');
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App',
          need_telegram_auth: true,
          debug: {
            has_telegram: !!req.telegram,
            has_user: !!telegramUser,
            validated: isValidated
          }
        });
      }
      
      // Возвращаем данные пользователя из middleware
      console.log('[GetMe] Возвращаем данные пользователя из middleware:', {
        id: telegramUser.id,
        telegram_id: telegramUser.telegram_id,
        ref_code: telegramUser.ref_code
      });
      
      return res.json({
        success: true,
        data: {
          id: telegramUser.id,
          telegram_id: telegramUser.telegram_id,
          username: telegramUser.username || telegramUser.first_name,
          first_name: telegramUser.first_name,
          ref_code: telegramUser.ref_code,
          ref_by: null,
          uni_balance: telegramUser.uni_balance || 0,
          ton_balance: telegramUser.ton_balance || 0,
          balance_uni: telegramUser.uni_balance || 0,
          balance_ton: telegramUser.ton_balance || 0,
          created_at: new Date().toISOString(),
          is_telegram_user: true,
          auth_method: 'telegram'
        }
      });
      
    } catch (error: any) {
      console.error('[GetMe] Критическая ошибка:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера при обработке Telegram авторизации',
        details: error.message
      });
    }
  });

  // Диагностический эндпоинт для проверки Telegram middleware
  app.get('/api/v2/telegram/debug', (req, res) => {
    const telegramData = req.telegram;
    const headers = {
      'x-telegram-init-data': req.headers['x-telegram-init-data'],
      'x-telegram-user-id': req.headers['x-telegram-user-id'],
      'telegram-init-data': req.headers['telegram-init-data']
    };
    
    console.log('[TelegramDebug] Состояние middleware:', {
      has_telegram: !!telegramData,
      validated: telegramData?.validated,
      has_user: !!telegramData?.user,
      user_id: telegramData?.user?.id,
      telegram_id: telegramData?.user?.telegram_id
    });
    
    res.json({
      success: true,
      data: {
        middleware_active: !!telegramData,
        validated: telegramData?.validated || false,
        user_present: !!telegramData?.user,
        user_data: telegramData?.user ? {
          id: telegramData.user.id,
          telegram_id: telegramData.user.telegram_id,
          username: telegramData.user.username,
          ref_code: telegramData.user.ref_code
        } : null,
        headers_received: headers,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Эндпоинт для получения данных фарминга пользователя
  app.get('/api/v2/farming', async (req, res) => {
    let pool;
    try {
      // Проверяем Telegram авторизацию
      const telegramUser = req.telegram?.user;
      const isValidated = req.telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      const { Pool } = await import('pg');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      // Получаем данные фарминга из базы
      const farmingQuery = `
        SELECT 
          farming_rate,
          last_farming_claim,
          farming_start_time,
          total_farmed
        FROM users 
        WHERE telegram_id = $1
      `;
      
      const farmingResult = await pool.query(farmingQuery, [telegramUser.telegram_id]);
      
      let farmingData = {
        rate: '0.000000',
        accumulated: '0.000000',
        last_claim: null,
        can_claim: false,
        next_claim_available: null
      };

      if (farmingResult.rows.length > 0) {
        const user = farmingResult.rows[0];
        const now = new Date();
        const lastClaim = user.last_farming_claim ? new Date(user.last_farming_claim) : null;
        const farmingStart = user.farming_start_time ? new Date(user.farming_start_time) : now;
        
        // Расчет накопленного фарминга (базовая ставка 0.001 UNI в час)
        const baseRate = 0.001;
        const hoursElapsed = lastClaim 
          ? (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60)
          : (now.getTime() - farmingStart.getTime()) / (1000 * 60 * 60);
        
        const accumulated = Math.max(0, hoursElapsed * baseRate);
        
        farmingData = {
          rate: baseRate.toFixed(6),
          accumulated: accumulated.toFixed(6),
          last_claim: lastClaim?.toISOString() || null,
          can_claim: accumulated >= 0.001, // Минимум для клейма
          next_claim_available: lastClaim 
            ? new Date(lastClaim.getTime() + (24 * 60 * 60 * 1000)).toISOString() // 24 часа
            : null
        };
      }

      console.log('[Farming] Данные фарминга для пользователя:', {
        telegram_id: telegramUser.telegram_id,
        farming_data: farmingData
      });

      res.json({
        success: true,
        data: farmingData
      });

    } catch (error: any) {
      console.error('[Farming] Ошибка получения данных фарминга:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения данных фарминга',
        details: error.message
      });
    } finally {
      if (pool) {
        try {
          await pool.end();
        } catch (e: any) {
          console.error('[Farming] Ошибка закрытия пула:', e.message);
        }
      }
    }
  });

  // Эндпоинт для получения активных миссий пользователя
  app.get('/api/v2/missions/active', async (req, res) => {
    let pool;
    try {
      // Проверяем Telegram авторизацию
      const telegramUser = req.telegram?.user;
      const isValidated = req.telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      const { Pool } = await import('pg');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      // Получаем активные миссии и статус их выполнения пользователем
      const missionsQuery = `
        SELECT 
          m.id,
          m.title,
          m.description,
          m.reward_amount as reward,
          m.mission_type as type,
          m.is_active,
          um.completed_at,
          CASE WHEN um.id IS NOT NULL THEN true ELSE false END as completed
        FROM missions m
        LEFT JOIN user_missions um ON m.id = um.mission_id AND um.user_id = $1
        WHERE m.is_active = true
        ORDER BY m.created_at DESC
      `;
      
      const missionsResult = await pool.query(missionsQuery, [telegramUser.id]);
      
      let missions = [];
      
      if (missionsResult.rows.length > 0) {
        missions = missionsResult.rows.map(mission => ({
          id: mission.id,
          title: mission.title,
          description: mission.description,
          reward: parseFloat(mission.reward) || 0,
          type: mission.type,
          completed: mission.completed,
          completed_at: mission.completed_at
        }));
      } else {
        // Если в базе нет миссий, создаем базовые
        const defaultMissions = [
          {
            title: "Ежедневная проверка",
            description: "Проверьте приложение каждый день",
            reward_amount: 100,
            mission_type: "daily",
            is_active: true
          },
          {
            title: "Пригласить друга",
            description: "Пригласите друга через реферальную ссылку",
            reward_amount: 500,
            mission_type: "referral",
            is_active: true
          },
          {
            title: "Фарминг токенов",
            description: "Соберите 1000 UNI токенов",
            reward_amount: 200,
            mission_type: "farming",
            is_active: true
          }
        ];

        // Вставляем базовые миссии в базу
        for (const mission of defaultMissions) {
          await pool.query(`
            INSERT INTO missions (title, description, reward_amount, mission_type, is_active, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT DO NOTHING
          `, [mission.title, mission.description, mission.reward_amount, mission.mission_type, mission.is_active]);
        }

        // Перезапрашиваем миссии
        const newMissionsResult = await pool.query(missionsQuery, [telegramUser.id]);
        missions = newMissionsResult.rows.map(mission => ({
          id: mission.id,
          title: mission.title,
          description: mission.description,
          reward: parseFloat(mission.reward) || 0,
          type: mission.type,
          completed: mission.completed,
          completed_at: mission.completed_at
        }));
      }

      console.log('[Missions] Получены миссии для пользователя:', {
        telegram_id: telegramUser.telegram_id,
        missions_count: missions.length
      });

      res.json({
        success: true,
        data: missions
      });

    } catch (error: any) {
      console.error('[Missions] Ошибка получения миссий:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения активных миссий',
        details: error.message
      });
    } finally {
      if (pool) {
        try {
          await pool.end();
        } catch (e: any) {
          console.error('[Missions] Ошибка закрытия пула:', e.message);
        }
      }
    }
  });

  // Эндпоинт для получения данных кошелька пользователя
  app.get('/api/v2/wallet', async (req, res) => {
    let pool;
    try {
      // Проверяем Telegram авторизацию
      const telegramUser = req.telegram?.user;
      const isValidated = req.telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      const { Pool } = await import('pg');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      // Получаем данные кошелька из базы
      const walletQuery = `
        SELECT 
          uni_balance,
          ton_balance,
          total_earned,
          total_spent,
          created_at,
          last_transaction_date
        FROM users 
        WHERE telegram_id = $1
      `;
      
      const walletResult = await pool.query(walletQuery, [telegramUser.telegram_id]);
      
      let walletData = {
        uni_balance: 0,
        ton_balance: 0,
        total_earned: 0,
        total_spent: 0,
        transactions: []
      };

      if (walletResult.rows.length > 0) {
        const user = walletResult.rows[0];
        walletData = {
          uni_balance: parseFloat(user.uni_balance) || 0,
          ton_balance: parseFloat(user.ton_balance) || 0,
          total_earned: parseFloat(user.total_earned) || 0,
          total_spent: parseFloat(user.total_spent) || 0,
          transactions: []
        };
      }

      // Получаем последние транзакции
      const transactionsQuery = `
        SELECT 
          id,
          transaction_type,
          amount,
          currency,
          description,
          created_at,
          status
        FROM wallet_transactions 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      
      const transactionsResult = await pool.query(transactionsQuery, [telegramUser.id]);
      
      if (transactionsResult.rows.length > 0) {
        walletData.transactions = transactionsResult.rows.map(tx => ({
          id: tx.id,
          type: tx.transaction_type,
          amount: parseFloat(tx.amount),
          currency: tx.currency,
          description: tx.description,
          date: tx.created_at,
          status: tx.status
        }));
      }

      console.log('[Wallet] Данные кошелька для пользователя:', {
        telegram_id: telegramUser.telegram_id,
        uni_balance: walletData.uni_balance,
        ton_balance: walletData.ton_balance,
        transactions_count: walletData.transactions.length
      });

      res.json({
        success: true,
        data: walletData
      });

    } catch (error: any) {
      console.error('[Wallet] Ошибка получения данных кошелька:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения данных кошелька',
        details: error.message
      });
    } finally {
      if (pool) {
        try {
          await pool.end();
        } catch (e: any) {
          console.error('[Wallet] Ошибка закрытия пула:', e.message);
        }
      }
    }
  });

  // ЭТАП 4: Добавление отсутствующих критических эндпоинтов

  // Реферальная система - генерация кода
  app.post('/api/v2/users/generate-refcode', async (req, res) => {
    try {
      const telegramUser = req.telegram?.user;
      
      if (!telegramUser || !req.telegram?.validated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram'
        });
      }

      // Если у пользователя уже есть реферальный код, возвращаем его
      if (telegramUser.ref_code) {
        return res.json({
          success: true,
          data: {
            ref_code: telegramUser.ref_code,
            already_exists: true
          }
        });
      }

      // Генерируем новый уникальный код
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
      let refCode = generateCode();
      let attempts = 0;
      
      while (attempts < 10) {
        const checkQuery = 'SELECT id FROM users WHERE ref_code = $1';
        const checkResult = await pool.query(checkQuery, [refCode]);
        
        if (checkResult.rows.length === 0) break;
        
        refCode = generateCode();
        attempts++;
      }

      // Обновляем пользователя с новым кодом
      const updateQuery = 'UPDATE users SET ref_code = $1 WHERE telegram_id = $2 RETURNING ref_code';
      const updateResult = await pool.query(updateQuery, [refCode, telegramUser.telegram_id]);

      await pool.end();

      res.json({
        success: true,
        data: {
          ref_code: refCode,
          generated: true
        }
      });

    } catch (error: any) {
      console.error('[RefCode] Ошибка генерации:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка генерации реферального кода'
      });
    }
  });

  // Реферальная система - статистика
  app.get('/api/v2/referrals/stats', async (req, res) => {
    try {
      const telegramUser = req.telegram?.user;
      
      if (!telegramUser || !req.telegram?.validated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram'
        });
      }

      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      // Получаем статистику рефералов
      const statsQuery = `
        SELECT 
          COUNT(*) as total_referrals,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as month_referrals,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as week_referrals
        FROM users 
        WHERE parent_ref_code = $1
      `;

      const statsResult = await pool.query(statsQuery, [telegramUser.ref_code]);
      const stats = statsResult.rows[0] || { total_referrals: 0, month_referrals: 0, week_referrals: 0 };

      await pool.end();

      res.json({
        success: true,
        data: {
          total_referrals: parseInt(stats.total_referrals) || 0,
          month_referrals: parseInt(stats.month_referrals) || 0,
          week_referrals: parseInt(stats.week_referrals) || 0,
          ref_code: telegramUser.ref_code
        }
      });

    } catch (error: any) {
      console.error('[RefStats] Ошибка получения статистики:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения статистики рефералов'
      });
    }
  });

  // Валидация сессии
  app.post('/api/v2/session/validate', async (req, res) => {
    try {
      const telegramUser = req.telegram?.user;
      const isValid = req.telegram?.validated;

      res.json({
        success: true,
        data: {
          valid: !!isValid,
          user: telegramUser ? {
            id: telegramUser.id,
            telegram_id: telegramUser.telegram_id,
            username: telegramUser.username,
            ref_code: telegramUser.ref_code
          } : null,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('[SessionValidate] Ошибка валидации:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка валидации сессии'
      });
    }
  });

  // Получение пользователя по ID
  app.get('/api/v2/users/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (!userId || isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: 'Некорректный ID пользователя'
        });
      }

      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      const userQuery = `
        SELECT 
          id, telegram_id, username, first_name,
          ref_code, parent_ref_code,
          uni_balance, ton_balance,
          created_at
        FROM users 
        WHERE id = $1
      `;

      const userResult = await pool.query(userQuery, [userId]);
      await pool.end();

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }

      const user = userResult.rows[0];
      res.json({
        success: true,
        data: {
          id: user.id,
          telegram_id: user.telegram_id,
          username: user.username || user.first_name,
          ref_code: user.ref_code,
          parent_ref_code: user.parent_ref_code,
          uni_balance: parseFloat(user.uni_balance) || 0,
          ton_balance: parseFloat(user.ton_balance) || 0,
          created_at: user.created_at
        }
      });

    } catch (error: any) {
      console.error('[GetUser] Ошибка получения пользователя:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения данных пользователя'
      });
    }
  });

  // Завершение выполнения миссий
  app.post('/api/v2/missions/complete', async (req, res) => {
    try {
      const telegramUser = req.telegram?.user;
      const { mission_id } = req.body;
      
      if (!telegramUser || !req.telegram?.validated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram'
        });
      }

      if (!mission_id) {
        return res.status(400).json({
          success: false,
          error: 'ID миссии не указан'
        });
      }

      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      // Проверяем, не завершена ли уже миссия
      const checkQuery = `
        SELECT id FROM user_missions 
        WHERE user_id = $1 AND mission_id = $2 AND completed = true
      `;
      const checkResult = await pool.query(checkQuery, [telegramUser.id, mission_id]);

      if (checkResult.rows.length > 0) {
        await pool.end();
        return res.json({
          success: true,
          data: {
            already_completed: true,
            message: 'Миссия уже завершена'
          }
        });
      }

      // Получаем информацию о миссии
      const missionQuery = 'SELECT * FROM missions WHERE id = $1';
      const missionResult = await pool.query(missionQuery, [mission_id]);

      if (missionResult.rows.length === 0) {
        await pool.end();
        return res.status(404).json({
          success: false,
          error: 'Миссия не найдена'
        });
      }

      const mission = missionResult.rows[0];

      // Завершаем миссию
      const completeQuery = `
        INSERT INTO user_missions (user_id, mission_id, completed, completed_at)
        VALUES ($1, $2, true, NOW())
        ON CONFLICT (user_id, mission_id) 
        DO UPDATE SET completed = true, completed_at = NOW()
        RETURNING *
      `;
      
      await pool.query(completeQuery, [telegramUser.id, mission_id]);

      // Начисляем награду
      const rewardQuery = `
        UPDATE users 
        SET uni_balance = uni_balance + $1 
        WHERE id = $2
        RETURNING uni_balance
      `;
      
      const rewardResult = await pool.query(rewardQuery, [mission.reward_amount, telegramUser.id]);
      await pool.end();

      res.json({
        success: true,
        data: {
          mission_completed: true,
          reward_amount: parseFloat(mission.reward_amount),
          new_balance: parseFloat(rewardResult.rows[0].uni_balance)
        }
      });

    } catch (error: any) {
      console.error('[MissionComplete] Ошибка завершения миссии:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка завершения миссии'
      });
    }
  });

}