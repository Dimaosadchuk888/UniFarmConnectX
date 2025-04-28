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
   * Принимает как числовые значения user_id, так и null значения
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
      
      // Получение amount и user_id из тела запроса (с проверкой)
      const { amount, user_id } = req.body;
      
      if (amount === undefined || amount === null || amount === '') {
        console.log('Ошибка: отсутствует обязательное поле amount');
        res.status(400).json({ success: false, message: 'Отсутствует обязательное поле amount' });
        return;
      }
      
      // Проверка, что amount является числом и положительным
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        console.log('Ошибка: amount должно быть положительным числом');
        res.status(400).json({ success: false, message: 'Amount должно быть положительным числом' });
        return;
      }
      
      // Если user_id отсутствует или равен null, используем значение по умолчанию = 1
      // Иначе, если user_id присутствует и не null, проверяем, что это положительное целое число
      let userId = 1; // значение по умолчанию
      
      if (user_id !== undefined && user_id !== null) {
        const userIdValue = parseInt(user_id);
        if (isNaN(userIdValue) || userIdValue <= 0 || userIdValue !== Number(user_id)) {
          console.log('Ошибка: user_id должен быть положительным целым числом');
          res.status(400).json({ success: false, message: 'user_id должен быть положительным целым числом' });
          return;
        }
        userId = userIdValue;
      }
      
      console.log(`Создаем депозит для user_id=${userId}, amount=${amount}`);
      
      const depositResult = await NewUniFarmingService.createUniFarmingDeposit(userId, amount);
      
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
   * Принимает как числовые значения user_id, так и null значения
   */
  static async harvestFarmingInfo(req: Request, res: Response): Promise<void> {
    try {
      console.log('Получен запрос POST /api/uni-farming/harvest');
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Тело запроса:', JSON.stringify(req.body));
      
      // Проверка содержимого запроса
      if (!req.body) {
        console.log('Ошибка: пустое тело запроса');
        res.status(400).json({ success: false, message: 'Тело запроса пустое' });
        return;
      }
      
      // Получение user_id из тела запроса
      const { user_id } = req.body;
      
      // Если user_id отсутствует или равен null, используем значение по умолчанию = 1
      // Иначе, если user_id присутствует и не null, проверяем, что это положительное целое число
      let userId = 1; // значение по умолчанию
      
      if (user_id !== undefined && user_id !== null) {
        const userIdValue = parseInt(user_id);
        if (isNaN(userIdValue) || userIdValue <= 0 || userIdValue !== Number(user_id)) {
          console.log('Ошибка: user_id должен быть положительным целым числом');
          res.status(400).json({ success: false, message: 'user_id должен быть положительным целым числом' });
          return;
        }
        userId = userIdValue;
      }
      
      console.log(`Информационный запрос для user_id=${userId}`);
      
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