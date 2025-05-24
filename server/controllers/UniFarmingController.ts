/**
 * UniFarmingController - контроллер для управления UNI фармингом
 * Обрабатывает запросы на получение статуса и управление UNI фармингом
 */

import { Request, Response } from 'express';
import logger from '../utils/logger';

export class UniFarmingController {
  /**
   * Получить статус UNI фарминга для пользователя
   * GET /api/uni-farming/status
   * GET /api/v2/uni-farming/status
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.user_id;
      
      // Валидация user_id
      if (!userId) {
        logger.warn('[UniFarming] Запрос без user_id');
        res.status(400).json({
          success: false,
          error: 'user_id is required'
        });
        return;
      }

      logger.info(`[UniFarming] Запрос статуса для пользователя ${userId}`);

      // Возвращаем базовую структуру для UNI фарминга
      const farmingStatus = {
        isActive: false,
        depositAmount: '0',
        ratePerSecond: '0',
        depositCount: 0,
        totalDepositAmount: '0',
        totalRatePerSecond: '0',
        dailyIncomeUni: '0',
        startDate: null,
        uni_farming_start_timestamp: null
      };

      res.json({
        success: true,
        data: farmingStatus
      });

    } catch (error) {
      logger.error('[UniFarming] Ошибка при получении статуса:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export default UniFarmingController;