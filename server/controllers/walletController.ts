import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import 'express-session';

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
  static async linkWalletAddress(req: Request, res: Response): Promise<void> {
    try {
      // Валидация входных данных с помощью Zod
      const schema = z.object({
        wallet_address: z.string().min(1, "Адрес кошелька не может быть пустым"),
        user_id: z.number().positive("ID пользователя должен быть положительным числом").optional()
      });

      const validation = schema.safeParse(req.body);
      
      if (!validation.success) {
        console.error('[WalletController] Ошибка валидации входных данных:', validation.error.format());
        res.status(400).json({
          success: false,
          message: 'Некорректные параметры запроса',
          errors: validation.error.format()
        });
        return;
      }
      
      const { wallet_address } = validation.data;
      
      // Валидация формата TON-адреса
      if (!WalletController.validateTonAddress(wallet_address)) {
        console.error(`[WalletController] Некорректный формат TON-адреса: ${wallet_address}`);
        res.status(400).json({
          success: false,
          message: 'Некорректный формат TON-адреса'
        });
        return;
      }
      
      // Получение user_id из сессии или из тела запроса
      // При необходимости можно добавить извлечение из сессии
      let userId = validation.data.user_id;
      
      if (!userId && req.session && req.session.userId) {
        userId = req.session.userId;
      }
      
      if (!userId) {
        console.error('[WalletController] Отсутствует идентификатор пользователя (user_id)');
        res.status(400).json({
          success: false,
          message: 'Отсутствует идентификатор пользователя'
        });
        return;
      }
      
      console.log(`[WalletController] Привязка адреса ${wallet_address} к пользователю ${userId}`);
      
      // Проверяем существование пользователя
      const userExists = await storage.getUserById(userId);
      if (!userExists) {
        console.error(`[WalletController] Пользователь с ID=${userId} не найден`);
        res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
        return;
      }
      
      // Проверяем, не привязан ли уже этот адрес к другому пользователю
      const existingUser = await storage.getUserByWalletAddress(wallet_address);
      if (existingUser && existingUser.id !== userId) {
        console.error(`[WalletController] Адрес ${wallet_address} уже привязан к пользователю ${existingUser.id}`);
        res.status(400).json({
          success: false,
          message: 'Этот адрес кошелька уже привязан к другому пользователю'
        });
        return;
      }
      
      // Привязываем адрес кошелька к пользователю
      // Выполняем обновление адреса и получаем обновленного пользователя
      const updatedUser = await storage.updateUserWalletAddress(userId, wallet_address);
      
      if (!updatedUser) {
        console.error(`[WalletController] Не удалось обновить адрес для пользователя ${userId}, пользователь не найден`);
        res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
        return;
      }
      
      // Для аудита проверяем, что адрес был успешно сохранен
      console.log(`[WalletController] Успешно обновлен адрес кошелька для пользователя ${userId}`);
      console.log(`[WalletController] Предыдущее значение в БД: ${updatedUser.ton_wallet_address === wallet_address ? 'null или другое' : updatedUser.ton_wallet_address}`);
      console.log(`[WalletController] Новое значение в БД: ${updatedUser.ton_wallet_address}`);
      
      // Возвращаем успешный ответ в стандартизированном формате
      res.status(200).json({
        success: true,
        data: {
          user_id: updatedUser.id,
          wallet_address: updatedUser.ton_wallet_address,
          message: 'Адрес кошелька успешно привязан к аккаунту'
        }
      });
    } catch (error) {
      console.error('[WalletController] Ошибка при привязке адреса кошелька:', error);
      res.status(500).json({
        success: false,
        message: 'Произошла ошибка при привязке адреса кошелька'
      });
    }
  }
  
  /**
   * Получает адрес кошелька пользователя
   */
  static async getUserWalletAddress(req: Request, res: Response): Promise<void> {
    try {
      // Валидация ID пользователя из запроса
      const schema = z.object({
        user_id: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val) && val > 0, {
          message: "ID пользователя должен быть положительным числом"
        }).optional()
      });
      
      const validation = schema.safeParse(req.query);
      
      if (!validation.success) {
        console.error('[WalletController] Ошибка валидации параметров запроса:', validation.error.format());
        res.status(400).json({
          success: false,
          message: 'Некорректные параметры запроса',
          errors: validation.error.format()
        });
        return;
      }
      
      // Получение userId из параметров запроса или из сессии
      let userId = validation.data.user_id;
      
      if (!userId && req.session && req.session.userId) {
        userId = req.session.userId;
      }
      
      if (!userId) {
        console.error('[WalletController] Отсутствует идентификатор пользователя (user_id)');
        res.status(400).json({
          success: false,
          message: 'Отсутствует идентификатор пользователя'
        });
        return;
      }
      
      // Получаем пользователя из базы данных
      const user = await storage.getUserById(userId);
      
      if (!user) {
        console.error(`[WalletController] Пользователь с ID=${userId} не найден`);
        res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
        return;
      }
      
      // Возвращаем успешный ответ в стандартизированном формате
      res.status(200).json({
        success: true,
        data: {
          user_id: user.id,
          wallet_address: user.ton_wallet_address || null
        }
      });
    } catch (error) {
      console.error('[WalletController] Ошибка при получении адреса кошелька:', error);
      res.status(500).json({
        success: false,
        message: 'Произошла ошибка при получении адреса кошелька'
      });
    }
  }
}