import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

/**
 * Контроллер для работы с TON-кошельками пользователей
 */
export class WalletController {
  /**
   * Привязывает TON-адрес кошелька к пользователю
   */
  static async linkWalletAddress(req: Request, res: Response): Promise<void> {
    try {
      // Валидация входных данных
      const schema = z.object({
        wallet_address: z.string().min(1, { message: "Адрес кошелька не может быть пустым" })
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        console.error("[WalletController] Ошибка валидации", validation.error);
        res.status(400).json({
          success: false,
          message: "Некорректные данные",
          errors: validation.error.format()
        });
        return;
      }
      
      const { wallet_address } = validation.data;
      
      // Тут в реальном приложении нужно получить ID пользователя из сессии/JWT
      // Для демонстрации берем ID=1
      const userId = 1;
      
      console.log(`[WalletController] Привязка кошелька: ${wallet_address} к пользователю ${userId}`);
      
      // Проверяем, не привязан ли уже этот адрес к другому пользователю
      const existingUser = await storage.getUserByWalletAddress(wallet_address);
      if (existingUser && existingUser.id !== userId) {
        console.warn(`[WalletController] Адрес кошелька ${wallet_address} уже привязан к пользователю ${existingUser.id}`);
        res.status(400).json({
          success: false,
          message: "Этот адрес кошелька уже привязан к другому аккаунту"
        });
        return;
      }
      
      // Обновляем адрес кошелька у пользователя
      const updatedUser = await storage.updateUserWalletAddress(userId, wallet_address);
      
      if (!updatedUser) {
        console.error(`[WalletController] Пользователь с ID ${userId} не найден`);
        res.status(404).json({
          success: false,
          message: "Пользователь не найден"
        });
        return;
      }
      
      console.log(`[WalletController] Успешно привязан кошелек ${wallet_address} к пользователю ${userId}`);
      
      res.status(200).json({
        success: true,
        message: "Адрес кошелька успешно привязан",
        data: {
          user_id: updatedUser.id,
          wallet_address: updatedUser.ton_wallet_address
        }
      });
      
    } catch (error) {
      console.error("[WalletController] Ошибка при привязке кошелька:", error);
      res.status(500).json({
        success: false,
        message: "Произошла ошибка при обработке запроса"
      });
    }
  }
  
  /**
   * Получает адрес кошелька пользователя
   */
  static async getUserWalletAddress(req: Request, res: Response): Promise<void> {
    try {
      // Тут в реальном приложении нужно получить ID пользователя из сессии/JWT
      // Для демонстрации берем ID=1
      const userId = 1;
      
      console.log(`[WalletController] Получение адреса кошелька для пользователя ${userId}`);
      
      // Получаем пользователя
      const user = await storage.appUsers.get(userId);
      
      if (!user) {
        console.error(`[WalletController] Пользователь с ID ${userId} не найден`);
        res.status(404).json({
          success: false,
          message: "Пользователь не найден"
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: {
          user_id: user.id,
          wallet_address: user.ton_wallet_address
        }
      });
      
    } catch (error) {
      console.error("[WalletController] Ошибка при получении адреса кошелька:", error);
      res.status(500).json({
        success: false,
        message: "Произошла ошибка при обработке запроса"
      });
    }
  }
}