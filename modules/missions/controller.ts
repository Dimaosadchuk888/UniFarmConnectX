import type { Request, Response } from 'express';

export class MissionsController {
  async getActiveMissions(req: Request, res: Response) {
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
        missions = missionsResult.rows.map((mission: any) => ({
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
        missions = newMissionsResult.rows.map((mission: any) => ({
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
  }
}