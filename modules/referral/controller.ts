import type { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { ReferralService } from './service';
import { logger } from '../../core/logger';

export class ReferralController extends BaseController {
  private referralService: ReferralService;

  constructor() {
    super();
    this.referralService = new ReferralService();
  }

  /**
   * Получить реферальную информацию пользователя
   */
  async getReferralInfo(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const userId = req.params.userId;
      
      if (!this.validateParams(req, ['userId'])) {
        return this.sendError(res, 'Отсутствует параметр userId', 400);
      }
      
      logger.info('[ReferralController] Получение реферальной информации для пользователя', { userId });
      
      const stats = await this.referralService.getReferralStats(userId);
      const refCode = await this.referralService.generateReferralCode(userId);
      
      this.sendSuccess(res, {
        ref_code: refCode,
        stats,
        referral_link: `https://t.me/unifarm_bot/app?ref_code=${refCode}`
      });
    }, 'получения реферальной информации');
  }

  /**
   * Обработать реферальный код
   */
  async processReferralCode(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      this.validateRequiredFields(req.body, ['refCode', 'userId']);
      
      const { refCode, userId } = req.body;
      logger.info('[ReferralController] Обработка реферального кода для пользователя', { refCode, userId });

      const isValid = await this.referralService.validateReferralCode(refCode);
      if (!isValid) {
        return this.sendError(res, 'Недействительный реферальный код', 400);
      }

      const result = await this.referralService.processReferral(refCode, userId);
      
      this.sendSuccess(res, {
        processed: result,
        message: result ? 'Реферальный код успешно применен' : 'Ошибка применения реферального кода'
      });
    }, 'обработки реферального кода');
  }

  /**
   * Получить список рефералов пользователя
   */
  async getUserReferrals(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      if (!this.validateParams(req, ['userId'])) {
        return this.sendError(res, 'Отсутствует параметр userId', 400);
      }

      const userId = req.params.userId;
      const { page, limit } = this.getPagination(req);
      
      logger.info('[ReferralController] Получение рефералов для пользователя', { userId, page });
      
      const result = await this.referralService.getReferralsByUserId(userId);
      
      this.sendSuccess(res, result);
    }, 'получения списка рефералов');
  }

  /**
   * Получить статистику доходов от рефералов
   */
  async getReferralEarnings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;
      const period = req.query.period as string || 'all'; // all, month, week, day
      
      logger.info('[ReferralController] Получение доходов от рефералов для пользователя', { userId, period });
      
      // Здесь будет логика получения доходов из базы данных
      const earnings = {
        total_earnings: "1250",
        period_earnings: "250",
        active_referrals: 5,
        total_referrals: 12,
        average_earnings_per_referral: "104.17",
        last_payout: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: {
          earnings,
          period
        }
      });
    } catch (error) {
      console.error('[ReferralController] Ошибка получения доходов от рефералов:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения доходов от рефералов'
      });
    }
  }

  /**
   * Валидировать реферальный код
   */
  async validateReferralCode(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      if (!this.validateParams(req, ['refCode'])) {
        return this.sendError(res, 'Отсутствует параметр refCode', 400);
      }

      const { refCode } = req.params;
      console.log(`[ReferralController] Валидация реферального кода ${refCode}`);
      
      const isValid = await this.referralService.validateReferralCode(refCode);
      
      this.sendSuccess(res, {
        is_valid: isValid,
        ref_code: refCode
      });
    }, 'валидации реферального кода');
  }

  /**
   * Получить статистику реферальных уровней с реальными доходами
   */
  async getReferralLevelsStats(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const userId = req.query.user_id as string;
      const guestId = req.query.guest_id as string;
      
      console.log(`[ReferralController] Получение статистики уровней для пользователя ${userId || guestId}`);
      
      // Получаем реальные данные о доходах с партнерской программы
      const levelStats = await this.referralService.getReferralLevelsWithIncome(userId || guestId);
      
      this.sendSuccess(res, {
        user_id: parseInt(userId) || 0,
        username: "",
        total_referrals: levelStats.totalReferrals,
        referral_counts: levelStats.referralCounts,
        level_income: levelStats.levelIncome,
        referrals: levelStats.referrals
      });
    }, 'получения статистики реферальных уровней');
  }
}