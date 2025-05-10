import { Request, Response } from 'express';
import { TonBoostService } from '../services/tonBoostService';
import { wrapServiceFunction } from '../db-service-wrapper';

/**
 * Контроллер для работы с TON фармингом с поддержкой fallback режима
 * при отсутствии соединения с базой данных
 */
export class TonBoostControllerFallback {
  /**
   * Получает информацию о TON фарминге с поддержкой работы
   * при отсутствии соединения с базой данных
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
        TonBoostService.getUserTonFarmingInfo.bind(TonBoostService), 
        async (error, userId) => {
          console.log(`[TonBoostControllerFallback] Возвращаем заглушку для TON фарминга по ID: ${userId}`);
          
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
      console.error("[TonBoostControllerFallback] Error in getUserTonFarmingInfo:", error);
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
        TonBoostService.calculateAndUpdateUserTonFarming.bind(TonBoostService), 
        async (error, userId) => {
          console.log(`[TonBoostControllerFallback] Возвращаем заглушку для расчета TON фарминга по ID: ${userId}`);
          
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
      console.error("[TonBoostControllerFallback] Error in calculateAndUpdateTonFarming:", error);
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при расчете TON фарминга"
      });
    }
  }

  /**
   * Получает активные TON буст-депозиты пользователя
   * @route GET /api/ton-farming/active?user_id=123
   */
  static async getUserActiveTonBoosts(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.query.user_id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Не указан или некорректный ID пользователя"
        });
      }

      // Заворачиваем вызов сервиса в обработчик ошибок
      const getActiveBoostsWithFallback = wrapServiceFunction(
        TonBoostService.getUserActiveBoosts.bind(TonBoostService), 
        async (error, userId) => {
          console.log(`[TonBoostControllerFallback] Возвращаем заглушку для активных TON бустов по ID: ${userId}`);
          
          // Возвращаем пустой массив при отсутствии соединения с БД
          return [];
        }
      );

      try {
        const activeBoosts = await getActiveBoostsWithFallback(userId);
        res.json({ success: true, data: activeBoosts });
      } catch (dbError) {
        console.error("[TonBoostControllerFallback] Error getting active TON boosts:", dbError);
        res.json({ success: true, data: [] });
      }
    } catch (error) {
      console.error("[TonBoostControllerFallback] Error in getUserActiveTonBoosts:", error);
      res.json({ success: true, data: [] });
    }
  }
}