import { Request, Response } from 'express';
import { storage } from '../storage';
import { sendSuccess, sendError, sendServerError } from '../utils/responseUtils';
import { ReferralService } from '../services/referralService';

/**
 * Контроллер для управления сессиями пользователей и восстановления кабинета
 */
export class SessionController {
  /**
   * Восстанавливает сессию пользователя по guest_id без создания нового аккаунта
   * @param req Запрос с guest_id в параметрах
   * @param res Ответ с данными пользователя или ошибкой
   */
  static async restoreSession(req: Request, res: Response): Promise<void> {
    try {
      // Получаем guest_id из запроса
      const { guest_id, ref_code } = req.query;
      
      // Проверяем наличие обязательного параметра
      if (!guest_id || typeof guest_id !== 'string') {
        console.log('[SESSION] Отсутствует обязательный параметр guest_id');
        return sendError(res, 'Не указан идентификатор гостя (guest_id)', 400);
      }
      
      console.log(`[SESSION] Запрос на восстановление сессии по guest_id: ${guest_id}`);
      
      // Ищем пользователя по guest_id
      const user = await storage.getUserByGuestId(guest_id);
      
      if (!user) {
        console.log(`[SESSION] Пользователь с guest_id ${guest_id} не найден в базе данных`);
        return sendError(res, 'Пользователь не найден', 404);
      }
      
      console.log(`[SESSION] Найден пользователь: id=${user.id}, telegram_id=${user.telegram_id}, username=${user.username}`);
      
      // Если передан ref_code, и у пользователя еще нет родительского реферального кода,
      // можно обновить его, но только если это разрешено бизнес-логикой
      if (ref_code && typeof ref_code === 'string' && !user.parent_ref_code) {
        try {
          // Проверяем валидность реферального кода
          const inviter = await storage.getUserByRefCode(ref_code);
          
          if (inviter && inviter.id !== user.id) {
            console.log(`[SESSION] Обновляем parent_ref_code для пользователя ${user.id} на ${ref_code}`);
            
            // Обновляем родительский реферальный код для пользователя
            await storage.updateUserParentRefCode(user.id, ref_code);
            
            // Создаем реферальную связь, если ее еще нет
            const existingReferral = await ReferralService.getUserInviter(user.id);
            
            if (!existingReferral) {
              // Создаем реферальную связь (уровень 1)
              const referral = await ReferralService.createReferralRelationship(user.id, inviter.id);
              
              if (referral) {
                console.log(`[SESSION] Создана реферальная связь: пользователь ${user.id} приглашен пользователем ${inviter.id}`);
              }
            } else {
              console.log(`[SESSION] Пользователь ${user.id} уже имеет пригласителя: ${existingReferral.inviter_id}`);
            }
          } else if (inviter && inviter.id === user.id) {
            console.log(`[SESSION] Отклонена попытка самореферальности: ${user.id}`);
          } else {
            console.log(`[SESSION] Пригласитель с ref_code=${ref_code} не найден`);
          }
        } catch (error) {
          console.error('[SESSION] Ошибка при обработке реферального кода:', error);
          // Продолжаем выполнение - ошибка обработки реферального кода не должна мешать восстановлению сессии
        }
      }
      
      // Получаем обновленные данные пользователя после возможных изменений
      const updatedUser = await storage.getUserById(user.id);
      
      if (!updatedUser) {
        return sendError(res, 'Ошибка при получении обновленных данных пользователя', 500);
      }
      
      // Отправляем успешный ответ с данными пользователя
      sendSuccess(res, {
        id: updatedUser.id,
        telegram_id: updatedUser.telegram_id,
        guest_id: updatedUser.guest_id,
        username: updatedUser.username,
        ref_code: updatedUser.ref_code,
        parent_ref_code: updatedUser.parent_ref_code,
        balance_uni: updatedUser.balance_uni,
        balance_ton: updatedUser.balance_ton,
        session_restored: true,
      });
    } catch (error) {
      console.error('[SESSION] Ошибка при восстановлении сессии:', error);
      sendServerError(res, error);
    }
  }
}