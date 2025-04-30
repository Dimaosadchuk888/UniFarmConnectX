import { Request, Response } from 'express';
import { NewUniFarmingService } from '../services/newUniFarmingService';
import { z } from 'zod';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
        res.setHeader('Content-Type', 'application/json');
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const farmingInfo = await NewUniFarmingService.getUserFarmingInfo(userId);
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json({ success: true, data: farmingInfo });
    } catch (error) {
      console.error('Error in getUserFarmingInfo:', error);
      res.setHeader('Content-Type', 'application/json');
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
        res.setHeader('Content-Type', 'application/json');
        res.status(400).json({ success: false, message: 'Тело запроса пустое' });
        return;
      }
      
      // Получение amount и user_id из тела запроса (с проверкой)
      const { amount, user_id } = req.body;
      
      if (amount === undefined || amount === null || amount === '') {
        console.log('Ошибка: отсутствует обязательное поле amount');
        res.setHeader('Content-Type', 'application/json');
        res.status(400).json({ success: false, message: 'Отсутствует обязательное поле amount' });
        return;
      }
      
      // Проверка, что amount является числом и положительным
      // Поддерживаем как строковый, так и числовой формат amount
      let stringAmount = '';
      
      if (typeof amount === 'number') {
        // Если amount передан как число, преобразуем его в строку
        console.log('Получен amount как число:', amount);
        stringAmount = amount.toString();
      } else if (typeof amount === 'string') {
        // Если amount уже строка, используем как есть
        console.log('Получен amount как строка:', amount);
        stringAmount = amount;
      } else {
        console.log('Ошибка: amount имеет неподдерживаемый тип:', typeof amount);
        res.setHeader('Content-Type', 'application/json');
        res.status(400).json({ success: false, message: 'Amount должно быть числом или строкой' });
        return;
      }
      
      // Проверяем, что amount можно преобразовать в число и оно положительное
      const amountValue = parseFloat(stringAmount);
      if (isNaN(amountValue) || amountValue <= 0) {
        console.log('Ошибка: amount должно быть положительным числом');
        res.setHeader('Content-Type', 'application/json');
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
          res.setHeader('Content-Type', 'application/json');
          res.status(400).json({ success: false, message: 'user_id должен быть положительным целым числом' });
          return;
        }
        userId = userIdValue;
      }
      
      console.log(`Создаем депозит для user_id=${userId}, amount=${stringAmount}`);
      
      // Передаем строковое значение amount в сервис
      const depositResult = await NewUniFarmingService.createUniFarmingDeposit(userId, stringAmount);
      
      console.log('Результат создания депозита:', depositResult);
      
      // Явно устанавливаем заголовок Content-Type для JSON
      res.setHeader('Content-Type', 'application/json');
      
      if (depositResult.success) {
        // Создаем правильный формат ответа
        const responseData = { 
          success: true, 
          data: depositResult 
        };
        console.log('Отправляем успешный ответ:', JSON.stringify(responseData));
        res.status(200).json(responseData);
      } else {
        const errorResponse = { 
          success: false, 
          message: depositResult.message 
        };
        console.log('Отправляем ответ с ошибкой:', JSON.stringify(errorResponse));
        res.status(400).json(errorResponse);
      }
    } catch (error) {
      console.error('Ошибка в createUniFarmingDeposit:', error);
      res.setHeader('Content-Type', 'application/json');
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
        res.setHeader('Content-Type', 'application/json');
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const updateResult = await NewUniFarmingService.calculateAndUpdateUserFarming(userId);
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json({ success: true, data: updateResult });
    } catch (error) {
      console.error('Error in calculateAndUpdateFarming:', error);
      res.setHeader('Content-Type', 'application/json');
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
        res.setHeader('Content-Type', 'application/json');
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const deposits = await NewUniFarmingService.getUserFarmingDeposits(userId);
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json({ success: true, data: { deposits } });
    } catch (error) {
      console.error('Error in getUserFarmingDeposits:', error);
      res.setHeader('Content-Type', 'application/json');
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
        res.setHeader('Content-Type', 'application/json');
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
          res.setHeader('Content-Type', 'application/json');
          res.status(400).json({ success: false, message: 'user_id должен быть положительным целым числом' });
          return;
        }
        userId = userIdValue;
      }
      
      console.log(`Информационный запрос для user_id=${userId}`);
      
      // Проверка существования пользователя в базе данных
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then(results => results[0]);
      
      if (!user) {
        console.log(`Ошибка: пользователь с ID=${userId} не найден в базе данных`);
        res.setHeader('Content-Type', 'application/json');
        res.status(404).json({ 
          success: false, 
          message: 'Пользователь не найден' 
        });
        return;
      }
      
      // Просто возвращаем информационное сообщение, так как автоматическое начисление
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json({ 
        success: true, 
        message: 'Доход от фарминга автоматически начисляется на ваш баланс UNI каждую секунду!'
      });
    } catch (error) {
      console.error('Error in harvestFarmingInfo:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}