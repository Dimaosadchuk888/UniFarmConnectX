import { Request, Response } from 'express';
import { NewUniFarmingService } from '../services/newUniFarmingService';
import { z } from 'zod';

/**
 * Контроллер для работы с UNI фармингом
 */
export class UniFarmingController {
  /**
   * Получает текущую информацию о фарминге пользователя
   */
  static async getUserFarmingInfo(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.query.user_id);
      if (isNaN(userId)) {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const farmingInfo = await NewUniFarmingService.getUserFarmingInfo(userId);
      res.json({ success: true, data: farmingInfo });
    } catch (error) {
      console.error('Error in getUserFarmingInfo:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * Создает новый UNI фарминг-депозит
   */
  static async createUniFarmingDeposit(req: Request, res: Response): Promise<void> {
    try {
      // Валидация входных данных
      const schema = z.object({
        user_id: z.number().int().positive(),
        amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
          message: 'Amount must be a positive number'
        })
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, message: 'Invalid request data', errors: result.error.errors });
        return;
      }

      const { user_id, amount } = result.data;
      const depositResult = await NewUniFarmingService.createUniFarmingDeposit(user_id, amount);
      
      if (depositResult.success) {
        res.json({ success: true, data: depositResult });
      } else {
        res.status(400).json({ success: false, message: depositResult.message });
      }
    } catch (error) {
      console.error('Error in createUniFarmingDeposit:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * Обновляет и возвращает текущий баланс фарминга
   */
  static async calculateAndUpdateFarming(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.query.user_id);
      if (isNaN(userId)) {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const updateResult = await NewUniFarmingService.calculateAndUpdateUserFarming(userId);
      res.json({ success: true, data: updateResult });
    } catch (error) {
      console.error('Error in calculateAndUpdateFarming:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * Возвращает список всех активных депозитов пользователя
   */
  static async getUserFarmingDeposits(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.query.user_id);
      if (isNaN(userId)) {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const deposits = await NewUniFarmingService.getUserFarmingDeposits(userId);
      res.json({ success: true, data: { deposits } });
    } catch (error) {
      console.error('Error in getUserFarmingDeposits:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}