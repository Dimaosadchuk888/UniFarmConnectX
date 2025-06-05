/**
 * Production Health Check System for UniFarm
 * Мониторинг состояния всех компонентов системы
 */

import { db } from './core/db.js';
import { logger } from './core/logger.js';

class HealthCheckSystem {
  constructor() {
    this.checks = new Map();
    this.lastResults = new Map();
    this.setupChecks();
  }

  setupChecks() {
    // Database connectivity check
    this.checks.set('database', async () => {
      try {
        const result = await db.execute('SELECT 1 as health');
        return {
          status: 'healthy',
          responseTime: Date.now(),
          details: 'Database connection successful'
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          details: 'Database connection failed'
        };
      }
    });

    // Memory usage check
    this.checks.set('memory', async () => {
      const memUsage = process.memoryUsage();
      const freeMemory = require('os').freemem();
      const totalMemory = require('os').totalmem();
      const memoryUsagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;

      return {
        status: memoryUsagePercent < 90 ? 'healthy' : 'warning',
        details: {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
          systemUsage: Math.round(memoryUsagePercent)
        }
      };
    });

    // Telegram Bot check
    this.checks.set('telegram', async () => {
      try {
        if (!process.env.TELEGRAM_BOT_TOKEN) {
          return {
            status: 'warning',
            details: 'Telegram bot token not configured'
          };
        }

        const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
        const data = await response.json();
        
        if (data.ok) {
          return {
            status: 'healthy',
            details: `Bot @${data.result.username} is active`
          };
        } else {
          return {
            status: 'unhealthy',
            error: data.description
          };
        }
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message
        };
      }
    });

    // API endpoints check
    this.checks.set('api', async () => {
      const endpoints = [
        '/api/v2/user/profile',
        '/api/v2/farming/status',
        '/api/v2/wallet/balance'
      ];

      const results = [];
      for (const endpoint of endpoints) {
        try {
          const start = Date.now();
          const response = await fetch(`http://localhost:${process.env.PORT || 3000}${endpoint}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          const responseTime = Date.now() - start;
          
          results.push({
            endpoint,
            status: response.status < 500 ? 'healthy' : 'unhealthy',
            responseTime,
            statusCode: response.status
          });
        } catch (error) {
          results.push({
            endpoint,
            status: 'unhealthy',
            error: error.message
          });
        }
      }

      const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
      return {
        status: unhealthyCount === 0 ? 'healthy' : unhealthyCount < endpoints.length ? 'warning' : 'unhealthy',
        details: results
      };
    });
  }

  async runAllChecks() {
    const results = {};
    const checkNames = Array.from(this.checks.keys());
    
    for (const name of checkNames) {
      const check = this.checks.get(name);
      const startTime = Date.now();
      
      try {
        const result = await check();
        const duration = Date.now() - startTime;
        
        results[name] = {
          name,
          timestamp: new Date().toISOString(),
          duration,
          ...result
        };
      } catch (error) {
        results[name] = {
          name,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          status: 'error',
          error: error.message
        };
      }
    }

    // Determine overall health
    const statuses = Object.values(results).map(r => r.status);
    const overallStatus = statuses.every(s => s === 'healthy') ? 'healthy' :
                         statuses.some(s => s === 'unhealthy' || s === 'error') ? 'unhealthy' : 'warning';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }
}

// Express middleware for health endpoint
function createHealthEndpoint(healthChecker) {
  return async (req, res) => {
    try {
      const results = await healthChecker.runAllChecks();
      
      const statusCode = results.status === 'healthy' ? 200 :
                        results.status === 'warning' ? 200 : 503;

      res.status(statusCode).json(results);
    } catch (error) {
      res.status(503).json({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

export {
  HealthCheckSystem,
  createHealthEndpoint
};