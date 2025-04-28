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
      console.log('Получен запрос POST /api/uni-farming/deposit');
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Тело запроса:', JSON.stringify(req.body));
      
      // Проверка содержимого запроса
      if (!req.body) {
        console.log('Ошибка: пустое тело запроса');
        res.status(400).json({ success: false, message: 'Тело запроса пустое' });
        return;
      }
      
      // Валидация входных данных - amount обязательное, user_id опциональное
      const schema = z.object({
        amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
          message: 'Сумма должна быть положительным числом'
        }),
        user_id: z.number().int().positive().optional()
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        console.log('Ошибка валидации:', result.error.errors);
        res.status(400).json({ 
          success: false, 
          message: 'Некорректные данные запроса', 
          errors: result.error.errors 
        });
        return;
      }

      // Используем user_id из запроса или default=1
      const user_id = result.data.user_id || 1; 
      const { amount } = result.data;
      
      console.log(`Создаем депозит для user_id=${user_id}, amount=${amount}`);
      
      const depositResult = await NewUniFarmingService.createUniFarmingDeposit(user_id, amount);
      
      console.log('Результат создания депозита:', depositResult);
      
      if (depositResult.success) {
        res.json({ success: true, data: depositResult });
      } else {
        res.status(400).json({ success: false, message: depositResult.message });
      }
    } catch (error) {
      console.error('Ошибка в createUniFarmingDeposit:', error);
      res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
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

  /**
   * Обрабатывает информационный запрос о сборе урожая
   * В новой системе сбор не требуется, так как всё начисляется автоматически
   */
  static async harvestFarmingInfo(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        user_id: z.number().int().positive()
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, message: 'Invalid request data', errors: result.error.errors });
        return;
      }

      const { user_id } = result.data;
      
      // Просто возвращаем информационное сообщение, так как автоматическое начисление
      res.json({ 
        success: true, 
        message: 'Доход от фарминга автоматически начисляется на ваш баланс UNI каждую секунду!'
      });
    } catch (error) {
      console.error('Error in harvestFarmingInfo:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}