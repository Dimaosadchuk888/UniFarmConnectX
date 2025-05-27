/**
 * ПРОСТОЙ РАБОЧИЙ МАРШРУТ ДЛЯ МИССИЙ
 * Прямое подключение к БД без сложной архитектуры
 */

import { Router } from 'express';

const router = Router();

// Эндпоинт для активных миссий
router.get('/api/v2/missions/active', async (req, res) => {
  try {
    console.log('[SIMPLE MISSIONS] 🔍 Запрос активных миссий через прямое подключение');

    const { getSingleDbConnection } = await import('../single-db-connection');
    const { missions } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');

    const db = await getSingleDbConnection();
    console.log('[SIMPLE MISSIONS] ✅ Подключение к БД успешно');

    const activeMissions = await db
      .select()
      .from(missions)
      .where(eq(missions.is_active, true));

    // Добавляем action_url вручную, так как база возвращает только основные поля
    const withLinks = activeMissions.map((mission: any) => {
      let url = '';
      switch (mission.id) {
        case 1:
          url = 'https://t.me/UniverseGamesChat';
          break;
        case 2:
          url = 'https://t.me/UniverseGamesChannel';
          break;
        case 3:
          url = 'https://youtube.com/@universegamesyoutube';
          break;
        case 4:
          url = 'https://www.tiktok.com/@universegames.io';
          break;
        default:
          url = '';
      }

      return { ...mission, action_url: url };
    });

    console.log('[SIMPLE MISSIONS] 📋 Миссии с ссылками:', withLinks);

    res.status(200).json({
      success: true,
      data: withLinks,
      message: Найдено ${withLinks.length} активных миссий
    });

  } catch (error) {
    console.error('[SIMPLE MISSIONS] ❌ Ошибка:', error);

    res.status(500).json({
      success: false,
      error: 'Ошибка получения миссий',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Заглушка для выполненных миссий
router.get('/api/v2/user-missions', async (req, res) => {
  try {
    const userId = parseInt(req.query.user_id as string) || 1;
    console.log('[SIMPLE MISSIONS] 🔍 Запрос выполненных миссий для пользователя:', userId);

    res.status(200).json({
      success: true,
      data: [],
      message: 'Выполненные миссии (пока пусто)'
    });

  } catch (error) {
    console.error('[SIMPLE MISSIONS] ❌ Ошибка user missions:', error);

    res.status(500).json({
      success: false,
      error: 'Ошибка получения выполненных миссий'
    });
  }
});

// Ендпоінт для завершення місії
router.post('/api/v2/missions/complete', async (req, res) => {
  try {
    const { user_id, mission_id } = req.body;
    console.log('[SIMPLE MISSIONS] 🎯 Завершение миссии:', { user_id, mission_id });
    
    const { getSingleDbConnection } = await import('../single-db-connection');
    const { userMissions, users, missions } = await import('../../shared/schema');
    const { eq, and } = await import('drizzle-orm');
    
    const db = await getSingleDbConnection();
    
    // Перевіряємо чи місія не була виконана раніше
    const existingCompletion = await db
      .select()
      .from(userMissions)
      .where(and(
        eq(userMissions.user_id, user_id),
        eq(userMissions.mission_id, mission_id)
      ));
    
    if (existingCompletion.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Миссия уже выполнена'
      });
    }
    
    // Отримуємо інформацію про місію для нагороди
    const mission = await db
      .select()
      .from(missions)
      .where(eq(missions.id, mission_id));
    
    if (mission.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Миссия не найдена'
      });
    }
    
    const reward = parseFloat(mission[0].reward_uni || '0');
    
    // Записуємо виконання місії
    await db.insert(userMissions).values({
      user_id,
      mission_id,
      completed_at: new Date()
    });
    
    // Нараховуємо нагороду користувачу
    await db
      .update(users)
      .set({
        balance_uni: `(balance_uni::numeric + ${reward})::varchar`
      })
      .where(eq(users.id, user_id));
    
    console.log('[SIMPLE MISSIONS] ✅ Миссия завершена, награда:', reward);
    
    res.status(200).json({
      success: true,
      data: {
        mission_id,
        reward,
        message: `Получено ${reward} UNI!`
      },
      message: 'Миссия успешно завершена'
    });
    
  } catch (error) {
    console.error('[SIMPLE MISSIONS] ❌ Помилка завершення місії:', error);
    
    res.status(500).json({
      success: false,
      error: 'Помилка завершення місії',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;