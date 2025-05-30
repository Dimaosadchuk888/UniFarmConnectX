
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

  getHealthStatus(): HealthMetrics & { status: 'healthy' | 'warning' | 'critical' } {
    const memoryUsageMB = this.metrics.memory.heapUsed / 1024 / 1024;
    const isHighMemory = memoryUsageMB > 500; // Больше 500MB
    const isSlowResponse = this.metrics.apiResponseTime > 5000; // Больше 5 секунд
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (!this.metrics.dbConnected) {
      status = 'critical';
    } else if (isHighMemory || isSlowResponse) {
      status = 'warning';
    }

    return {
      ...this.metrics,
      status
    };
  }
}

export const healthMonitor = new HealthMonitor();
