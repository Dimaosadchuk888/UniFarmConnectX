/**
 * Real-time performance monitoring system for UniFarm
 * Tracks system metrics, database performance, and API response times
 */

import { supabase } from './supabase';

interface PerformanceData {
  operation: string;
  duration: number;
  memory_usage: number;
  cpu_usage?: number;
  status: 'success' | 'error' | 'timeout';
  error_message?: string;
  batch_id?: string;
}

interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    activeConnections: number;
    avgResponseTime: number;
    errorRate: number;
  };
  api: {
    requestsPerMinute: number;
    avgResponseTime: number;
    errorRate: number;
  };
}

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private startTime: number = Date.now();
  private operationTimers: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  startTimer(operationId: string): void {
    this.operationTimers.set(operationId, performance.now());
  }

  /**
   * End timing and record performance data
   */
  async endTimer(operationId: string, operation: string, status: 'success' | 'error' | 'timeout' = 'success', errorMessage?: string): Promise<void> {
    const startTime = this.operationTimers.get(operationId);
    if (!startTime) {
      console.warn(`[PerformanceMonitor] No start time found for operation: ${operationId}`);
      return;
    }

    const duration = performance.now() - startTime;
    const memoryUsage = process.memoryUsage();

    const performanceData: PerformanceData = {
      operation,
      duration,
      memory_usage: memoryUsage.heapUsed,
      status,
      error_message: errorMessage
    };

    await this.recordMetric(performanceData);
    this.operationTimers.delete(operationId);
  }

  /**
   * Record performance metric to database
   */
  private async recordMetric(data: PerformanceData): Promise<void> {
    try {
      await db.insert(performance_metrics).values({
        operation: data.operation,
        duration_ms: data.duration.toString(),
        batch_id: data.batch_id || null,
        details: data.error_message || null
      });
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to record metric:', error);
    }
  }

  /**
   * Track referral system performance specifically
   */
  async trackReferralOperation(userId: string, operation: 'validate' | 'process' | 'calculate', func: () => Promise<any>): Promise<any> {
    const operationId = `referral_${operation}_${userId}_${Date.now()}`;
    
    this.startTimer(operationId);
    
    try {
      const result = await func();
      await this.endTimer(operationId, `referral_${operation}`, 'success');
      return result;
    } catch (error) {
      await this.endTimer(operationId, `referral_${operation}`, 'error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get current system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.rss + memoryUsage.external;

    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: totalMemory,
        percentage: (memoryUsage.heapUsed / totalMemory) * 100
      },
      database: {
        activeConnections: 5,
        avgResponseTime: await this.getAverageResponseTime('database'),
        errorRate: await this.getErrorRate('database')
      },
      api: {
        requestsPerMinute: await this.getRequestsPerMinute(),
        avgResponseTime: await this.getAverageResponseTime('api'),
        errorRate: await this.getErrorRate('api')
      }
    };
  }

  /**
   * Get average response time for operation type
   */
  private async getAverageResponseTime(operationType: string): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const metrics = await db
        .select()
        .from(performance_metrics)
        .where(sql`operation LIKE ${operationType + '%'} AND timestamp >= ${oneHourAgo}`)
        .limit(100);

      if (metrics.length === 0) return 0;

      const totalDuration = metrics.reduce((sum, metric) => sum + parseFloat(metric.duration_ms), 0);
      return totalDuration / metrics.length;
    } catch (error) {
      console.error('[PerformanceMonitor] Error calculating average response time:', error);
      return 0;
    }
  }

  /**
   * Get error rate for operation type
   */
  private async getErrorRate(operationType: string): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const allMetrics = await db
        .select()
        .from(performance_metrics)
        .where(sql`operation LIKE ${operationType + '%'} AND timestamp >= ${oneHourAgo}`)
        .limit(1000);

      if (allMetrics.length === 0) return 0;

      const errorCount = allMetrics.filter(m => m.details && m.details.includes('error')).length;
      return (errorCount / allMetrics.length) * 100;
    } catch (error) {
      console.error('[PerformanceMonitor] Error calculating error rate:', error);
      return 0;
    }
  }

  /**
   * Get requests per minute
   */
  private async getRequestsPerMinute(): Promise<number> {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      
      const recentMetrics = await db
        .select()
        .from(performance_metrics)
        .where(sql`timestamp >= ${oneMinuteAgo}`);

      return recentMetrics.length;
    } catch (error) {
      console.error('[PerformanceMonitor] Error calculating requests per minute:', error);
      return 0;
    }
  }

  /**
   * Detect performance bottlenecks
   */
  async detectBottlenecks(): Promise<string[]> {
    const bottlenecks: string[] = [];
    const metrics = await this.getSystemMetrics();

    if (metrics.memory.percentage > 80) {
      bottlenecks.push(`High memory usage: ${metrics.memory.percentage.toFixed(1)}%`);
    }

    if (metrics.database.avgResponseTime > 1000) {
      bottlenecks.push(`Slow database responses: ${metrics.database.avgResponseTime.toFixed(0)}ms average`);
    }

    if (metrics.database.errorRate > 5) {
      bottlenecks.push(`High database error rate: ${metrics.database.errorRate.toFixed(1)}%`);
    }

    if (metrics.api.errorRate > 5) {
      bottlenecks.push(`High API error rate: ${metrics.api.errorRate.toFixed(1)}%`);
    }

    if (metrics.api.requestsPerMinute > 1000) {
      bottlenecks.push(`High request rate: ${metrics.api.requestsPerMinute} requests/minute`);
    }

    return bottlenecks;
  }

  /**
   * Generate performance report
   */
  async generateReport(): Promise<{
    uptime: number;
    systemMetrics: SystemMetrics;
    bottlenecks: string[];
    recommendations: string[];
  }> {
    const uptime = Date.now() - this.startTime;
    const systemMetrics = await this.getSystemMetrics();
    const bottlenecks = await this.detectBottlenecks();
    
    const recommendations: string[] = [];

    if (systemMetrics.memory.percentage > 70) {
      recommendations.push('Consider implementing memory cleanup routines');
    }

    if (systemMetrics.database.avgResponseTime > 500) {
      recommendations.push('Optimize database queries and consider adding indexes');
    }

    if (systemMetrics.api.errorRate > 3) {
      recommendations.push('Investigate and fix API error sources');
    }

    if (bottlenecks.length === 0) {
      recommendations.push('System is performing well - consider load testing');
    }

    return {
      uptime,
      systemMetrics,
      bottlenecks,
      recommendations
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();