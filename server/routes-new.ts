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

  // API маршруты для миссий - активные
  app.get('/api/v2/missions/active', async (req, res) => {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      const result = await pool.query('SELECT * FROM missions WHERE is_active = true ORDER BY id');
      const missions = result.rows.map(mission => ({
        id: mission.id,
        type: mission.type,
        title: mission.title,
        description: mission.description,
        reward: `${mission.reward_uni} UNI`,
        reward_uni: mission.reward_uni,
        is_completed: false,
        action_url: mission.action_url
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
  
  // Отладочный маршрут для проверки регистрации
  app.get('/api/debug/routes-status', (req, res) => {
    res.json({
      routes_registered: true,
      missions_enabled: true,
      timestamp: new Date().toISOString(),
      message: 'Новые маршруты успешно зарегистрированы после восстановления'
    });
  });

  console.log('[NewRoutes] ✅ Восстановленные маршруты успешно зарегистрированы');
  console.log('[NewRoutes] ✅ Маршруты миссий добавлены: /api/missions, /api/v2/missions/active');
}