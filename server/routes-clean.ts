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
    let pool;
    try {
      const user_id = req.query.user_id;
      const telegram_id = req.headers['x-telegram-user-id'] || req.query.telegram_id;
      const guest_id = req.query.guest_id || req.headers['x-guest-id'];
      
      console.log('[GetMe] Запрос данных пользователя:', { user_id, telegram_id, guest_id });
      
      if (!user_id && !telegram_id && !guest_id) {
        return res.status(400).json({
          success: false,
          error: 'Требуется user_id, telegram_id или guest_id для идентификации пользователя'
        });
      }
      
      const { Pool } = await import('pg');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      let query, params;
      
      // Приоритет: user_id > telegram_id > guest_id
      if (user_id) {
        query = `
          SELECT id, username, guest_id, telegram_id, uni_balance, ton_balance, 
                 ref_code, created_at 
          FROM users WHERE id = $1 LIMIT 1
        `;
        params = [user_id];
        console.log('[GetMe] Поиск по user_id:', user_id);
      } else if (telegram_id) {
        query = `
          SELECT id, username, guest_id, telegram_id, uni_balance, ton_balance, 
                 ref_code, created_at 
          FROM users WHERE telegram_id = $1 LIMIT 1
        `;
        params = [telegram_id];
        console.log('[GetMe] Поиск по telegram_id:', telegram_id);
      } else {
        query = `
          SELECT id, username, guest_id, telegram_id, uni_balance, ton_balance, 
                 ref_code, created_at 
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
      
    } catch (error: any) {
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
        } catch (e: any) {
          console.error('[GetMe] Ошибка закрытия пула:', e.message);
        }
      }
    }
  });

  // Простой эндпоинт для получения миссий
  app.get('/api/v2/missions/active', async (req, res) => {
    res.json({
      success: true,
      data: [
        {
          id: 1,
          title: "Ежедневная проверка",
          description: "Проверьте приложение каждый день",
          reward: 100,
          type: "daily",
          completed: false
        }
      ]
    });
  });

}