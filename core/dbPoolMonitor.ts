/**
 * Database Connection Pool Monitor
 * Отслеживает состояние connection pool PostgreSQL в реальном времени
 */

import { pool } from './db';

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  activeCount: number;
}

/**
 * Получает текущую статистику connection pool
 */
export function getPoolStats(): PoolStats {
  try {
    // Neon serverless pool статистика
    const totalCount = pool.totalCount || 0;
    const idleCount = pool.idleCount || 0;
    const waitingCount = pool.waitingCount || 0;
    const activeCount = totalCount - idleCount;

    return {
      totalCount,
      idleCount,
      waitingCount,
      activeCount
    };
  } catch (error) {
    console.error('[DB POOL MONITOR] Ошибка получения статистики:', error);
    return {
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
      activeCount: 0
    };
  }
}

/**
 * Выводит статистику connection pool в консоль
 */
export function logPoolStats(): void {
  const stats = getPoolStats();
  console.log(`[DB POOL] active: ${stats.activeCount} | idle: ${stats.idleCount} | waiting: ${stats.waitingCount} | total: ${stats.totalCount}`);
}

/**
 * Запускает мониторинг connection pool с интервалом
 */
export function startPoolMonitoring(intervalMinutes: number = 5): NodeJS.Timeout {
  console.log(`[DB POOL MONITOR] Запуск мониторинга с интервалом ${intervalMinutes} минут`);
  
  // Первоначальная статистика
  logPoolStats();
  
  // Периодический мониторинг
  const interval = setInterval(() => {
    logPoolStats();
  }, intervalMinutes * 60 * 1000);

  return interval;
}

/**
 * Останавливает мониторинг connection pool
 */
export function stopPoolMonitoring(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  console.log('[DB POOL MONITOR] Мониторинг остановлен');
}

/**
 * Проверяет здоровье connection pool
 */
export function checkPoolHealth(): { healthy: boolean; issues: string[] } {
  const stats = getPoolStats();
  const issues: string[] = [];
  
  // Проверка на превышение лимитов
  if (stats.waitingCount > 5) {
    issues.push('Большое количество ожидающих подключений');
  }
  
  if (stats.activeCount > 15) {
    issues.push('Высокое количество активных подключений');
  }
  
  if (stats.totalCount === 0) {
    issues.push('Нет активных подключений к базе данных');
  }
  
  return {
    healthy: issues.length === 0,
    issues
  };
}

/**
 * Расширенная статистика с анализом производительности
 */
export function getDetailedPoolStats(): PoolStats & { 
  healthy: boolean; 
  issues: string[];
  utilizationPercent: number;
} {
  const stats = getPoolStats();
  const health = checkPoolHealth();
  
  const utilizationPercent = stats.totalCount > 0 
    ? Math.round((stats.activeCount / stats.totalCount) * 100)
    : 0;
  
  return {
    ...stats,
    ...health,
    utilizationPercent
  };
}