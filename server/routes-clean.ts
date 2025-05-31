/**
 * Чистые рабочие маршруты API для UniFarm
 */
import { Express } from 'express';

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

}