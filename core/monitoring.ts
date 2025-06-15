/**
 * System Monitoring and Health Check for UniFarm
 * Now uses Supabase API exclusively
 */

import { supabase } from './supabase';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceStatus;
    application: ServiceStatus;
    environment: ServiceStatus;
  };
  metrics: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    activeConnections: number;
  };
}

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

class HealthMonitor {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  async checkDatabase(): Promise<ServiceStatus> {
    const startTime = Date.now();
    try {
      // Supabase API connection test
      const { data, error } = await supabase.from('users').select('id').limit(1);
      if (error) throw error;
      
      return {
        status: 'up',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      console.warn('[Monitor] Supabase API connection failed:', errorMessage);
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: errorMessage
      };
    }
  }

  checkEnvironment(): ServiceStatus {
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_KEY',
      'NODE_ENV',
      'PORT'
    ];

    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingVars.length > 0) {
      return {
        status: 'degraded',
        lastCheck: new Date().toISOString(),
        error: `Missing environment variables: ${missingVars.join(', ')}`
      };
    }

    return {
      status: 'up',
      lastCheck: new Date().toISOString()
    };
  }

  checkApplication(): ServiceStatus {
    const memoryUsage = process.memoryUsage();
    const maxMemory = 512 * 1024 * 1024; // 512MB threshold
    
    if (memoryUsage.heapUsed > maxMemory) {
      return {
        status: 'degraded',
        lastCheck: new Date().toISOString(),
        error: `High memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
      };
    }

    return {
      status: 'up',
      lastCheck: new Date().toISOString()
    };
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const database = await this.checkDatabase();
    const environment = this.checkEnvironment();
    const application = this.checkApplication();

    const allServicesHealthy = [database, environment, application]
      .every(service => service.status === 'up');

    const anyServiceDown = [database, environment, application]
      .some(service => service.status === 'down');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (anyServiceDown) {
      overallStatus = 'unhealthy';
    } else if (allServicesHealthy) {
      overallStatus = 'healthy';
    } else {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database,
        environment,
        application
      },
      metrics: {
        uptime: Date.now() - this.startTime,
        memory: process.memoryUsage(),
        activeConnections: 0 // TODO: Implement connection tracking
      }
    };
  }

  startMonitoring(intervalMs: number = 30000) {
    setInterval(async () => {
      const health = await this.getHealthStatus();
      if (health.status !== 'healthy') {
        console.warn(`[Monitor] System status: ${health.status}`);
        if (health.services.database.status === 'down') {
          console.error('[Monitor] Database connection lost');
        }
        if (health.services.application.status === 'degraded') {
          console.warn('[Monitor] Application performance degraded');
        }
      }
    }, intervalMs);

    console.log('[Monitor] Health monitoring started');
  }
}

export { HealthMonitor, type HealthStatus };