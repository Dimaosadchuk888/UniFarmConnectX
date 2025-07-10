
import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';
import fetch from 'node-fetch';
import { 
  SystemStats, 
  UserStats, 
  FarmingStats, 
  DatabaseStats,
  SystemHealth 
} from './types';
import {
  USERS_TABLE,
  FARMING_SESSIONS_TABLE,
  TRANSACTIONS_TABLE,
  BOOST_PACKAGES_TABLE,
  SYSTEM_HEALTH_STATUS,
  CONNECTION_STATUS,
  MONITOR_TIME_INTERVALS
} from './model';

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
        supabase.from(USERS_TABLE).select('id', { count: 'exact', head: true }),
        supabase.from(FARMING_SESSIONS_TABLE).select('id', { count: 'exact', head: true }),
        supabase.from(TRANSACTIONS_TABLE).select('id', { count: 'exact', head: true }),
        supabase.from(BOOST_PACKAGES_TABLE).select('id', { count: 'exact', head: true })
      ]);

      // Активні користувачі (останні 24 години)
      const oneDayAgo = new Date(Date.now() - MONITOR_TIME_INTERVALS.ONE_DAY).toISOString();
      const { count: activeUsers } = await supabase
        .from(USERS_TABLE)
        .select('id', { count: 'exact', head: true })
        .gte('checkin_last_date', oneDayAgo);

      // Активні фарминг сесії
      const { count: activeFarmingSessions } = await supabase
        .from(FARMING_SESSIONS_TABLE)
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
        .from(USERS_TABLE)
        .select('created_at, balance_uni, balance_ton, referrer_id');

      if (error) {
        throw error;
      }

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - MONITOR_TIME_INTERVALS.ONE_DAY);
      const oneWeekAgo = new Date(now.getTime() - MONITOR_TIME_INTERVALS.ONE_WEEK);

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
        .from(FARMING_SESSIONS_TABLE)
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
        .from(USERS_TABLE)
        .select('id')
        .limit(1);

      const databaseHealthy = !error;
      
      // Перевіряємо наявність критичних помилок в логах (якщо потрібно)
      const criticalErrors = 0; // Заглушка для подальшої реалізації

      const systemHealthy = databaseHealthy && criticalErrors === 0;

      return {
        overall: systemHealthy ? SYSTEM_HEALTH_STATUS.HEALTHY : SYSTEM_HEALTH_STATUS.UNHEALTHY,
        database: databaseHealthy ? CONNECTION_STATUS.CONNECTED : CONNECTION_STATUS.DISCONNECTED,
        api: CONNECTION_STATUS.OPERATIONAL, // Якщо цей код виконується, API працює
        criticalErrors,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[MonitorService] Ошибка проверки здоровья системы:', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        overall: SYSTEM_HEALTH_STATUS.UNHEALTHY,
        database: CONNECTION_STATUS.DISCONNECTED,
        api: CONNECTION_STATUS.OPERATIONAL,
        criticalErrors: 1,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Мониторинг критических API endpoints
   */
  async checkCriticalEndpoints(): Promise<Record<string, string>> {
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    const timeout = 5000; // 5 секунд таймаут
    
    const endpoints = {
      boostPackages: '/api/v2/boost/packages',
      walletBalance: '/api/v2/wallet/balance',
      farmingStatus: '/api/v2/farming/status',
      userProfile: '/api/v2/users/profile',
      dailyBonusStatus: '/api/v2/daily-bonus/status',
      referralStats: '/api/v2/referrals/stats'
    };

    const results: Record<string, string> = {};

    logger.info('[MonitorService] Начинаем проверку критических API endpoints', {
      timestamp: new Date().toISOString(),
      baseUrl,
      totalEndpoints: Object.keys(endpoints).length,
      endpoints: Object.keys(endpoints)
    });

    // Проверяем каждый endpoint параллельно
    await Promise.all(
      Object.entries(endpoints).map(async ([key, endpoint]) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Monitor-Check': 'true' // Помечаем как системную проверку
            },
            signal: controller.signal as any
          });
          
          clearTimeout(timeoutId);
          
          // Для некоторых endpoints 401 (требуется авторизация) - это нормально
          if (response.ok || response.status === 401) {
            results[key] = 'OK';
          } else {
            results[key] = `FAIL - ${response.status} ${response.statusText}`;
            logger.warn(`[MonitorService] Endpoint ${endpoint} вернул ошибку:`, {
              status: response.status,
              statusText: response.statusText
            });
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            results[key] = 'FAIL - Timeout';
          } else {
            results[key] = `FAIL - ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
          
          logger.error(`[MonitorService] Ошибка проверки endpoint ${endpoint}:`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      })
    );

    return results;
  }

  /**
   * Получить состояние scheduler'ов
   */
  async getSchedulerStatus(): Promise<{
    uniFarmingScheduler: {
      active: boolean;
      lastRun?: string;
      nextRun?: string;
      activeSessions?: number;
      lastProcessed?: number;
    };
    tonBoostScheduler: {
      active: boolean;
      lastRun?: string;
      nextRun?: string;
      activeUsers?: number;
      lastProcessed?: number;
    };
    timestamp: string;
  }> {
    try {
      // Импортируем scheduler'ы
      const { farmingScheduler } = await import('../../core/scheduler/farmingScheduler');
      const { tonBoostIncomeScheduler } = await import('../scheduler/tonBoostIncomeScheduler');

      // Получаем статус каждого scheduler'а
      const uniFarmingStatus = farmingScheduler.getStatus();
      const tonBoostStatus = tonBoostIncomeScheduler.getStatus();

      // Получаем дополнительную информацию из базы данных
      const { data: activeFarmingSessions } = await supabase
        .from('farming_sessions')
        .select('id')
        .eq('is_active', true);

      const { data: activeTonBoostUsers } = await supabase
        .from('users')
        .select('id')
        .not('ton_boost_package', 'is', null)
        .gte('balance_ton', 10);

      // Получаем последние транзакции для определения времени последнего запуска
      const { data: lastFarmingTransaction } = await supabase
        .from('transactions')
        .select('created_at')
        .eq('type', 'FARMING_REWARD')
        .eq('amount_ton', '0')
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: lastTonBoostTransaction } = await supabase
        .from('transactions')
        .select('created_at')
        .eq('type', 'FARMING_REWARD')
        .neq('amount_ton', '0')
        .order('created_at', { ascending: false })
        .limit(1);

      return {
        uniFarmingScheduler: {
          active: uniFarmingStatus.active,
          lastRun: lastFarmingTransaction?.[0]?.created_at || 'Нет данных',
          nextRun: uniFarmingStatus.nextRun?.toISOString() || 'Не запланировано',
          activeSessions: activeFarmingSessions?.length || 0,
          lastProcessed: 0 // TODO: добавить счетчик в scheduler
        },
        tonBoostScheduler: {
          active: tonBoostStatus.active,
          lastRun: lastTonBoostTransaction?.[0]?.created_at || 'Нет данных',
          nextRun: tonBoostStatus.nextRun?.toISOString() || 'Не запланировано',
          activeUsers: activeTonBoostUsers?.length || 0,
          lastProcessed: 0 // TODO: добавить счетчик в scheduler
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[MonitorService] Ошибка получения состояния scheduler\'ов:', error);
      
      return {
        uniFarmingScheduler: {
          active: false,
          lastRun: 'Ошибка',
          nextRun: 'Ошибка',
          activeSessions: 0,
          lastProcessed: 0
        },
        tonBoostScheduler: {
          active: false,
          lastRun: 'Ошибка',
          nextRun: 'Ошибка',
          activeUsers: 0,
          lastProcessed: 0
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}
