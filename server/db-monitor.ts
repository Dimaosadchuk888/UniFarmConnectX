/**
 * Модуль мониторинга соединения с базой данных
 * 
 * Этот класс отслеживает состояние соединения с базой данных,
 * собирает статистику и предоставляет возможности для управления
 * проверками соединения.
 */

import { Pool, PoolClient } from 'pg';

type ConnectionStatus = 'ok' | 'error' | 'reconnecting';
type CheckResult = {
  timestamp: string;
  success: boolean;
  responseTime: number;
  error?: string;
};

type ReconnectResult = {
  timestamp: string;
  success: boolean;
  attempts: number;
  totalTime: number;
  error?: string;
};

type MonitorStats = {
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  totalReconnects: number;
  successfulReconnects: number;
  failedReconnects: number;
  avgResponseTime: number;
  avgReconnectTime: number;
  uptime: number;
  downtime: number;
  startTime: string;
  lastDownTime?: string;
  lastUpTime?: string;
};

class DatabaseMonitor {
  private static instance: DatabaseMonitor;
  private status: ConnectionStatus = 'ok';
  private checkInterval: number = 30000; // 30 секунд по умолчанию
  private timerId: NodeJS.Timeout | null = null;
  private lastCheckResult: CheckResult | null = null;
  private lastReconnectResult: ReconnectResult | null = null;
  private reconnectingInProgress: boolean = false;
  private consecutiveFailures: number = 0;
  private maxConsecutiveFailures: number = 3;
  
  // Статистика
  private stats: MonitorStats = {
    totalChecks: 0,
    successfulChecks: 0,
    failedChecks: 0,
    totalReconnects: 0,
    successfulReconnects: 0,
    failedReconnects: 0,
    avgResponseTime: 0,
    avgReconnectTime: 0,
    uptime: 0,
    downtime: 0,
    startTime: new Date().toISOString(),
  };
  
  private constructor() {
    this.startMonitoring();
  }
  
