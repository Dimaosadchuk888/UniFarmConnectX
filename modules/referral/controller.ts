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
    return this.handleRequest(req, res, async () => {
      const userId = req.params.userId;
      
      if (!this.validateParams(req, ['userId'])) {
        return this.sendError(res, 'Отсутствует параметр userId', 400);
      }
      
      logger.info('[ReferralController] Получение реферальной информации для пользователя', { userId });
      
      const stats = await this.referralService.getReferralStats(userId);
      // Используем generateReferralCode который сначала проверяет существующий код
      const refCode = await this.referralService.generateReferralCode(Number(userId));
      
      this.sendSuccess(res, {
        ref_code: refCode,
        stats,
        referral_link: `https://t.me/UniFarming_Bot?start=${refCode}`
      });
    }, 'получения реферальной информации');
  }

  /**
   * Получить реферальный код пользователя
   */
  async getUserReferralCode(req: Request, res: Response): Promise<void> {
    return this.handleRequest(req, res, async () => {
      const userId = parseInt(req.params.userId);
      
      if (!this.validateParams(req, ['userId'])) {
        return this.sendError(res, 'Отсутствует параметр userId', 400);
      }
      
      logger.info('[ReferralController] Получение реферального кода для пользователя', { userId });
      
      const refCode = await this.referralService.generateReferralCode(userId);
      
      this.sendSuccess(res, {
        ref_code: refCode,
        referral_link: `https://t.me/unifarm_bot/app?ref_code=${refCode}`
      });
    }, 'получения реферального кода');
  }

  /**
   * Получить статистику реферальных уровней
   */
  async getReferralLevelsStats(req: Request, res: Response): Promise<void> {
    return this.handleRequest(req, res, async () => {
      const userId = (req as any).user?.id || parseInt(req.params.userId || req.query.userId as string);
      
      if (!userId) {
        return this.sendError(res, 'Не удалось определить пользователя', 400);
      }
      
      logger.info('[ReferralController] Получение статистики реферальных уровней', { userId });
      
      const stats = await this.referralService.getReferralStats(userId);
      
      this.sendSuccess(res, {
        levels: [], // Пустой массив для совместимости с фронтендом
        total_referrals: stats.totalReferrals || 0,
        total_earnings: stats.totalEarned || { UNI: "0", TON: "0" }
      });
    }, 'получения статистики реферальных уровней');
  }

  /**
   * Обработать реферальный код
   */
  async processReferralCode(req: Request, res: Response): Promise<void> {
    return this.handleRequest(req, res, async () => {
      const { refCode, newUserId } = req.body;
      
      if (!refCode || !newUserId) {
        return this.sendError(res, 'Отсутствуют обязательные параметры refCode или newUserId', 400);
      }
      
      logger.info('[ReferralController] Обработка реферального кода', { refCode, newUserId });
      
      const result = await this.referralService.processReferral(refCode, newUserId);
      
      if (result.success) {
        this.sendSuccess(res, { message: 'Реферальный код успешно обработан' });
      } else {
        this.sendError(res, result.error || 'Ошибка обработки реферального кода', 400);
      }
    }, 'обработки реферального кода');
  }

  /**
   * Получить список рефералов пользователя
   */
  async getUserReferrals(req: Request, res: Response): Promise<void> {
    return this.handleRequest(req, res, async () => {
      const userId = req.params.userId;
      
      if (!userId) {
        return this.sendError(res, 'Отсутствует параметр userId', 400);
      }
      
      logger.info('[ReferralController] Получение списка рефералов', { userId });
      
      const referrals = await this.referralService.getUserReferrals(parseInt(userId));
      
      this.sendSuccess(res, { referrals });
    }, 'получения списка рефералов');
  }

  /**
   * Генерировать реферальный код для пользователя
   */
  async generateReferralCode(req: Request, res: Response): Promise<void> {
    return this.handleRequest(req, res, async () => {
      const userId = req.body.userId || (req as any).user?.id;
      
      if (!userId) {
        return this.sendError(res, 'Отсутствует параметр userId', 400);
      }
      
      logger.info('[ReferralController] Генерация реферального кода', { userId });
      
      const refCode = await this.referralService.generateReferralCode(parseInt(userId));
      
      this.sendSuccess(res, { ref_code: refCode });
    }, 'генерации реферального кода');
  }

  /**
   * Получить статистику доходов от рефералов
   */
  async getReferralEarnings(req: Request, res: Response): Promise<void> {
    return this.handleRequest(req, res, async () => {
      const userId = req.params.userId;
      
      if (!userId) {
        return this.sendError(res, 'Отсутствует параметр userId', 400);
      }
      
      logger.info('[ReferralController] Получение статистики доходов', { userId });
      
      const stats = await this.referralService.getReferralStats(userId);
      
      this.sendSuccess(res, {
        total_earned: stats.totalEarned,
        monthly_earned: stats.monthlyEarned,
        total_referrals: stats.totalReferrals
      });
    }, 'получения статистики доходов');
  }

  /**
   * Валидировать реферальный код
   */
  async validateReferralCode(req: Request, res: Response): Promise<void> {
    return this.handleRequest(req, res, async () => {
      const { refCode } = req.body;
      
      if (!refCode) {
        return this.sendError(res, 'Отсутствует реферальный код', 400);
      }
      
      logger.info('[ReferralController] Валидация реферального кода', { refCode });
      
      // Простая проверка формата
      const isValid = refCode.startsWith('REF_') && refCode.length > 10;
      
      this.sendSuccess(res, { 
        valid: isValid,
        ref_code: refCode 
      });
    }, 'валидации реферального кода');
  }
}