import express, { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { BoostService } from './service';

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
      console.log('[BoostController] Получение списка доступных бустов');
      
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
      console.log(`[BoostController] Получение активных бустов для пользователя ${userId}`);
      
      const activeBoosts = await this.boostService.getUserActiveBoosts(userId);

      this.sendSuccess(res, {
        active_boosts: activeBoosts,
        total: activeBoosts.length
      });
    }, 'получения активных бустов');
  }

  /**
   * Активировать буст
   */
  async activateBoost(req: Request, res: Response): Promise<void> {
    try {
      const { boostId, userId } = req.body;
      console.log(`[BoostController] Активация буста ${boostId} для пользователя ${userId}`);
      
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
      console.error('[BoostController] Ошибка активации буста:', error);
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
      
      console.log(`[BoostController] Деактивация буста ${boostId} для пользователя ${userId}`);
      
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
      console.error('[BoostController] Ошибка деактивации буста:', error);
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
      console.log(`[BoostController] Получение статистики бустов для пользователя ${userId}`);
      
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
      console.error('[BoostController] Ошибка получения статистики бустов:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения статистики бустов'
      });
    }
  }
}