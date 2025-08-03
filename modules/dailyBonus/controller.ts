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
      // Получаем userId из авторизованного пользователя или query параметров
      const userId = (req as any).user?.id || (req as any).user?.telegram_id || req.query.user_id as string || req.params.userId;
      
      logger.info('[DailyBonusController] Debug userId extraction', { 
        userFromReq: (req as any).user,
        userId: userId,
        queryUserId: req.query.user_id,
        paramsUserId: req.params.userId
      });
      
      if (!userId || userId === 'undefined' || userId === 'null') {
        return this.sendError(res, 'Отсутствует параметр user_id', 400);
      }
      
      // Для telegram_id нужно найти соответствующий user ID в базе
      let actualUserId = userId;
      
      // Если userId это telegram_id, ищем внутренний ID пользователя
      const userIdNumber = parseInt(userId);
      if (!isNaN(userIdNumber)) {
        const { supabase } = await import('../../core/supabase');
        const { data: userByTelegramId } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', userIdNumber)
          .limit(1);
        
        if (userByTelegramId && userByTelegramId[0]) {
          actualUserId = userByTelegramId[0].id;
          logger.info('[DailyBonusController] Найден пользователь по telegram_id', { telegram_id: userId, user_id: actualUserId });
        } else {
          // Если не найден по telegram_id, используем переданный ID как есть
          actualUserId = userIdNumber;
        }
      }

      logger.info('[DailyBonusController] Получение информации о ежедневном бонусе для пользователя', { userId, actualUserId });
      
      const dailyBonusInfo = await this.dailyBonusService.getDailyBonusInfo(actualUserId);

      // Адаптируем формат ответа под ожидания frontend
      const response = {
        canClaim: dailyBonusInfo.can_claim,
        streak: dailyBonusInfo.streak_days,
        bonusAmount: parseInt(dailyBonusInfo.next_bonus_amount) || 600
      };

      this.sendSuccess(res, response);
    }, 'получения информации о ежедневном бонусе');
  }

  /**
   * Забрать ежедневный бонус
   */
  async claimDailyBonus(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { user_id } = req.body;
      
      if (!user_id || user_id === 'undefined' || user_id === 'null') {
        return this.sendError(res, 'Отсутствует параметр user_id', 400);
      }

      logger.info('[DailyBonusController] Получение ежедневного бонуса для пользователя', { user_id });
      
      const claimResult = await this.dailyBonusService.claimDailyBonus(user_id.toString());

      if (claimResult.success) {
        this.sendSuccess(res, {
          success: true,
          amount: claimResult.amount,
          streak: claimResult.streak_days,
          message: `Ежедневный бонус ${claimResult.amount} UNI успешно получен!`
        });
      } else {
        this.sendError(res, claimResult.error || 'Ошибка при получении бонуса', 400);
      }
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