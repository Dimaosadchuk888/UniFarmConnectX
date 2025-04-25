import { db } from '../db';
import { launchLogs, type InsertLaunchLog, type LaunchLog } from '@shared/schema';
import crypto from 'crypto';
import { eq, gt, and } from 'drizzle-orm';

/**
 * Сервис для логирования запусков Mini App (Этап 5.1)
 */
export class LaunchLogService {
  /**
   * Максимальное количество запусков для одного пользователя за минуту
   * (для предотвращения спама)
   */
  private static MAX_LAUNCHES_PER_MINUTE = 5;

  /**
   * Записывает информацию о запуске Mini App
   * @param logData Данные о запуске
   * @returns Созданная запись
   */
  static async logLaunch(logData: InsertLaunchLog): Promise<LaunchLog> {
    try {
      // Создаем уникальный идентификатор запроса, если он не передан
      if (!logData.request_id) {
        logData.request_id = crypto.randomUUID();
      }

      // Проверяем, не слишком ли часто поступают запросы от этого пользователя
      if (await this.shouldThrottleUser(logData.telegram_user_id)) {
        console.warn(`[LaunchLog] Throttling excessive launch logs for user ${logData.telegram_user_id}`);
        throw new Error('Rate limit exceeded for this user');
      }

      console.log(`[launch] Новый запуск: { user_id: ${logData.telegram_user_id}, platform: ${logData.platform}, timestamp: ${logData.timestamp || new Date()} }`);

      // Записываем запуск приложения в базу данных
      const [log] = await db
        .insert(launchLogs)
        .values(logData)
        .returning();

      return log;
    } catch (error) {
      console.error('[LaunchLogService] Error logging launch:', error);
      throw error;
    }
  }

  /**
   * Получает все записи о запусках для определенного пользователя
   * @param telegramUserId ID пользователя в Telegram
   * @returns Список запусков
   */
  static async getUserLaunches(telegramUserId: number): Promise<LaunchLog[]> {
    try {
      const logs = await db
        .select()
        .from(launchLogs)
        .where(eq(launchLogs.telegram_user_id, telegramUserId));
        
      // Сортировка выполняется через JavaScript вместо SQL
      return logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error('[LaunchLogService] Error fetching user launches:', error);
      return [];
    }
  }

  /**
   * Проверяет, не превышен ли лимит запусков для пользователя
   * @param telegramUserId ID пользователя в Telegram
   * @returns true если пользователя нужно ограничить, false если нет
   */
  private static async shouldThrottleUser(telegramUserId: number | null | undefined): Promise<boolean> {
    try {
      if (!telegramUserId) {
        return false; // Не ограничиваем, если ID не определен
      }

      // Получаем количество запусков за последнюю минуту
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      
      const logs = await db
        .select()
        .from(launchLogs)
        .where(
          and(
            eq(launchLogs.telegram_user_id, telegramUserId),
            gt(launchLogs.timestamp, oneMinuteAgo)
          )
        );

      return logs.length >= this.MAX_LAUNCHES_PER_MINUTE;
    } catch (error) {
      console.error('[LaunchLogService] Error checking throttle:', error);
      return false; // В случае ошибки не ограничиваем, чтобы не блокировать легитимных пользователей
    }
  }

  /**
   * Получает статистику запусков по платформам
   * @returns Объект с количеством запусков по платформам
   */
  static async getPlatformStats(): Promise<Record<string, number>> {
    try {
      // В realtime БД мы бы использовали агрегацию, 
      // но для простоты делаем через JS в тестовой среде
      const logs = await db
        .select()
        .from(launchLogs);

      const stats: Record<string, number> = {};
      
      logs.forEach(log => {
        const platform = log.platform || 'unknown';
        stats[platform] = (stats[platform] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('[LaunchLogService] Error fetching platform stats:', error);
      return {};
    }
  }
}