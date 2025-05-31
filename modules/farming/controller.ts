import type { Request, Response } from 'express';

export class FarmingController {
  async getFarmingData(req: Request, res: Response) {
    let pool: any;
    try {
      // Проверяем Telegram авторизацию
      const telegramUser = (req as any).telegram?.user;
      const isValidated = (req as any).telegram?.validated;
      
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
  }
}