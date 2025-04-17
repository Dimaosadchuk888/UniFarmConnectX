import { Request, Response } from "express";
import { TonBoostService } from "../services/tonBoostService";

/**
 * Контроллер для работы с TON Boost-пакетами
 */
export class TonBoostController {
  /**
   * Получает список всех доступных TON Boost-пакетов
   */
  static async getTonBoostPackages(req: Request, res: Response): Promise<void> {
    try {
      const packages = TonBoostService.getBoostPackages();
      
      res.json({
        success: true,
        data: packages
      });
    } catch (error) {
      console.error("[TonBoostController] Error getting packages:", error);
      res.status(500).json({
        success: false,
        message: "Произошла ошибка при получении списка TON Boost-пакетов"
      });
    }
  }

  /**
   * Получает список активных TON Boost-депозитов пользователя
   */
  static async getUserTonBoosts(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.query.user_id as string);
      
      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: "Не указан ID пользователя"
        });
        return;
      }

      const boosts = await TonBoostService.getUserActiveBoosts(userId);
      
      res.json({
        success: true,
        data: boosts
      });
    } catch (error) {
      console.error("[TonBoostController] Error getting user boosts:", error);
      res.status(500).json({
        success: false,
        message: "Произошла ошибка при получении списка активных TON Boost-депозитов"
      });
    }
  }

  /**
   * Покупает TON Boost-пакет для пользователя
   */
  static async purchaseTonBoost(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, boost_id } = req.body;
      
      if (!user_id || !boost_id) {
        res.status(400).json({
          success: false,
          message: "Не указан ID пользователя или ID буст-пакета"
        });
        return;
      }

      const userId = parseInt(user_id);
      const boostId = parseInt(boost_id);
      
      if (isNaN(userId) || isNaN(boostId)) {
        res.status(400).json({
          success: false,
          message: "Некорректный ID пользователя или ID буст-пакета"
        });
        return;
      }

      const result = await TonBoostService.purchaseTonBoost(userId, boostId);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: {
            boostPackage: result.boostPackage,
            depositId: result.depositId
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error("[TonBoostController] Error purchasing boost:", error);
      res.status(500).json({
        success: false,
        message: "Произошла ошибка при покупке TON Boost-пакета"
      });
    }
  }

  /**
   * Получает информацию о TON фарминге пользователя
   */
  static async getUserTonFarmingInfo(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.query.user_id as string);
      
      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: "Не указан ID пользователя"
        });
        return;
      }

      const info = await TonBoostService.getUserTonFarmingInfo(userId);
      
      res.json({
        success: true,
        data: info
      });
    } catch (error) {
      console.error("[TonBoostController] Error getting TON farming info:", error);
      res.status(500).json({
        success: false,
        message: "Произошла ошибка при получении информации о TON фарминге"
      });
    }
  }

  /**
   * Обновляет и возвращает текущий баланс TON фарминга
   */
  static async calculateAndUpdateTonFarming(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.query.user_id as string);
      
      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: "Не указан ID пользователя"
        });
        return;
      }

      const result = await TonBoostService.calculateAndUpdateUserTonFarming(userId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("[TonBoostController] Error updating TON farming:", error);
      res.status(500).json({
        success: false,
        message: "Произошла ошибка при обновлении TON фарминга"
      });
    }
  }
}