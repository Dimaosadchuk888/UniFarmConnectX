import { Request, Response } from 'express';
import { newUniFarmingService, databaseService } from '../services';
import { z } from 'zod';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

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
      if (isNaN(userId) || userId <= 0) {
        throw new ValidationError('ID пользователя должен быть положительным числом');
      }

      // Проверяем существование пользователя
      const userExists = await databaseService.userExists(userId);
      if (!userExists) {
        throw new NotFoundError(`Пользователь с ID=${userId} не найден`);
      }

      const farmingInfo = await newUniFarmingService.getUserFarmingInfo(userId);
      res.success(farmingInfo);
    } catch (error) {
      console.error('Ошибка в getUserFarmingInfo:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error; // Будет обработано глобальным обработчиком ошибок
      }
      
      res.error('Внутренняя ошибка сервера при получении информации о фарминге', null, 500);
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
        throw new ValidationError('Тело запроса пустое');
      }
      
      // Получение amount и user_id из тела запроса
      const { amount, user_id } = req.body;
      
      if (amount === undefined || amount === null || amount === '') {
        throw new ValidationError('Отсутствует обязательное поле amount');
      }
      
      // Валидация amount (поддержка как строкового, так и числового формата)
      let numericAmount: number;
      
      if (typeof amount === 'number') {
        console.log('Получен amount как число:', amount);
        numericAmount = amount;
      } else if (typeof amount === 'string') {
        console.log('Получен amount как строка:', amount);
        numericAmount = parseFloat(amount);
        if (isNaN(numericAmount)) {
          throw new ValidationError('Amount должен быть корректным числом');
        }
      } else {
        console.log('Ошибка: amount имеет неподдерживаемый тип:', typeof amount);
        throw new ValidationError('Amount должно быть числом или строкой');
      }
      
      // Проверяем, что amount положительное число
      if (numericAmount <= 0) {
        throw new ValidationError('Amount должен быть положительным числом');
      }
      
      // Обработка user_id (включая случай с null и undefined)
      let userId = 1; // значение по умолчанию
      
      if (user_id !== undefined && user_id !== null) {
        const userIdValue = parseInt(String(user_id));
        if (isNaN(userIdValue) || userIdValue <= 0 || userIdValue !== Number(user_id)) {
          throw new ValidationError('user_id должен быть положительным целым числом');
        }
        userId = userIdValue;
      }
      
      // Проверяем существование пользователя
      if (userId !== 1) { // Для default user_id=1 пропускаем проверку, т.к. это специальный случай
        const userExists = await databaseService.userExists(userId);
        if (!userExists) {
          throw new NotFoundError(`Пользователь с ID=${userId} не найден`);
        }
      }
      
      console.log(`Создаем депозит для user_id=${userId}, amount=${numericAmount}`);
      
      // Используем транзакционную обработку через DatabaseService
      const depositResult = await databaseService.withTransaction(async (txDb) => {
        return await newUniFarmingService.createUniFarmingDeposit(userId, numericAmount.toString());
      });
      
      console.log('Результат создания депозита:', depositResult);
      
      if (depositResult.success) {
        res.success(depositResult);
      } else {
        res.error(depositResult.message || 'Ошибка при создании депозита', null, 400);
      }
    } catch (error) {
      console.error('Ошибка в createUniFarmingDeposit:', error);
      
      // Обрабатываем ошибки валидации и Not Found непосредственно здесь, вместо передачи их наверх
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: error.message,
          errors: error.errors || null
        });
        return;
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }
      
      // Если это какая-то другая ошибка
      res.error('Внутренняя ошибка сервера при создании депозита', null, 500);
    }
  }

  /**
   * Обновляет и возвращает текущий баланс фарминга
   */
  static async calculateAndUpdateFarming(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.query.user_id);
      if (isNaN(userId) || userId <= 0) {
        throw new ValidationError('ID пользователя должен быть положительным числом');
      }

      // Проверяем существование пользователя
      const userExists = await databaseService.userExists(userId);
      if (!userExists) {
        throw new NotFoundError(`Пользователь с ID=${userId} не найден`);
      }

      // Используем транзакционную обработку
      const updateResult = await databaseService.withTransaction(async (txDb) => {
        return await newUniFarmingService.calculateAndUpdateUserFarming(userId);
      });
      
      res.success(updateResult);
    } catch (error) {
      console.error('Ошибка в calculateAndUpdateFarming:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error; // Будет обработано глобальным обработчиком ошибок
      }
      
      res.error('Внутренняя ошибка сервера при обновлении фарминга', null, 500);
    }
  }

  /**
   * Возвращает список всех активных депозитов пользователя
   * с поддержкой пагинации
   */
  static async getUserFarmingDeposits(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.query.user_id);
      if (isNaN(userId) || userId <= 0) {
        throw new ValidationError('ID пользователя должен быть положительным числом');
      }

      // Проверяем существование пользователя
      const userExists = await databaseService.userExists(userId);
      if (!userExists) {
        throw new NotFoundError(`Пользователь с ID=${userId} не найден`);
      }
      
      // Извлекаем параметры пагинации с дефолтными значениями
      const limit = Number(req.query.limit) || 20;
      const offset = Number(req.query.offset) || 0;
      
      // Валидация параметров пагинации
      if (limit <= 0 || limit > 100) {
        throw new ValidationError('Параметр limit должен быть положительным числом не более 100');
      }
      
      if (offset < 0) {
        throw new ValidationError('Параметр offset должен быть неотрицательным числом');
      }

      // Получаем депозиты (без учета пагинации, т.к. метод пока не поддерживает параметры)
      // Примечание: в будущем метод должен быть доработан для поддержки limit и offset
      const deposits = await newUniFarmingService.getUserFarmingDeposits(userId);
      
      res.success({ 
        deposits,
        pagination: {
          limit,
          offset,
          total: deposits.length // Это не совсем правильно, здесь должно быть общее кол-во записей
        }
      });
    } catch (error) {
      console.error('Ошибка в getUserFarmingDeposits:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error; // Будет обработано глобальным обработчиком ошибок
      }
      
      res.error('Внутренняя ошибка сервера при получении списка депозитов', null, 500);
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
        throw new ValidationError('Тело запроса пустое');
      }
      
      // Получение user_id из тела запроса
      const { user_id } = req.body;
      
      // Обработка user_id (включая случай с null и undefined)
      let userId = 1; // значение по умолчанию
      
      if (user_id !== undefined && user_id !== null) {
        const userIdValue = parseInt(String(user_id));
        if (isNaN(userIdValue) || userIdValue <= 0 || userIdValue !== Number(user_id)) {
          throw new ValidationError('user_id должен быть положительным целым числом');
        }
        userId = userIdValue;
      }
      
      console.log(`Информационный запрос для user_id=${userId}`);
      
      // Проверяем существование пользователя
      if (userId !== 1) { // Для default user_id=1 пропускаем проверку, т.к. это специальный случай
        const userExists = await databaseService.userExists(userId);
        if (!userExists) {
          throw new NotFoundError(`Пользователь с ID=${userId} не найден`);
        }
      }
      
      // Получаем текущую информацию о балансе фарминга
      const farmingInfo = await newUniFarmingService.getUserFarmingInfo(userId);
      
      // Возвращаем информационное сообщение и данные фарминга
      res.success({ 
        message: 'Доход от фарминга автоматически начисляется на ваш баланс UNI каждую секунду!',
        farming_info: farmingInfo
      });
    } catch (error) {
      console.error('Ошибка в harvestFarmingInfo:', error);
      
      // Обрабатываем ошибки валидации и Not Found непосредственно здесь, вместо передачи их наверх
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: error.message,
          errors: error.errors || null
        });
        return;
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }
      
      // Если это какая-то другая ошибка
      res.error('Внутренняя ошибка сервера при обработке запроса', null, 500);
    }
  }
}