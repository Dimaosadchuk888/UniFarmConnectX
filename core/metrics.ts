/**
 * Performance Metrics Collection for UniFarm
 * Tracks API response times, throughput, and system performance
 */

import { logger } from './logger';

interface MetricData {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  lastUpdate: Date;
}

interface SystemMetrics {
  apiCalls: Map<string, MetricData>;
  dbQueries: Map<string, MetricData>;
  wsConnections: number;
  activeFarmingSessions: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  startTime: Date;
}

class MetricsCollector {
  private metrics: SystemMetrics;
  private metricsInterval: NodeJS.Timer | null = null;

  constructor() {
    this.metrics = {
      apiCalls: new Map(),
      dbQueries: new Map(),
      wsConnections: 0,
      activeFarmingSessions: 0,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      startTime: new Date()
    };
  }

  /**
   * Record API call metrics
   */
  recordApiCall(endpoint: string, responseTime: number): void {
    const current = this.metrics.apiCalls.get(endpoint) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      lastUpdate: new Date()
    };

    current.count++;
    current.totalTime += responseTime;
    current.minTime = Math.min(current.minTime, responseTime);
    current.maxTime = Math.max(current.maxTime, responseTime);
    current.lastUpdate = new Date();

    this.metrics.apiCalls.set(endpoint, current);
  }

  /**
   * Record database query metrics
   */
  recordDbQuery(queryType: string, queryTime: number): void {
    const current = this.metrics.dbQueries.get(queryType) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      lastUpdate: new Date()
    };

    current.count++;
    current.totalTime += queryTime;
    current.minTime = Math.min(current.minTime, queryTime);
    current.maxTime = Math.max(current.maxTime, queryTime);
    current.lastUpdate = new Date();

    this.metrics.dbQueries.set(queryType, current);
  }

  /**
   * Update WebSocket connection count
   */
  updateWsConnections(count: number): void {
    this.metrics.wsConnections = count;
  }

  /**
   * Update active farming sessions count
   */
  updateFarmingSessions(count: number): void {
    this.metrics.activeFarmingSessions = count;
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary(): any {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Calculate API metrics
    const apiMetrics: any = {};
    this.metrics.apiCalls.forEach((data, endpoint) => {
      apiMetrics[endpoint] = {
        calls: data.count,
        avgTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
        minTime: data.minTime === Infinity ? 0 : data.minTime,
        maxTime: data.maxTime,
        lastUpdate: data.lastUpdate
      };
    });

    // Calculate DB metrics
    const dbMetrics: any = {};
    this.metrics.dbQueries.forEach((data, queryType) => {
      dbMetrics[queryType] = {
        queries: data.count,
        avgTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
        minTime: data.minTime === Infinity ? 0 : data.minTime,
        maxTime: data.maxTime,
        lastUpdate: data.lastUpdate
      };
    });

    return {
      system: {
        uptime: Math.floor(uptime),
        startTime: this.metrics.startTime,
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024) // MB
        },
        wsConnections: this.metrics.wsConnections,
        activeFarmingSessions: this.metrics.activeFarmingSessions
      },
      api: apiMetrics,
      database: dbMetrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Start periodic metrics logging
   */
  startMetricsLogging(intervalMs: number = 300000): void { // 5 minutes default
    if (this.metricsInterval) {
      this.stopMetricsLogging();
    }

    this.metricsInterval = setInterval(() => {
      const summary = this.getMetricsSummary();
      logger.info('[Metrics] Performance summary', summary);
    }, intervalMs);

    logger.info('[Metrics] Performance metrics logging started');
  }

  /**
   * Stop metrics logging
   */
  stopMetricsLogging(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
      logger.info('[Metrics] Performance metrics logging stopped');
    }
  }

  /**
   * Express middleware for automatic API metrics
   */
  apiMetricsMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      const originalEnd = res.end;

      res.end = function(...args: any[]) {
        const responseTime = Date.now() - startTime;
        const endpoint = `${req.method} ${req.route?.path || req.path}`;
        
        metricsCollector.recordApiCall(endpoint, responseTime);
        
        // Log slow requests
        if (responseTime > 1000) {
          logger.warn('[Metrics] Slow API request', {
            endpoint,
            responseTime,
            ip: req.ip
          });
        }

        originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Database query wrapper for metrics
   */
  async trackDbQuery<T>(queryType: string, queryFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const queryTime = Date.now() - startTime;
      
      this.recordDbQuery(queryType, queryTime);
      
      // Log slow queries
      if (queryTime > 500) {
        logger.warn('[Metrics] Slow database query', {
          queryType,
          queryTime
        });
      }
      
      return result;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.recordDbQuery(`${queryType}_error`, queryTime);
      throw error;
    }
  }
}

export const metricsCollector = new MetricsCollector();