import { Request, Response } from 'express';
import { storage } from '../storage';

/**
 * Контроллер для работы с TON-кошельками пользователей
 */
export class WalletController {
  /**
   * Привязывает TON-адрес кошелька к пользователю
   */
  static async linkWalletAddress(req: Request, res: Response): Promise<void> {
    try {
      const { wallet_address } = req.body;
      
      if (!wallet_address) {
        res.status(400).json({
          success: false,
          message: 'Не указан адрес кошелька'
        });
        return;
      }
      
      // В реальном приложении мы бы получали user_id из сессии
      // Для демонстрации используем user_id = 1
      const userId = 1;
      
      console.log(`[WalletController] Привязка адреса ${wallet_address} к пользователю ${userId}`);
      
      // Проверяем, не привязан ли уже этот адрес к другому пользователю
      const existingUser = await storage.getUserByWalletAddress(wallet_address);
      if (existingUser && existingUser.id !== userId) {
        res.status(400).json({
          success: false,
          message: 'Этот адрес кошелька уже привязан к другому пользователю'
        });
        return;
      }
      
      // Привязываем адрес кошелька к пользователю
      const updatedUser = await storage.updateUserWalletAddress(userId, wallet_address);
      
      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Адрес кошелька успешно привязан к аккаунту',
        wallet_address: updatedUser.ton_wallet_address
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
      // В реальном приложении мы бы получали user_id из сессии
      // Для демонстрации используем user_id = 1
      const userId = 1;
      
      const user = await storage.getUserById(userId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        wallet_address: user.ton_wallet_address
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