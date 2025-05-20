import { Request, Response } from "express";
import { tonBoostService } from "../services";
import { TonBoostPaymentMethod } from "../services/tonBoostService";
import { wrapServiceFunction } from '../db-service-wrapper';

/**
 * Контроллер для работы с TON Boost-пакетами и TON фармингом
 * Включает механизмы fallback для работы при отсутствии соединения с БД
 */
export class TonBoostController {
  /**
   * Обрабатывает входящую TON транзакцию для активации буст-пакета
   */
  static async processIncomingTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { sender_address, amount, comment, boost_id } = req.body;
      
      // Выводим полученные данные для отладки
      console.log('[TonBoostController] Входящие данные транзакции:', {
        sender_address,
        amount, 
        amount_type: typeof amount,
        comment,
        boost_id,
        boost_id_type: typeof boost_id
      });
      
      if (!sender_address || !amount) {
        return res.status(400).json({ 
          success: false, 
          message: "Не указаны обязательные параметры: sender_address, amount" 
        });
      }
      
      // Если boost_id передан, используем его напрямую вместо извлечения из комментария
      if (boost_id !== undefined) {
        // Преобразуем boost_id в число, если пришло как строка
        const boostIdNum = typeof boost_id === 'string' ? parseInt(boost_id, 10) : boost_id;
        
        // Проверяем, что boostId валидный
        if (isNaN(boostIdNum) || boostIdNum < 1) {
          return res.status(400).json({
            success: false,
            message: 'Некорректный ID буст-пакета'
          });
        }
        
        const result = await tonBoostService.processIncomingTonTransaction(
          sender_address,
          amount,
          comment || '',
          boostIdNum
        );
        return res.json(result);
      } else {
        // Если boost_id не передан, то комментарий обязателен
        if (!comment) {
          return res.status(400).json({ 
            success: false, 
            message: "Не указан комментарий или boost_id для транзакции" 
          });
        }
        
        const result = await tonBoostService.processIncomingTonTransaction(sender_address, amount, comment);
        return res.json(result);
      }
    } catch (error) {
      console.error("[TonBoostController] Error in processIncomingTransaction:", error);
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при обработке входящей транзакции" 
      });
    }
  }
  /**
   * Получает список всех доступных TON Boost-пакетов
   */
  static async getTonBoostPackages(req: Request, res: Response): Promise<void> {
    try {
      const packages = tonBoostService.getBoostPackages();
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

      const boosts = await tonBoostService.getUserActiveBoosts(userId);
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

      const result = await tonBoostService.purchaseTonBoost(userId, boostId, paymentMethodEnum);
      
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
   * с поддержкой работы при отсутствии соединения с базой данных
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

      // Заворачиваем вызов сервиса в обработчик ошибок
      const getFarmingInfoWithFallback = wrapServiceFunction(
        tonBoostService.getUserTonFarmingInfo.bind(tonBoostService), 
        async (error, userId) => {
          console.log(`[TonBoostController] Возвращаем заглушку для TON фарминга по ID: ${userId}`);
          
          // Возвращаем данные-заглушки при отсутствии соединения с БД
          return {
            is_active: false,
            ton_deposit_amount: "0",
            ton_farming_balance: "0",
            ton_farming_rate: "0",
            ton_farming_last_update: null,
            boost_deposits: [],
            has_active_boosts: false
          };
        }
      );

      const farmingInfo = await getFarmingInfoWithFallback(userId);
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
   * с поддержкой работы при отсутствии соединения с БД
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

      // Заворачиваем вызов сервиса в обработчик ошибок
      const updateFarmingWithFallback = wrapServiceFunction(
        tonBoostService.calculateAndUpdateUserTonFarming.bind(tonBoostService), 
        async (error, userId) => {
          console.log(`[TonBoostController] Возвращаем заглушку для расчета TON фарминга по ID: ${userId}`);
          
          // Возвращаем данные-заглушки при отсутствии соединения с БД
          return {
            updated: false,
            new_balance: "0",
            earned: "0",
            message: "База данных недоступна, расчет фарминга невозможен"
          };
        }
      );

      const result = await updateFarmingWithFallback(userId);
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

      const result = await tonBoostService.confirmExternalPayment(userId, transactionId);
      
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