  /**
   * Получение экземпляра класса (синглтон)
   */
  public static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
  }
  
  /**
   * Запускает процесс мониторинга соединения
   */
  private startMonitoring(): void {
    // Немедленно выполняем первую проверку
    this.checkConnection();
    
    // Запускаем регулярные проверки
    this.timerId = setInterval(() => {
      this.checkConnection();
    }, this.checkInterval);
  }
  
  /**
   * Проверяет состояние соединения с базой данных
   */
  private async checkConnection(): Promise<void> {
    // Если уже выполняется переподключение, пропускаем проверку
    if (this.reconnectingInProgress) {
      return;
    }
    
    const startTime = Date.now();
    
    try {
      const isConnected = await testConnection();
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      this.stats.totalChecks++;
      
      if (isConnected) {
        // Соединение успешно
        this.status = 'ok';
        this.consecutiveFailures = 0;
        this.stats.successfulChecks++;
        
        // Если это первое успешное соединение после сбоя, фиксируем время
        if (!this.stats.lastUpTime || this.stats.lastDownTime && new Date(this.stats.lastDownTime) > new Date(this.stats.lastUpTime)) {
          this.stats.lastUpTime = new Date().toISOString();
        }
        
        // Обновляем среднее время отклика
        this.stats.avgResponseTime = 
          (this.stats.avgResponseTime * (this.stats.successfulChecks - 1) + responseTime) / 
          this.stats.successfulChecks;
        
        // Увеличиваем время работы
        this.stats.uptime += this.checkInterval / 1000; // в секундах
        
        // Сохраняем результат проверки
        this.lastCheckResult = {
          timestamp: new Date().toISOString(),
          success: true,
          responseTime,
        };
        
        console.log(`[${new Date().toISOString()}] ✅ Мониторинг БД: соединение работает (${responseTime}ms)`);
      } else {
        // Соединение не работает
        this.handleConnectionFailure('Проверка соединения вернула отрицательный результат', responseTime);
      }
    } catch (error) {
      // Ошибка при проверке соединения
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.handleConnectionFailure(errorMessage, responseTime);
    }
  }
  
  /**
   * Обрабатывает ошибку соединения
   */
  private handleConnectionFailure(error: string, responseTime: number): void {
    this.stats.totalChecks++;
    this.stats.failedChecks++;
    this.consecutiveFailures++;
    
    // Фиксируем время сбоя
    this.stats.lastDownTime = new Date().toISOString();
    
    // Увеличиваем время простоя
    this.stats.downtime += this.checkInterval / 1000; // в секундах
    
    // Сохраняем результат проверки
    this.lastCheckResult = {
      timestamp: new Date().toISOString(),
      success: false,
      responseTime,
      error,
    };
    
    console.error(`[${new Date().toISOString()}] ❌ Мониторинг БД: ошибка соединения (${responseTime}ms): ${error}`);
    
    // Если достигнуто максимальное количество последовательных ошибок, 
    // пытаемся переподключиться
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.attemptReconnect();
    }
  }
  
  /**
   * Пытается восстановить соединение с базой данных
   */
  private async attemptReconnect(): Promise<void> {
    // Предотвращаем параллельные попытки переподключения
    if (this.reconnectingInProgress) {
      return;
    }
    
    this.reconnectingInProgress = true;
    this.status = 'reconnecting';
    
    this.stats.totalReconnects++;
    const startTime = Date.now();
    
    console.log(`[${new Date().toISOString()}] 🔄 Мониторинг БД: попытка переподключения после ${this.consecutiveFailures} последовательных ошибок`);
    
    try {
      const isReconnected = await reconnect();
      const endTime = Date.now();
      const reconnectTime = endTime - startTime;
      
      if (isReconnected) {
        // Переподключение успешно
        this.stats.successfulReconnects++;
        this.status = 'ok';
        this.consecutiveFailures = 0;
        
        // Обновляем среднее время переподключения
        this.stats.avgReconnectTime = 
          (this.stats.avgReconnectTime * (this.stats.successfulReconnects - 1) + reconnectTime) / 
          this.stats.successfulReconnects;
        
        // Фиксируем время восстановления
        this.stats.lastUpTime = new Date().toISOString();
        
        // Сохраняем результат переподключения
        this.lastReconnectResult = {
          timestamp: new Date().toISOString(),
          success: true,
          attempts: 1,
          totalTime: reconnectTime,
        };
        
        console.log(`[${new Date().toISOString()}] ✅ Мониторинг БД: переподключение успешно (${reconnectTime}ms)`);
      } else {
        // Не удалось переподключиться
        this.handleReconnectFailure('Переподключение не выполнено', reconnectTime);
      }
    } catch (error) {
      // Ошибка при переподключении
      const endTime = Date.now();
      const reconnectTime = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.handleReconnectFailure(errorMessage, reconnectTime);
    } finally {
      this.reconnectingInProgress = false;
    }
  }
  
  /**
   * Обрабатывает ошибку переподключения
   */
  private handleReconnectFailure(error: string, reconnectTime: number): void {
    this.stats.failedReconnects++;
    this.status = 'error';
    
    // Сохраняем результат переподключения
    this.lastReconnectResult = {
      timestamp: new Date().toISOString(),
      success: false,
      attempts: 1,
      totalTime: reconnectTime,
      error,
    };
    
    console.error(`[${new Date().toISOString()}] ❌ Мониторинг БД: ошибка переподключения (${reconnectTime}ms): ${error}`);
  }
  
  /**
   * Останавливает мониторинг
   */
  public stopMonitoring(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
  
  /**
   * Возобновляет мониторинг
   */
  public resumeMonitoring(): void {
    if (!this.timerId) {
      this.startMonitoring();
    }
  }
  
  /**
   * Устанавливает интервал проверки соединения
   */
  public setCheckInterval(interval: number): void {
    if (interval < 1000) {
      throw new Error('Интервал должен быть не менее 1000 мс');
    }
    
    this.checkInterval = interval;
    
    // Перезапускаем мониторинг с новым интервалом
    if (this.timerId) {
      this.stopMonitoring();
      this.startMonitoring();
    }
    
    console.log(`[${new Date().toISOString()}] ⚙️ Мониторинг БД: интервал проверки изменен на ${interval}ms`);
  }
  
  /**
   * Сбрасывает статистику мониторинга
   */
  public resetStats(): void {
    this.stats = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      totalReconnects: 0,
      successfulReconnects: 0,
      failedReconnects: 0,
      avgResponseTime: 0,
      avgReconnectTime: 0,
      uptime: 0,
      downtime: 0,
      startTime: new Date().toISOString(),
    };
    
    console.log(`[${new Date().toISOString()}] 🔄 Мониторинг БД: статистика сброшена`);
  }
  
  /**
   * Возвращает текущий статус соединения
   */
  public getStatus(): ConnectionStatus {
    return this.status;
  }
  
  /**
   * Возвращает интервал проверки соединения
   */
  public getCheckInterval(): number {
    return this.checkInterval;
  }
  
  /**
   * Возвращает результат последней проверки соединения
   */
  public getLastCheckResult(): CheckResult | null {
    return this.lastCheckResult;
  }
  
  /**
   * Возвращает результат последнего переподключения
   */
  public getLastReconnectResult(): ReconnectResult | null {
    return this.lastReconnectResult;
  }
  
  /**
   * Возвращает статистику мониторинга
   */
  public getStats(): MonitorStats {
    return { ...this.stats }; // Возвращаем копию объекта
  }
  
  /**
   * Запускает принудительную проверку соединения
   */
  public async forceCheck(): Promise<boolean> {
    await this.checkConnection();
    return this.status === 'ok';
  }
  
  /**
   * Запускает принудительное переподключение
   */
  public async forceReconnect(): Promise<boolean> {
    await this.attemptReconnect();
    return this.status === 'ok';
  }
}

// Создаем экземпляр класса
const databaseMonitor = DatabaseMonitor.getInstance();

// Экспортируем экземпляр класса
export default databaseMonitor;