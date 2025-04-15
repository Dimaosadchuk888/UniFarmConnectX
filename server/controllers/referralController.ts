import { Request, Response } from 'express';
import { ReferralService } from '../services/referralService';
import { UserService } from '../services/userService';
import { sendSuccess, sendSuccessArray, sendError, sendServerError } from '../utils/responseUtils';
import { extractUserId } from '../utils/validationUtils';

/**
 * Контроллер для работы с реферальной системой
 */
export class ReferralController {
  /**
   * Получает данные по партнерке для пользователя
   */
  static async getUserReferrals(req: Request, res: Response): Promise<void> {
    try {
      const userId = extractUserId(req, 'query');
      
      if (!userId) {
        return sendError(res, 'Invalid user ID', 400);
      }

      // Проверка существования пользователя
      const user = await UserService.getUserById(userId);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      // Получаем список приглашенных пользователей
      const referrals = await ReferralService.getUserReferrals(userId);
      
      // Получаем статистику по уровням рефералов
      const referralCounts = await ReferralService.getReferralCounts(userId);
      
      // Формируем ответ
      const response = {
        user_id: userId,
        username: user.username,
        total_referrals: referrals.length,
        referral_counts: referralCounts,
        referrals: referrals
      };

      sendSuccess(res, response);
    } catch (error) {
      console.error('Error fetching user referrals:', error);
      sendServerError(res, 'Failed to fetch user referrals');
    }
  }

  /**
   * Проверяет наличие пригласителя у пользователя
   */
  static async getUserInviter(req: Request, res: Response): Promise<void> {
    try {
      const userId = extractUserId(req, 'params');
      
      if (!userId) {
        sendError(res, 'Invalid user ID', 400);
        return;
      }

      const inviter = await ReferralService.getUserInviter(userId);
      
      if (!inviter) {
        sendError(res, 'User has no inviter', 404);
        return;
      }

      const inviterUser = await UserService.getUserById(inviter.inviter_id);
      
      const response = {
        user_id: userId,
        inviter_id: inviter.inviter_id,
        inviter_username: inviterUser?.username,
        level: inviter.level,
        created_at: inviter.created_at
      };

      sendSuccess(res, response);
    } catch (error) {
      console.error('Error fetching user inviter:', error);
      sendServerError(res, 'Failed to fetch user inviter');
    }
  }
}