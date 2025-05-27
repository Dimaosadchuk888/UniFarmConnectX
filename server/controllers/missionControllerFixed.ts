import { Request, Response, NextFunction } from 'express';
import { missionServiceFixed } from '../services/missionServiceFixed';

/**
 * Контроллер для работы с миссиями (ИСПРАВЛЕННАЯ ВЕРСИЯ)
 */
export class MissionControllerFixed {
  /**
   * Получает все активные миссии
   */
  static async getActiveMissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('[MissionControllerFixed] 🚀 Запрос активных миссий');
      
      const activeMissions = await missionServiceFixed.getActiveMissions();
      
      console.log('[MissionControllerFixed] ✅ Возвращаем миссии:', activeMissions.length);
      
      res.status(200).json({
        success: true,
        data: activeMissions,
        message: 'Активные миссии успешно получены'
      });
    } catch (error) {
      console.error('[MissionControllerFixed] ❌ Ошибка при получении активных миссий:', error);
      
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении активных миссий',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Получает выполненные миссии пользователя
   */
  static async getUserCompletedMissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.query.user_id as string) || 1;
      console.log('[MissionControllerFixed] 🚀 Запрос выполненных миссий для пользователя:', userId);
      
      const completedMissions = await missionServiceFixed.getUserCompletedMissions(userId);
      
      console.log('[MissionControllerFixed] ✅ Возвращаем выполненные миссии:', completedMissions.length);
      
      res.status(200).json({
        success: true,
        data: completedMissions,
        message: 'Выполненные миссии успешно получены'
      });
    } catch (error) {
      console.error('[MissionControllerFixed] ❌ Ошибка при получении выполненных миссий:', error);
      
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении выполненных миссий',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Заглушка для завершения миссии
   */
  static async completeMission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: { message: 'Функция в разработке' },
        message: 'Завершение миссии временно недоступно'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Ошибка при завершении миссии'
      });
    }
  }
}