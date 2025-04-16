import { Request, Response } from 'express';
import { BoostService } from '../services/boostService';
import { sendSuccess, sendError, sendServerError } from '../utils/responseUtils';
import { z } from 'zod';

/**
 * Контроллер для работы с буст-пакетами
 */
export class BoostController {
  /**
   * Получает список всех доступных буст-пакетов
   */
  static async getBoostPackages(req: Request, res: Response): Promise<void> {
    try {
      const boostPackages = BoostService.getBoostPackages();
      sendSuccess(res, boostPackages);
    } catch (error) {
      console.error('Error getting boost packages:', error);
      sendServerError(res, error);
    }
  }

  /**
   * Покупает буст-пакет для пользователя
   */
  static async purchaseBoost(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        user_id: z.number(),
        boost_id: z.number()
      });

      const result = schema.safeParse(req.body);

      if (!result.success) {
        sendError(res, 'Неверные данные', 400, result.error);
        return;
      }

      const { user_id, boost_id } = result.data;

      const purchaseResult = await BoostService.purchaseBoost(user_id, boost_id);
      
      if (purchaseResult.success) {
        sendSuccess(res, purchaseResult);
      } else {
        sendError(res, purchaseResult.message, 400);
      }
    } catch (error) {
      console.error('Error purchasing boost:', error);
      sendServerError(res, error);
    }
  }
}