import { Request, Response } from 'express';
import { TonBoostService } from '../services/tonBoostService';

/**
 * Контроллер для обеспечения совместимости между старым и новым API для TON Boost
 * Используется для совместимости между различными эндпоинтами:
 * - /api/ton-boosts/active (основной)
 * - /api/farming/boosts/active (устаревший)
 * - /api/ton-farming/active (альтернативный)
 */
export class FarmingBoostController {
  /**
   * Получает активные TON-бусты пользователя
   * Обеспечивает совместимость с эндпоинтом /api/farming/boosts/active
   */
  static async getUserActiveTonBoosts(req: Request, res: Response): Promise<any> {
    try {
      const userId = Number(req.query.user_id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Не указан или некорректный ID пользователя"
        });
      }
      
      // Используем тот же сервис, что и в TonBoostController
      const boosts = await TonBoostService.getUserActiveBoosts(userId);
      
      return res.json({ success: true, data: boosts });
    } catch (error) {
      console.error("[FarmingBoostController] Error in getUserActiveTonBoosts:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Ошибка при получении активных TON бустов"
      });
    }
  }
  
  /**
   * Получает активные TON-бусты пользователя для эндпоинта /api/ton-farming/active
   * Альтернативный эндпоинт для совместимости
   */
  static async getTonFarmingActive(req: Request, res: Response): Promise<any> {
    try {
      const userId = Number(req.query.user_id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Не указан или некорректный ID пользователя"
        });
      }
      
      // Используем тот же сервис, что и в TonBoostController
      const boosts = await TonBoostService.getUserActiveBoosts(userId);
      
      return res.json({ success: true, data: boosts });
    } catch (error) {
      console.error("[FarmingBoostController] Error in getTonFarmingActive:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Ошибка при получении активных TON бустов через альтернативный API"
      });
    }
  }
}