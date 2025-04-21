import { Request, Response } from 'express';
import { sendSuccess, sendError, sendServerError } from '../utils/responseUtils';
import { db } from '../db';
import { users } from '@shared/schema';
import { logTelegramId } from '../utils/telegramUtils';

/**
 * Контроллер для административных функций
 */
export class AdminController {
  /**
   * Проверяет наличие необходимых прав для доступа к админ API
   * @param req HTTP запрос
   * @param adminKeyHeader Заголовок с ключом администратора (по умолчанию 'x-admin-key')
   * @returns true если доступ разрешен, false в противном случае
   */
  private static hasAdminAccess(req: Request, adminKeyHeader: string = 'x-admin-key'): boolean {
    const adminKey = req.headers[adminKeyHeader] as string;
    const IS_DEV = process.env.NODE_ENV === 'development';
    
    // Для безопасности требуем указание ключа, даже в режиме разработки
    if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
      console.warn('[AdminController] Попытка доступа к админскому API без правильного ключа');
      return false;
    }
    
    return true;
  }
  
  /**
   * Получает список всех пользователей с их Telegram ID
   * Эндпоинт используется для диагностики проблем с Telegram ID
   * @access Только администраторы
   */
  static async listUsersWithTelegramId(req: Request, res: Response): Promise<void> {
    try {
      // Проверяем права доступа
      if (!AdminController.hasAdminAccess(req)) {
        return sendError(res, 'Доступ запрещен', 403);
      }
      
      console.log('[AdminController] Запрос списка пользователей с Telegram ID');
      
      // Получаем всех пользователей из базы
      const allUsers = await db.select({
        id: users.id,
        telegramId: users.telegram_id,
        username: users.username,
        createdAt: users.created_at
      }).from(users);
      
      // Добавляем флаг тестового аккаунта для каждого пользователя
      const usersWithFlags = allUsers.map(user => ({
        ...user,
        isTestAccount: !user.telegramId || user.telegramId === 1
      }));
      
      // Подсчитываем статистику для диагностики
      const stats = {
        totalUsers: allUsers.length,
        usersWithValidTelegramId: allUsers.filter(u => u.telegramId && u.telegramId > 1).length,
        usersWithoutTelegramId: allUsers.filter(u => !u.telegramId).length,
        usersWithTestTelegramId: allUsers.filter(u => u.telegramId === 1).length,
        duplicateTelegramIds: findDuplicateTelegramIds(allUsers)
      };
      
      // Отправляем ответ с данными и статистикой
      sendSuccess(res, {
        users: usersWithFlags,
        stats,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('[AdminController] Ошибка при получении списка пользователей:', error);
      sendServerError(res, error);
    }
  }
}

/**
 * Вспомогательная функция для поиска дубликатов Telegram ID
 */
function findDuplicateTelegramIds(users: { telegramId: number | null }[]): Record<string, number> {
  const idCounts: Record<string, number> = {};
  const duplicates: Record<string, number> = {};
  
  users.forEach(user => {
    if (user.telegramId) {
      const idStr = user.telegramId.toString();
      idCounts[idStr] = (idCounts[idStr] || 0) + 1;
      
      if (idCounts[idStr] > 1) {
        duplicates[idStr] = idCounts[idStr];
      }
    }
  });
  
  return duplicates;
}