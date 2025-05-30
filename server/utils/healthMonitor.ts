
interface HealthMetrics {
  uptime: number;
  memory: NodeJS.MemoryUsage;
  dbConnected: boolean;
  apiResponseTime: number;
  activeConnections: number;
  lastError?: string;
}

class HealthMonitor {
  private metrics: HealthMetrics = {
    uptime: 0,
    memory: process.memoryUsage(),
    dbConnected: false,
    apiResponseTime: 0,
    activeConnections: 0
  };

  private startTime = Date.now();
  private lastHealthCheck = Date.now();

  updateMetrics() {
    this.metrics.uptime = Date.now() - this.startTime;
    this.metrics.memory = process.memoryUsage();
    this.lastHealthCheck = Date.now();
  }

  setDbStatus(connected: boolean) {
    this.metrics.dbConnected = connected;
  }

  recordApiResponse(responseTime: number) {
    this.metrics.apiResponseTime = responseTime;
  }

  setActiveConnections(count: number) {
    this.metrics.activeConnections = count;
  }

  setLastError(error: string) {
    this.metrics.lastError = error;
  }

  recordApiError(endpoint: string, error: string) {
    this.metrics.lastError = `${endpoint}: ${error}`;
    console.log(`[HealthMonitor] API Error recorded: ${endpoint} - ${error}`);
  }

  getHealthStatus(): HealthMetrics & { 
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  } {
    const memoryUsageMB = this.metrics.memory.heapUsed / 1024 / 1024;
    const isHighMemory = memoryUsageMB > 500; // Больше 500MB
    const isSlowResponse = this.metrics.apiResponseTime > 5000; // Больше 5 секунд
    const timeSinceLastCheck = Date.now() - this.lastHealthCheck;
    const isStale = timeSinceLastCheck > 300000; // 5 минут
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const issues: string[] = [];
    
    if (!this.metrics.dbConnected) {
      status = 'critical';
      issues.push('База данных недоступна');
    }
    
    if (isHighMemory) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`Высокое потребление памяти: ${memoryUsageMB.toFixed(0)}MB`);
    }
    
    if (isSlowResponse) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`Медленные API ответы: ${this.metrics.apiResponseTime}ms`);
    }
    
    if (isStale) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push('Устаревшие метрики здоровья');
    }

    return {
      ...this.metrics,
      status,
      issues
    };
  }
}

export const healthMonitor = new HealthMonitor();
