
import { Request, Response } from 'express';
import { healthMonitor } from '../utils/healthMonitor';
import PerformanceMonitor from '../services/performanceMonitor';

/**
 * Получение метрик производительности системы
 */
export async function getMetrics(req: Request, res: Response) {
  try {
    const [healthStatus, systemHealth, performanceReport] = await Promise.all([
      healthMonitor.getHealthStatus(),
      PerformanceMonitor.getSystemHealth(),
      PerformanceMonitor.getPerformanceReport()
    ]);

    const metrics = {
      timestamp: new Date().toISOString(),
      health: {
        status: healthStatus.status,
        uptime: healthStatus.uptime,
        memory: {
          used: `${Math.round(healthStatus.memory.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(healthStatus.memory.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(healthStatus.memory.rss / 1024 / 1024)}MB`
        },
        dbConnected: healthStatus.dbConnected,
        activeConnections: healthStatus.activeConnections,
        avgResponseTime: `${healthStatus.apiResponseTime}ms`,
        issues: healthStatus.issues || []
      },
      performance: {
        totalOperations: performanceReport.totalOperations,
        avgDuration: `${Math.round(performanceReport.avgDuration)}ms`,
        successRate: `${(performanceReport.successRate * 100).toFixed(1)}%`,
        slowOperations: performanceReport.slowOperations.slice(0, 5)
      },
      system: {
        activeUsers: systemHealth.activeUsers,
        totalTransactions: systemHealth.totalTransactions,
        systemLoad: systemHealth.systemLoad,
        databaseConnected: systemHealth.databaseConnected
      }
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('[Metrics] Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Сброс метрик производительности
 */
export async function resetMetrics(req: Request, res: Response) {
  try {
    // Очищаем метрики старше 1 часа
    await PerformanceMonitor.clearOldMetrics(1);
    
    res.json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Metrics] Error resetting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset metrics'
    });
  }
}
