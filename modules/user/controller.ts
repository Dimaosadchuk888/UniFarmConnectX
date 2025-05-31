import type { Request, Response } from 'express';

export class UserController {
  async getCurrentUser(req: Request, res: Response) {
    try {
      // ПРИОРИТЕТ: Только Telegram данные из middleware
      const telegramUser = (req as any).telegram?.user;
      const isValidated = (req as any).telegram?.validated;
      
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
            has_telegram: !!(req as any).telegram,
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
  }

  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Логика обновления пользователя будет реализована
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  async generateRefCode(req: Request, res: Response) {
    try {
      const telegramUser = (req as any).telegram?.user;
      
      if (!telegramUser || !(req as any).telegram?.validated) {
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
        error: 'Ошибка генерации реферального кода',
        details: error.message
      });
    }
  }
}