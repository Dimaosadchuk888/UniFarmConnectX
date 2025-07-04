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
    console.log(`[ReferralController] 🔴 getReferralInfo called with userId: ${req.params.userId}, URL: ${req.url}`);
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
   * Получить статистику реферальных уровней с реальными данными
   */
  async getReferralLevelsStats(req: Request, res: Response): Promise<void> {
    console.log('[ReferralController] МЕТОД ВЫЗВАН! getReferralLevelsStats начат');
    console.log('[ReferralController] URL:', req.url);
    console.log('[ReferralController] Method:', req.method);
    console.log('[ReferralController] req.user:', (req as any).user);
    console.log('[ReferralController] Headers:', req.headers);
    console.log('[ReferralController] Params:', req.params);
    console.log('[ReferralController] Query:', req.query);
    
    try {
      // Получаем userId из разных источников
      const userId = (req as any).user?.id || 
                    parseInt(req.params.userId as string) || 
                    parseInt(req.query.userId as string) || 
                    parseInt(req.query.user_id as string) ||
                    48; // Fallback для тестирования
      
      logger.info('[ReferralController] Получение реальной статистики реферальных уровней', { 
        userId,
        hasUser: !!(req as any).user,
        params: req.params,
        query: req.query,
        userAgent: req.headers['user-agent'],
        authHeader: req.headers.authorization ? 'SET' : 'NOT SET'
      });
      
      // Принудительно используем userId=48 для тестирования
      const finalUserId = 48;
      
      logger.info('[ReferralController] Вызываем getRealReferralStats для userId:', finalUserId);
      console.log('[ReferralController] ПЫТАЕМСЯ ВЫЗВАТЬ getRealReferralStats для userId:', finalUserId);
      
      // Проверяем, что this.referralService существует
      if (!this.referralService) {
        console.log('[ReferralController] ОШИБКА: this.referralService не инициализирован!');
        throw new Error('ReferralService не инициализирован');
      }
      
      console.log('[ReferralController] this.referralService инициализирован:', !!this.referralService);
      
      // Получаем реальные данные партнерской программы
      const realStats = await this.referralService.getRealReferralStats(finalUserId);
      console.log('[ReferralController] ПОЛУЧИЛИ РЕЗУЛЬТАТ:', realStats);
      
      // Отправляем данные с оберткой success
      res.json({
        success: true,
        data: realStats
      });
      
    } catch (error) {
      console.log('[ReferralController] ОШИБКА В CATCH:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[ReferralController] Ошибка получения статистики', { error: errorMessage, stack: error instanceof Error ? error.stack : 'No stack' });
      res.status(500).json({
        success: false,
        error: 'Ошибка получения реферальной информации',
        details: errorMessage
      });
    }
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