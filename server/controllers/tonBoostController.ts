import { Request, Response } from "express";
import { TonBoostService, TonBoostPaymentMethod } from "../services/tonBoostService";

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
      res.json({ success: true, data: packages });
    } catch (error) {
      console.error("[TonBoostController] Error in getTonBoostPackages:", error);
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при получении TON Boost-пакетов"
      });
    }
  }

  /**
   * Получает список активных TON Boost-депозитов пользователя
   */
  static async getUserTonBoosts(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.query.user_id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Не указан или некорректный ID пользователя"
        });
      }

      const boosts = await TonBoostService.getUserActiveBoosts(userId);
      res.json({ success: true, data: boosts });
    } catch (error) {
      console.error("[TonBoostController] Error in getUserTonBoosts:", error);
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при получении активных TON Boost-депозитов"
      });
    }
  }

  /**
   * Покупает TON Boost-пакет для пользователя
   */
  static async purchaseTonBoost(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, boost_id, payment_method } = req.body;
      
      if (!user_id || !boost_id) {
        return res.status(400).json({ 
          success: false, 
          message: "Не указан ID пользователя или ID буст-пакета"
        });
      }

      const userId = Number(user_id);
      const boostId = Number(boost_id);
      
      if (isNaN(userId) || isNaN(boostId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Некорректный ID пользователя или ID буст-пакета"
        });
      }

      // Определяем метод оплаты (по умолчанию - внутренний баланс)
      let paymentMethodEnum = TonBoostPaymentMethod.INTERNAL_BALANCE;
      if (payment_method === 'external_wallet') {
        paymentMethodEnum = TonBoostPaymentMethod.EXTERNAL_WALLET;
      }

      const result = await TonBoostService.purchaseTonBoost(userId, boostId, paymentMethodEnum);
      
      if (result.success) {
        const responseData: any = {
          depositId: result.depositId,
          transactionId: result.transactionId,
          boostPackage: result.boostPackage,
          paymentMethod: result.paymentMethod
        };

        // Добавляем дополнительные данные для внешнего платежа
        if (result.paymentMethod === TonBoostPaymentMethod.EXTERNAL_WALLET) {
          responseData.paymentStatus = result.paymentStatus;
          responseData.paymentLink = result.paymentLink;
        }

        res.json({
          success: true,
          message: result.message,
          data: responseData
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error("[TonBoostController] Error in purchaseTonBoost:", error);
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при покупке TON Boost-пакета"
      });
    }
  }

  /**
   * Получает информацию о TON фарминге пользователя
   */
  static async getUserTonFarmingInfo(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.query.user_id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Не указан или некорректный ID пользователя"
        });
      }

      const farmingInfo = await TonBoostService.getUserTonFarmingInfo(userId);
      res.json({ success: true, data: farmingInfo });
    } catch (error) {
      console.error("[TonBoostController] Error in getUserTonFarmingInfo:", error);
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при получении информации о TON фарминге"
      });
    }
  }

  /**
   * Обновляет и возвращает текущий баланс TON фарминга
   */
  static async calculateAndUpdateTonFarming(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.query.user_id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Не указан или некорректный ID пользователя"
        });
      }

      const result = await TonBoostService.calculateAndUpdateUserTonFarming(userId);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("[TonBoostController] Error in calculateAndUpdateTonFarming:", error);
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при обновлении баланса TON фарминга"
      });
    }
  }

  /**
   * Подтверждает оплату TON буст-пакета через внешний кошелек
   */
  static async confirmExternalPayment(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, transaction_id } = req.body;
      
      if (!user_id || !transaction_id) {
        return res.status(400).json({ 
          success: false, 
          message: "Не указан ID пользователя или ID транзакции"
        });
      }

      const userId = Number(user_id);
      const transactionId = Number(transaction_id);
      
      if (isNaN(userId) || isNaN(transactionId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Некорректный ID пользователя или ID транзакции"
        });
      }

      const result = await TonBoostService.confirmExternalPayment(userId, transactionId);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: {
            depositId: result.depositId,
            transactionId: result.transactionId,
            boostPackage: result.boostPackage,
            paymentMethod: result.paymentMethod,
            paymentStatus: result.paymentStatus
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error("[TonBoostController] Error in confirmExternalPayment:", error);
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при подтверждении внешнего платежа"
      });
    }
  }
}