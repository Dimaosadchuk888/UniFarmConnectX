import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import 'express-session';
import { getUserOrThrow } from '../utils/userUtils';
import { WalletService } from '../services/walletService';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { createValidationErrorFromZod, extractUserId } from '../utils/validationUtils';

// Типизация для доступа к свойствам сессии
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    user?: {
      id: number;
      username: string;
      ref_code?: string;
      guest_id?: string;
    };
  }
}

/**
 * Контроллер для работы с TON-кошельками пользователей
 */
export class WalletController {
  /**
   * Проверяет формат адреса TON-кошелька
   * @param address Адрес кошелька для проверки
   * @returns {boolean} Результат проверки
   */
  static validateTonAddress(address: string): boolean {
    // Базовая валидация TON-адреса (UQ... или EQ... форматы)
    const tonAddressRegex = /^(?:UQ|EQ)[A-Za-z0-9_-]{46,48}$/;
    return tonAddressRegex.test(address);
  }

  /**
   * Привязывает TON-адрес кошелька к пользователю
   */
  static async linkWalletAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация входных данных с помощью Zod
      const schema = z.object({
        wallet_address: z.string().min(1, "Адрес кошелька не может быть пустым"),
        user_id: z.number().positive("ID пользователя должен быть положительным числом").optional()
      });

      const validation = schema.safeParse(req.body);
      
      if (!validation.success) {
        throw createValidationErrorFromZod('Некорректные параметры запроса', validation.error);
      }
      
      const { wallet_address } = validation.data;
      
      // Валидация формата TON-адреса
      if (!WalletController.validateTonAddress(wallet_address)) {
        throw new ValidationError('Некорректный формат TON-адреса');
      }
      
      // Получение user_id из различных источников в запросе
      const userId = extractUserId(req) || validation.data.user_id;
      
      if (!userId) {
        throw new ValidationError('Отсутствует идентификатор пользователя');
      }
      
      console.log(`[WalletController] Привязка адреса ${wallet_address} к пользователю ${userId}`);
      
      // Используем WalletService для проверки и обновления адреса кошелька
      const walletService = new WalletService();
      
      // Обновляем адрес кошелька (метод внутри проверит доступность адреса)
      const updatedWallet = await walletService.updateWalletAddress(userId, wallet_address);
      
      // Для аудита логируем результат
      console.log(`[WalletController] Успешно обновлен адрес кошелька для пользователя ${userId}`);
      console.log(`[WalletController] Новое значение в БД: ${updatedWallet.wallet_address}`);
      
      // Возвращаем успешный ответ через responseFormatter
      res.success({
        user_id: updatedWallet.user_id,
        wallet_address: updatedWallet.wallet_address,
        message: 'Адрес кошелька успешно привязан к аккаунту'
      });
    } catch (error) {
      console.error('[WalletController] Ошибка при привязке адреса кошелька:', error);
      next(error); // Передаем ошибку централизованному обработчику
    }
  }
  
  /**
   * Получает адрес кошелька пользователя
   */
  static async getUserWalletAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация ID пользователя из запроса
      const schema = z.object({
        user_id: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val) && val > 0, {
          message: "ID пользователя должен быть положительным числом"
        }).optional()
      });
      
      const validation = schema.safeParse(req.query);
      
      if (!validation.success) {
        throw createValidationErrorFromZod('Некорректные параметры запроса', validation.error);
      }
      
      // Получение userId из различных источников
      const userId = extractUserId(req);
      
      if (!userId) {
        throw new ValidationError('Отсутствует идентификатор пользователя');
      }
      
      console.log(`[WalletController] Получение адреса кошелька для пользователя ${userId}`);
      
      // Используем WalletService для получения адреса кошелька
      const walletService = new WalletService();
      const walletData = await walletService.getWalletAddress(userId);
      
      // Возвращаем успешный ответ через responseFormatter
      res.success({
        user_id: walletData.user_id,
        wallet_address: walletData.wallet_address || null
      });
    } catch (error) {
      console.error('[WalletController] Ошибка при получении адреса кошелька:', error);
      next(error); // Передаем ошибку централизованному обработчику
    }
  }
}