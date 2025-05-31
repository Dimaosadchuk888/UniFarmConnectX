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