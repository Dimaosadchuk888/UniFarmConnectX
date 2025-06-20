import express from 'express';
import { ReferralService } from './service';

export class ReferralController {
  private referralService: ReferralService;

  constructor() {
    this.referralService = new ReferralService();
  }

  /**
   * Получить реферальную информацию пользователя
   */
  async getReferralInfo(req: express.Request, res: express.Response): Promise<void> {
    try {
      const userId = req.params.userId;
      console.log(`[ReferralController] Получение реферальной информации для пользователя ${userId}`);
      
      const stats = await this.referralService.getReferralStats(userId);
      const refCode = await this.referralService.generateReferralCode(userId);
      
      res.json({
        success: true,
        data: {
          ref_code: refCode,
          stats,
          referral_link: `https://t.me/unifarm_bot/app?ref_code=${refCode}`
        }
      });
    } catch (error) {
      console.error('[ReferralController] Ошибка получения реферальной информации:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения реферальной информации'
      });
    }
  }

  /**
   * Обработать реферальный код
   */
  async processReferralCode(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { refCode, userId } = req.body;
      console.log(`[ReferralController] Обработка реферального кода ${refCode} для пользователя ${userId}`);
      
      if (!refCode || !userId) {
        res.status(400).json({
          success: false,
          error: 'Не указан refCode или userId'
        });
        return;
      }

      const isValid = await this.referralService.validateReferralCode(refCode);
      if (!isValid) {
        res.status(400).json({
          success: false,
          error: 'Недействительный реферальный код'
        });
        return;
      }

      const result = await this.referralService.processReferral(refCode, userId);
      
      res.json({
        success: true,
        data: {
          processed: result,
          message: result ? 'Реферальный код успешно применен' : 'Ошибка применения реферального кода'
        }
      });
    } catch (error) {
      console.error('[ReferralController] Ошибка обработки реферального кода:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка обработки реферального кода'
      });
    }
  }

  /**
   * Получить список рефералов пользователя
   */
  async getUserReferrals(req: express.Request, res: express.Response): Promise<void> {
    try {
      const userId = req.params.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      console.log(`[ReferralController] Получение рефералов для пользователя ${userId}, страница ${page}`);
      
      // Здесь будет логика получения рефералов из базы данных
      const referrals = [
        {
          id: 1,
          referred_user_id: "123",
          referred_username: "user123",
          referred_at: new Date().toISOString(),
          earnings_from_referral: "50",
          is_active: true
        }
      ];
      
      res.json({
        success: true,
        data: {
          referrals,
          pagination: {
            page,
            limit,
            total: referrals.length,
            has_more: false
          }
        }
      });
    } catch (error) {
      console.error('[ReferralController] Ошибка получения рефералов:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения списка рефералов'
      });
    }
  }

  /**
   * Получить статистику доходов от рефералов
   */
  async getReferralEarnings(req: express.Request, res: express.Response): Promise<void> {
    try {
      const userId = req.params.userId;
      const period = req.query.period as string || 'all'; // all, month, week, day
      
      console.log(`[ReferralController] Получение доходов от рефералов для пользователя ${userId}, период ${period}`);
      
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
  async validateReferralCode(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { refCode } = req.params;
      console.log(`[ReferralController] Валидация реферального кода ${refCode}`);
      
      const isValid = await this.referralService.validateReferralCode(refCode);
      
      res.json({
        success: true,
        data: {
          is_valid: isValid,
          ref_code: refCode
        }
      });
    } catch (error) {
      console.error('[ReferralController] Ошибка валидации реферального кода:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка валидации реферального кода'
      });
    }
  }
}