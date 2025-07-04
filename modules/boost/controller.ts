import type { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { BoostService } from './service';
import { logger } from '../../core/logger';

export class BoostController extends BaseController {
  private boostService: BoostService;

  constructor() {
    super();
    this.boostService = new BoostService();
  }

  /**
   * Получить список доступных бустов
   */
  async getAvailableBoosts(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      logger.info('[BoostController] Получение списка доступных бустов');
      
      const boosts = await this.boostService.getAvailableBoosts();

      this.sendSuccess(res, {
        boosts,
        total: boosts.length
      });
    }, 'получения списка бустов');
  }

  /**
   * Получить активные бусты пользователя
   */
  async getUserBoosts(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      if (!this.validateParams(req, ['userId'])) {
        return this.sendError(res, 'Отсутствует параметр userId', 400);
      }

      const userId = req.params.userId;
      logger.info('[BoostController] Получение активных бустов для пользователя', { userId });
      
      const activeBoosts = await this.boostService.getUserActiveBoosts(userId);

      this.sendSuccess(res, {
        active_boosts: activeBoosts,
        total: activeBoosts.length
      });
    }, 'получения активных бустов');
  }

  /**
   * Получить статус фарминга TON Boost для дашборда
   */
  async getFarmingStatus(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const userId = req.query.user_id as string;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'user_id is required'
        });
        return;
      }
      
      logger.info('[BoostController] Получение статуса TON Boost фарминга', { userId });
      
      const farmingStatus = await this.boostService.getTonBoostFarmingStatus(userId);

      this.sendSuccess(res, farmingStatus);
    }, 'получения статуса TON Boost фарминга');
  }

  /**
   * Активировать буст
   */
  async activateBoost(req: Request, res: Response): Promise<void> {
    try {
      const { boostId, userId } = req.body;
      logger.info('[BoostController] Активация буста для пользователя', { boostId, userId });
      
      if (!boostId || !userId) {
        res.status(400).json({
          success: false,
          error: 'Не указан boostId или userId'
        });
        return;
      }

      // Здесь будет логика:
      // 1. Проверка наличия буста
      // 2. Проверка баланса пользователя
      // 3. Списание средств
      // 4. Активация буста
      
      const activatedBoost = {
        id: Date.now(),
        boost_id: boostId,
        user_id: userId,
        activated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        effect_multiplier: 1.5,
        is_active: true
      };

      res.json({
        success: true,
        data: {
          boost: activatedBoost,
          message: 'Буст успешно активирован'
        }
      });
    } catch (error) {
      logger.error('[BoostController] Ошибка активации буста', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({
        success: false,
        error: 'Ошибка активации буста'
      });
    }
  }

  /**
   * Деактивировать буст
   */
  async deactivateBoost(req: Request, res: Response): Promise<void> {
    try {
      const { boostId } = req.params;
      const { userId } = req.body;
      
      logger.info('[BoostController] Деактивация буста для пользователя', { boostId, userId });
      
      if (!boostId || !userId) {
        res.status(400).json({
          success: false,
          error: 'Не указан boostId или userId'
        });
        return;
      }

      // Здесь будет логика деактивации буста в базе данных
      
      res.json({
        success: true,
        data: {
          message: 'Буст успешно деактивирован'
        }
      });
    } catch (error) {
      logger.error('[BoostController] Ошибка деактивации буста', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({
        success: false,
        error: 'Ошибка деактивации буста'
      });
    }
  }

  /**
   * Получить статистику использования бустов
   */
  async getBoostStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;
      logger.info('[BoostController] Получение статистики бустов для пользователя', { userId });
      
      // Здесь будет логика получения статистики из базы данных
      const stats = {
        total_boosts_used: 5,
        total_spent_uni: "1000",
        total_spent_ton: "1.0",
        most_used_boost: "Speed Boost",
        total_bonus_earned: "2500"
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('[BoostController] Ошибка получения статистики бустов', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({
        success: false,
        error: 'Ошибка получения статистики бустов'
      });
    }
  }

  /**
   * Получить доступные пакеты бустов
   */
  async getPackages(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      logger.info('[BoostController] Получение доступных пакетов бустов');
      
      const packages = await this.boostService.getBoostPackages();

      this.sendSuccess(res, {
        packages,
        total: packages.length
      });
    }, 'получения пакетов бустов');
  }

  /**
   * Покупка Boost-пакета
   */
  async purchaseBoost(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { user_id, boost_id, payment_method, tx_hash } = req.body;

      logger.info('[BoostController] Начало покупки Boost-пакета', {
        user_id,
        boost_id,
        payment_method,
        has_tx_hash: !!tx_hash
      });

      // Валидация входных параметров
      if (!user_id || !boost_id || !payment_method) {
        return this.sendError(res, 'Отсутствуют обязательные параметры: user_id, boost_id, payment_method', 400);
      }

      if (!['wallet', 'ton'].includes(payment_method)) {
        return this.sendError(res, 'Недопустимый payment_method. Используйте "wallet" или "ton"', 400);
      }

      if (payment_method === 'ton' && !tx_hash) {
        return this.sendError(res, 'Для оплаты через TON требуется tx_hash', 400);
      }

      const result = await this.boostService.purchaseBoost(user_id, boost_id, payment_method, tx_hash);

      logger.info('[BoostController] Результат покупки от сервиса:', {
        success: result.success,
        message: result.message,
        hasBalanceUpdate: !!result.balanceUpdate,
        balanceUpdate: result.balanceUpdate
      });

      if (result.success) {
        this.sendSuccess(res, {
          purchase: result.purchase,
          message: result.message,
          balanceUpdate: result.balanceUpdate
        });
      } else {
        this.sendError(res, result.message, 400);
      }
    }, 'покупки Boost-пакета');
  }

  /**
   * Проверка и подтверждение внешней TON оплаты
   */
  async verifyTonPayment(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { tx_hash, user_id, boost_id } = req.body;

      logger.info('[BoostController] Начало проверки TON платежа', {
        tx_hash,
        user_id,
        boost_id
      });

      // Валидация входных параметров
      if (!tx_hash || !user_id || !boost_id) {
        return this.sendError(res, 'Отсутствуют обязательные параметры: tx_hash, user_id, boost_id', 400);
      }

      if (typeof tx_hash !== 'string' || tx_hash.length < 10) {
        return this.sendError(res, 'Невалидный tx_hash', 400);
      }

      const result = await this.boostService.verifyTonPayment(tx_hash, user_id, boost_id);

      if (result.success) {
        this.sendSuccess(res, {
          status: result.status,
          message: result.message,
          transaction_amount: result.transaction_amount,
          boost_activated: result.boost_activated
        });
      } else {
        this.sendError(res, result.message, 400);
      }
    }, 'проверки TON платежа');
  }
}