import type { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { DailyBonusService } from './service';
import { logger } from '../../core/logger';

export class DailyBonusController extends BaseController {
  private dailyBonusService: DailyBonusService;

  constructor() {
    super();
    this.dailyBonusService = new DailyBonusService();
  }

  /**
   * Получить информацию о ежедневном бонусе пользователя
   */
  async getDailyBonusInfo(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      if (!this.validateParams(req, ['userId'])) {
        return this.sendError(res, 'Отсутствует параметр userId', 400);
      }

      const userId = req.params.userId;
      logger.info('[DailyBonusController] Получение информации о ежедневном бонусе для пользователя', { userId });
      
      const dailyBonusInfo = await this.dailyBonusService.getDailyBonusInfo(userId);

      this.sendSuccess(res, dailyBonusInfo);
    }, 'получения информации о ежедневном бонусе');
  }

  /**
   * Забрать ежедневный бонус
   */
  async claimDailyBonus(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { userId } = req.body;
      logger.info('[DailyBonusController] Получение ежедневного бонуса для пользователя', { userId });
      
      this.validateRequiredFields(req.body, ['userId']);

      // Здесь будет логика:
      // 1. Проверка возможности получения бонуса
      // 2. Расчет суммы бонуса с учетом стрика
      // 3. Начисление бонуса на баланс
      // 4. Обновление статистики стрика
      
      const claimResult = {
        claimed: true,
        bonus_amount: "130", // 100 * 1.3 (streak multiplier)
        new_streak: 4,
        next_claim_available: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        streak_bonus_percentage: 30
      };

      this.sendSuccess(res, {
        ...claimResult,
        message: `Ежедневный бонус ${claimResult.bonus_amount} UNI успешно получен!`
      });
    }, 'получения ежедневного бонуса');
  }

  /**
   * Получить календарь ежедневных бонусов
   */
  async getDailyBonusCalendar(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;
      const month = req.query.month as string || new Date().getMonth().toString();
      const year = req.query.year as string || new Date().getFullYear().toString();
      
      logger.info('[DailyBonusController] Получение календаря бонусов для пользователя', { userId, month, year });
      
      // Здесь будет логика получения календаря из базы данных
      const calendar = {
        month: parseInt(month),
        year: parseInt(year),
        days: [
          { date: "2025-05-01", claimed: true, amount: "100" },
          { date: "2025-05-02", claimed: true, amount: "110" },
          { date: "2025-05-03", claimed: true, amount: "120" },
          { date: "2025-05-04", claimed: false, amount: "130" }
        ],
        total_claimed_this_month: "330",
        days_claimed: 3,
        current_streak: 3
      };

      res.json({
        success: true,
        data: calendar
      });
    } catch (error) {
      logger.error('[DailyBonusController] Ошибка получения календаря бонусов', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({
        success: false,
        error: 'Ошибка получения календаря бонусов'
      });
    }
  }

  /**
   * Получить статистику ежедневных бонусов
   */
  async getDailyBonusStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;
      logger.info('[DailyBonusController] Получение статистики ежедневных бонусов для пользователя', { userId });
      
      // Здесь будет логика получения статистики из базы данных
      const stats = {
        total_days_claimed: 25,
        total_amount_claimed: "3750",
        current_streak: 3,
        max_streak_achieved: 12,
        average_daily_bonus: "150",
        this_month_claimed: "850",
        this_week_claimed: "420",
        streak_bonuses_earned: "500"
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('[DailyBonusController] Ошибка получения статистики бонусов', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({
        success: false,
        error: 'Ошибка получения статистики бонусов'
      });
    }
  }

  /**
   * Проверить доступность ежедневного бонуса
   */
  async checkDailyBonusAvailability(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;
      logger.info('[DailyBonusController] Проверка доступности ежедневного бонуса для пользователя', { userId });
      
      // Здесь будет логика проверки в базе данных
      const availability = {
        can_claim: true,
        time_until_next_claim: 0,
        next_claim_time: new Date().toISOString(),
        current_bonus_amount: "130",
        streak_multiplier: 1.3
      };

      res.json({
        success: true,
        data: availability
      });
    } catch (error) {
      logger.error('[DailyBonusController] Ошибка проверки доступности бонуса', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({
        success: false,
        error: 'Ошибка проверки доступности бонуса'
      });
    }
  }
}