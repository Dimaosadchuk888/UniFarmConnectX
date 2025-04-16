import { Request, Response } from 'express';
import { UniFarmingService } from '../services/uniFarmingService';
import { TransactionService } from '../services/transactionService';
import { sendSuccess, sendError, sendServerError } from '../utils/responseUtils';
import { extractUserId } from '../utils/validationUtils';
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
      const userId = extractUserId(req, 'query');
      
      if (!userId) {
        sendError(res, 'Неверный ID пользователя', 400);
        return;
      }
      
      const farmingInfo = await UniFarmingService.getUserFarmingInfo(userId);
      sendSuccess(res, farmingInfo);
    } catch (error) {
      console.error('Error getting farming info:', error);
      sendServerError(res, error);
    }
  }
  
  /**
   * Создает новый UNI фарминг-депозит
   */
  static async createUniFarmingDeposit(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        user_id: z.number(),
        amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
          message: "Сумма должна быть положительным числом"
        })
      });
      
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        sendError(res, 'Неверные данные', 400, result.error);
        return;
      }
      
      const { user_id, amount } = result.data;
      
      const depositResult = await UniFarmingService.createUniFarmingDeposit(user_id, amount);
      
      if (depositResult.success) {
        // Создаем транзакцию
        await TransactionService.createTransaction({
          user_id,
          type: 'deposit',
          currency: 'UNI',
          amount: amount,
          status: 'confirmed'
        });
      }
      
      sendSuccess(res, depositResult);
    } catch (error) {
      console.error('Error creating UNI farming deposit:', error);
      sendServerError(res, error);
    }
  }
  
  /**
   * Обновляет и возвращает текущий баланс фарминга
   */
  static async calculateAndUpdateFarming(req: Request, res: Response): Promise<void> {
    try {
      const userId = extractUserId(req, 'query');
      
      if (!userId) {
        sendError(res, 'Неверный ID пользователя', 400);
        return;
      }
      
      const updatedFarming = await UniFarmingService.calculateAndUpdateUserFarming(userId);
      
      if (!updatedFarming) {
        sendError(res, 'Фарминг не активен', 400);
        return;
      }
      
      sendSuccess(res, updatedFarming);
    } catch (error) {
      console.error('Error updating farming balance:', error);
      sendServerError(res, error);
    }
  }
  
  /**
   * Выводит накопленный баланс фарминга на основной баланс пользователя
   */
  static async harvestFarmingBalance(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        user_id: z.number()
      });
      
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        sendError(res, 'Неверные данные', 400, result.error);
        return;
      }
      
      const { user_id } = result.data;
      
      const harvestResult = await UniFarmingService.harvestFarmingBalance(user_id);
      
      if (harvestResult.success && harvestResult.harvestedAmount) {
        // Создаем транзакцию
        await TransactionService.createTransaction({
          user_id,
          type: 'farming',
          currency: 'UNI',
          amount: harvestResult.harvestedAmount,
          status: 'confirmed'
        });
      }
      
      sendSuccess(res, harvestResult);
    } catch (error) {
      console.error('Error harvesting farming balance:', error);
      sendServerError(res, error);
    }
  }
}