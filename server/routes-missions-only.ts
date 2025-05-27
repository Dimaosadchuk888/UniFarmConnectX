/**
 * РОБОЧІ МАРШРУТИ ТІЛЬКИ ДЛЯ МІСІЙ
 * Додаємо тільки необхідні маршрути без конфліктів
 */

import express, { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { MissionControllerFixed } from './controllers/missionControllerFixed';
import logger from './utils/logger';

/**
 * Додає тільки маршрути місій до додатку
 */
export function addMissionRoutes(app: Express): void {
  // Безпечний обробник з простою логікою
  const missionSafeHandler = (handler: any): RequestHandler => async (req, res, next) => {
    try {
      if (typeof handler === 'function') {
        await handler(req, res, next);
      } else {
        res.status(500).json({
          success: false,
          error: 'Неправильний обробник'
        });
      }
    } catch (error) {
      logger.error('[MissionRoutes] Помилка:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Помилка сервера',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  };

  // Додаємо тільки маршрути місій
  app.get('/api/v2/missions/active', missionSafeHandler(MissionControllerFixed.getActiveMissions));
  app.get('/api/v2/user-missions', missionSafeHandler(MissionControllerFixed.getUserCompletedMissions));
  app.post('/api/v2/missions/complete', missionSafeHandler(MissionControllerFixed.completeMission));
  
  logger.info('[MissionRoutes] ✅ Маршрути місій успішно додані');
}