import { Request, Response } from 'express';
import { DailyBonusService } from '../services/dailyBonusService';
import { sendSuccess, sendError, sendServerError } from '../utils/responseUtils';
import { extractUserId } from '../utils/validationUtils';

/**
 * Контроллер для работы с ежедневными бонусами
 */
export class DailyBonusController {
  /**
   * Проверяет доступность бонуса для пользователя
   */
  static async checkDailyBonusStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = extractUserId(req, 'query');
      
      if (!userId) {
        sendError(res, 'Invalid user ID', 400);
        return;
      }
      
      const { canClaim, streak } = await DailyBonusService.canClaimDailyBonus(userId);
      
      sendSuccess(res, {
        canClaim,
        streak,
        bonusAmount: DailyBonusService.DAILY_BONUS_AMOUNT
      });
    } catch (error) {
      console.error('Error checking daily bonus status:', error);
      sendServerError(res, error);
    }
  }
  
  /**
   * Выдает пользователю ежедневный бонус
   */
  static async claimDailyBonus(req: Request, res: Response): Promise<void> {
    try {
      const userId = extractUserId(req, 'body');
      
      if (!userId) {
        sendError(res, 'Invalid user ID', 400);
        return;
      }
      
      const result = await DailyBonusService.claimDailyBonus(userId);
      
      if (!result.success) {
        sendError(res, result.message, 400);
        return;
      }
      
      sendSuccess(res, result);
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      sendServerError(res, error);
    }
  }
}