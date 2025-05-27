/**
 * ПРОСТИЙ РОБОЧИЙ МАРШРУТ ДЛЯ МІСІЙ
 * Прямий доступ до БД без складної архітектури
 */

import { Router } from 'express';

const router = Router();

// Простий ендпоінт для активних місій
router.get('/api/v2/missions/active', async (req, res) => {
  try {
    console.log('[SIMPLE MISSIONS] 🔍 Запрос активных миссий через прямое подключение');
    
    // Імпортуємо підключення до БД
    const { getSingleDbConnection } = await import('../single-db-connection');
    const { missions } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    // Отримуємо підключення
    const db = await getSingleDbConnection();
    console.log('[SIMPLE MISSIONS] ✅ DB підключена');
    
    // Запит до бази
    const activeMissions = await db
      .select()
      .from(missions)
      .where(eq(missions.is_active, true));
    
    console.log('[SIMPLE MISSIONS] 📊 Знайдено місій:', activeMissions.length);
    console.log('[SIMPLE MISSIONS] 📋 Місії:', activeMissions);
    
    // Повертаємо результат
    res.status(200).json({
      success: true,
      data: activeMissions,
      message: `Знайдено ${activeMissions.length} активних місій`
    });
    
  } catch (error) {
    console.error('[SIMPLE MISSIONS] ❌ Помилка:', error);
    
    res.status(500).json({
      success: false,
      error: 'Помилка отримання місій',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Простий ендпоінт для виконаних місій користувача
router.get('/api/v2/user-missions', async (req, res) => {
  try {
    const userId = parseInt(req.query.user_id as string) || 1;
    console.log('[SIMPLE MISSIONS] 🔍 Запрос выполненных миссий для пользователя:', userId);
    
    // Поки повертаємо пустий масив
    res.status(200).json({
      success: true,
      data: [],
      message: 'Выполненные миссии (пока пустой список)'
    });
    
  } catch (error) {
    console.error('[SIMPLE MISSIONS] ❌ Помилка user missions:', error);
    
    res.status(500).json({
      success: false,
      error: 'Помилка отримання виконаних місій'
    });
  }
});

export default router;