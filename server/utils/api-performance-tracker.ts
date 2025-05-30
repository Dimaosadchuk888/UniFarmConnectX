
/**
 * Система отслеживания производительности API запросов
 * Включает метрики времени ответа, частоты запросов и ошибок
 */

interface ApiMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

interface PerformanceStats {
  endpoint: string;
  totalRequests: number;
  avgResponseTime: number;
  successRate: number;
  errorRate: number;
  lastHourRequests: number;
  slowestResponse: number;
  fastestResponse: number;
}

class ApiPerformanceTracker {
  private metrics: ApiMetric[] = [];
  private readonly maxMetrics = 10000; // Храним последние 10k запросов
  
  /**
   * Записывает метрику API запроса
   */
  recordMetric(metric: Omit<ApiMetric, 'timestamp'>) {
    this.metrics.push({
      ...metric,
      timestamp: new Date()
    });
    
    // Очищаем старые метрики если превышен лимит
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
  
  /**
   * Получает статистику по конкретному endpoint
   */
  getEndpointStats(endpoint: string): PerformanceStats | null {
    const endpointMetrics = this.metrics.filter(m => m.endpoint === endpoint);
    
    if (endpointMetrics.length === 0) {
      return null;
    }
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const lastHourMetrics = endpointMetrics.filter(m => m.timestamp > oneHourAgo);
    
    const responseTimes = endpointMetrics.map(m => m.responseTime);
    const successfulRequests = endpointMetrics.filter(m => m.statusCode >= 200 && m.statusCode < 400);
    
    return {
      endpoint,
      totalRequests: endpointMetrics.length,
      avgResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
      successRate: (successfulRequests.length / endpointMetrics.length) * 100,
      errorRate: ((endpointMetrics.length - successfulRequests.length) / endpointMetrics.length) * 100,
      lastHourRequests: lastHourMetrics.length,
      slowestResponse: Math.max(...responseTimes),
      fastestResponse: Math.min(...responseTimes)
    };
  }
  
  /**
   * Получает общую статистику производительности
   */
  getOverallStats(): {
    totalRequests: number;
    avgResponseTime: number;
    requestsPerMinute: number;
    topEndpoints: PerformanceStats[];
    slowestEndpoints: PerformanceStats[];
  } {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > tenMinutesAgo);
    
    // Группируем по endpoints
    const endpointGroups = new Map<string, ApiMetric[]>();
    this.metrics.forEach(metric => {
      if (!endpointGroups.has(metric.endpoint)) {
        endpointGroups.set(metric.endpoint, []);
      }
      endpointGroups.get(metric.endpoint)!.push(metric);
    });
    
    const endpointStats: PerformanceStats[] = [];
    endpointGroups.forEach((metrics, endpoint) => {
      const stats = this.getEndpointStats(endpoint);
      if (stats) {
        endpointStats.push(stats);
      }
    });
    
    // Сортируем по количеству запросов и времени ответа
    const topEndpoints = endpointStats
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 5);
      
    const slowestEndpoints = endpointStats
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 5);
    
    const allResponseTimes = this.metrics.map(m => m.responseTime);
    const avgResponseTime = allResponseTimes.length > 0 
      ? Math.round(allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length)
      : 0;
    
    return {
      totalRequests: this.metrics.length,
      avgResponseTime,
      requestsPerMinute: Math.round(recentMetrics.length / 10), // За последние 10 минут
      topEndpoints,
      slowestEndpoints
    };
  }
  
  /**
   * Очищает метрики старше указанного времени
   */
  cleanupOldMetrics(hoursOld: number = 24) {
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    const beforeCount = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    const afterCount = this.metrics.length;
    
    if (beforeCount !== afterCount) {
      console.log(`[Performance Tracker] Cleaned up ${beforeCount - afterCount} old metrics`);
    }
  }
  
  /**
   * Получает топ медленных endpoints
   */
  getSlowestEndpoints(limit: number = 10): PerformanceStats[] {
    const endpointGroups = new Map<string, ApiMetric[]>();
    this.metrics.forEach(metric => {
      if (!endpointGroups.has(metric.endpoint)) {
        endpointGroups.set(metric.endpoint, []);
      }
      endpointGroups.get(metric.endpoint)!.push(metric);
    });
    
    const endpointStats: PerformanceStats[] = [];
    endpointGroups.forEach((metrics, endpoint) => {
      const stats = this.getEndpointStats(endpoint);
      if (stats) {
        endpointStats.push(stats);
      }
    });
    
    return endpointStats
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, limit);
  }
  
  /**
   * Получает метрики в JSON формате для экспорта
   */
  exportMetrics() {
    return {
      metricsCount: this.metrics.length,
      overallStats: this.getOverallStats(),
      recentMetrics: this.metrics.slice(-100), // Последние 100 запросов
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
export const apiPerformanceTracker = new ApiPerformanceTracker();

// Middleware для автоматического отслеживания
export function createPerformanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Перехватываем завершение ответа
    const originalSend = res.send;
    res.send = function(data: any) {
      const responseTime = Date.now() - startTime;
      
      // Записываем метрику
      apiPerformanceTracker.recordMetric({
        endpoint: req.originalUrl,
        method: req.method,
        responseTime,
        statusCode: res.statusCode,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}
