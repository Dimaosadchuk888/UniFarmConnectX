
import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';
import { 
  SystemStats, 
  UserStats, 
  FarmingStats, 
  DatabaseStats,
  SystemHealth 
} from './types';

export class MonitorService {
  /**
   * Отримати загальну статистику системи
   */
  async getSystemStats(): Promise<SystemStats> {
    try {
      logger.info('[MonitorService] Получение общей статистики системы');

      // Паралельно виконуємо всі запити
      const [
        usersResult,
        farmingSessionsResult,
        transactionsResult,
        boostsResult
      ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('farming_sessions').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('id', { count: 'exact', head: true }),
        supabase.from('boost_packages').select('id', { count: 'exact', head: true })
      ]);

      // Активні користувачі (останні 24 години)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: activeUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('checkin_last_date', oneDayAgo);

      // Активні фарминг сесії
      const { count: activeFarmingSessions } = await supabase
        .from('farming_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      return {
        totalUsers: usersResult.count || 0,
        activeUsers: activeUsers || 0,
        totalFarmingSessions: farmingSessionsResult.count || 0,
        activeFarmingSessions: activeFarmingSessions || 0,
        totalTransactions: transactionsResult.count || 0,
        totalBoostPackages: boostsResult.count || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[MonitorService] Ошибка получения статистики системы:', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalFarmingSessions: 0,
        activeFarmingSessions: 0,
        totalTransactions: 0,
        totalBoostPackages: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Отримати статистику користувачів
   */
  async getUserStats(): Promise<UserStats> {
    try {
      logger.info('[MonitorService] Получение статистики пользователей');

      const { data: users, error } = await supabase
        .from('users')
        .select('created_at, balance_uni, balance_ton, referrer_id');

      if (error) {
        throw error;
      }

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const newUsersToday = users?.filter(user => 
        new Date(user.created_at) >= oneDayAgo
      ).length || 0;

      const newUsersThisWeek = users?.filter(user => 
        new Date(user.created_at) >= oneWeekAgo
      ).length || 0;

      const usersWithReferrer = users?.filter(user => 
        user.referrer_id !== null
      ).length || 0;

      const totalUniBalance = users?.reduce((sum, user) => 
        sum + parseFloat(user.balance_uni || '0'), 0
      ) || 0;

      const totalTonBalance = users?.reduce((sum, user) => 
        sum + parseFloat(user.balance_ton || '0'), 0
      ) || 0;

      return {
        totalUsers: users?.length || 0,
        newUsersToday,
        newUsersThisWeek,
        usersWithReferrer,
        totalUniBalance: totalUniBalance.toString(),
        totalTonBalance: totalTonBalance.toString(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[MonitorService] Ошибка получения статистики пользователей:', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalUsers: 0,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        usersWithReferrer: 0,
        totalUniBalance: '0',
        totalTonBalance: '0',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Отримати статистику фармінгу
   */
  async getFarmingStats(): Promise<FarmingStats> {
    try {
      logger.info('[MonitorService] Получение статистики фарминга');

      const { data: sessions, error } = await supabase
        .from('farming_sessions')
        .select('*');

      if (error) {
        throw error;
      }

      const activeSessions = sessions?.filter(s => s.is_active) || [];
      const totalDeposited = sessions?.reduce((sum, session) => 
        sum + parseFloat(session.amount || '0'), 0
      ) || 0;

      const totalEarned = sessions?.reduce((sum, session) => 
        sum + parseFloat(session.total_earned || '0'), 0
      ) || 0;

      const avgDailyRate = sessions?.length ? 
        sessions.reduce((sum, session) => 
          sum + parseFloat(session.daily_rate || '0'), 0
        ) / sessions.length : 0;

      return {
        totalSessions: sessions?.length || 0,
        activeSessions: activeSessions.length,
        totalDeposited: totalDeposited.toString(),
        totalEarned: totalEarned.toString(),
        averageDailyRate: avgDailyRate.toString(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[MonitorService] Ошибка получения статистики фарминга:', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalSessions: 0,
        activeSessions: 0,
        totalDeposited: '0',
        totalEarned: '0',
        averageDailyRate: '0',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Перевірити здоров'я системи
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      logger.info('[MonitorService] Проверка здоровья системы');

      // Тест підключення до Supabase
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      const databaseHealthy = !error;
      
      // Перевіряємо наявність критичних помилок в логах (якщо потрібно)
      const criticalErrors = 0; // Заглушка для подальшої реалізації

      const systemHealthy = databaseHealthy && criticalErrors === 0;

      return {
        overall: systemHealthy ? 'healthy' : 'unhealthy',
        database: databaseHealthy ? 'connected' : 'disconnected',
        api: 'operational', // Якщо цей код виконується, API працює
        criticalErrors,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[MonitorService] Ошибка проверки здоровья системы:', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        overall: 'unhealthy',
        database: 'disconnected',
        api: 'operational',
        criticalErrors: 1,
        lastCheck: new Date().toISOString()
      };
    }
  }
}
