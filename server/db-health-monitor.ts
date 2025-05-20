/**
 * Модуль мониторинга состояния подключения к базе данных
 * 
 * Этот модуль объединяет функциональность ранее разделенных db-health.ts и db-monitor.ts,
 * предоставляя единый интерфейс для проверки состояния БД, сбора статистики и
 * управления процессом переподключения. Модуль устраняет циклические зависимости.
 */

import { Pool, PoolClient } from 'pg';
import { getDbConfig } from './db-config';

// Типы и интерфейсы
export type ConnectionStatus = 'ok' | 'error' | 'reconnecting';

export type CheckResult = {
  timestamp: string;
  success: boolean;
  responseTime: number;
  error?: string;
};

export type ReconnectResult = {
  timestamp: string;
  success: boolean;
  attempts: number;
  totalTime: number;
  error?: string;
};

export type MonitorStats = {
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

// Класс мониторинга
export class DatabaseMonitor {
  private pool: Pool;
  private status: ConnectionStatus = 'ok';
  private checkInterval: number = 30000; // 30 секунд по умолчанию
  private timerId: NodeJS.Timeout | null = null;
  private lastCheckResult: CheckResult | null = null;
  private lastReconnectResult: ReconnectResult | null = null;
  private reconnectingInProgress: boolean = false;
  private consecutiveFailures: number = 0;
  private maxConsecutiveFailures: number = 3;
  private onReconnectCallbacks: Array<(pool: Pool) => void> = [];
  
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
  
  /**
   * Создает экземпляр мониторинга
   * @param pool Пул подключений к БД
   * @param autoStart Автоматически запускать мониторинг
   */
  constructor(pool: Pool, autoStart: boolean = true) {
    this.pool = pool;
    
    if (autoStart) {
      this.start();
    }
  }
  
  /**
   * Запускает процесс мониторинга
   */
  public start(): void {
    if (this.timerId) {
      return;
    }
    
    // Немедленно выполняем первую проверку
    this.checkConnection();
    
    // Запускаем регулярные проверки
    this.timerId = setInterval(() => {
      this.checkConnection();
    }, this.checkInterval);
    
    console.log(`[DB Monitor] Мониторинг запущен, интервал: ${this.checkInterval}ms`);
  }
  
  /**
   * Останавливает процесс мониторинга
   */
  public stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      console.log('[DB Monitor] Мониторинг остановлен');
    }
  }
  
  /**
   * Проверяет состояние соединения
   * @returns Promise<boolean> Результат проверки
   */
  public async checkConnection(): Promise<boolean> {
    // Если уже выполняется переподключение, пропускаем проверку
    if (this.reconnectingInProgress) {
      return false;
    }
    
    const startTime = Date.now();
    let client: PoolClient | null = null;
    
    try {
      // Пытаемся получить соединение из пула
      client = await this.pool.connect();
      
      // Выполняем тестовый запрос
      const result = await client.query('SELECT NOW() as current_time');
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      this.stats.totalChecks++;
      
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
      
      console.log(`[DB Monitor] ✅ Соединение работает (${responseTime}ms)`);
      
      return true;
    } catch (error) {
      // Ошибка при проверке соединения
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.handleConnectionFailure(errorMessage, responseTime);
      
      return false;
    } finally {
      // Освобождаем клиент
      if (client) {
        try {
          client.release();
        } catch (releaseError) {
          console.error(`[DB Monitor] ❌ Ошибка при освобождении клиента:`, releaseError);
        }
      }
    }
  }
  
  /**
   * Обрабатывает ошибку соединения
   * @param error Сообщение об ошибке
   * @param responseTime Время ответа
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
    
    console.error(`[DB Monitor] ❌ Ошибка соединения (${responseTime}ms): ${error}`);
    
    // Устанавливаем статус ошибки
    this.status = 'error';
    
    // Если достигнуто максимальное количество последовательных ошибок, 
    // пытаемся переподключиться
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.attemptReconnect();
    }
  }
  
  /**
   * Пытается восстановить соединение с базой данных
   * @returns Promise<boolean> Результат переподключения
   */
  public async attemptReconnect(): Promise<boolean> {
    // Предотвращаем параллельные попытки переподключения
    if (this.reconnectingInProgress) {
      return false;
    }
    
    this.reconnectingInProgress = true;
    this.status = 'reconnecting';
    
    this.stats.totalReconnects++;
    const startTime = Date.now();
    
    console.log(`[DB Monitor] 🔄 Попытка переподключения после ${this.consecutiveFailures} последовательных ошибок`);
    
    try {
      // Безопасно закрываем текущий пул соединений
      try {
        await this.safelyEndPool(this.pool);
        console.log('[DB Monitor] Существующий пул соединений закрыт');
      } catch (endError) {
        console.warn('[DB Monitor] Ошибка при закрытии пула соединений (продолжаем):', 
          endError instanceof Error ? endError.message : 'Неизвестная ошибка');
      }
      
      // Создаем новый пул соединений
      const newPool = new Pool(getDbConfig());
      
      // Проверяем новое соединение
      const client = await this.safelyConnect(newPool);
      
      // Выполняем проверочный запрос
      const result = await client.query('SELECT NOW() as current_time');
      
      // Не забываем освободить клиент
      client.release();
      
      const endTime = Date.now();
      const reconnectTime = endTime - startTime;
      
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
      
      console.log(`[DB Monitor] ✅ Переподключение успешно (${reconnectTime}ms)`);
      
      // Сохраняем новый пул и оповещаем колбэки
      this.updatePool(newPool);
      
      return true;
    } catch (error) {
      // Ошибка при переподключении
      const endTime = Date.now();
      const reconnectTime = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Обрабатываем ошибку переподключения
      this.stats.failedReconnects++;
      this.status = 'error';
      
      // Сохраняем результат переподключения
      this.lastReconnectResult = {
        timestamp: new Date().toISOString(),
        success: false,
        attempts: 1,
        totalTime: reconnectTime,
        error: errorMessage,
      };
      
      console.error(`[DB Monitor] ❌ Ошибка переподключения (${reconnectTime}ms): ${errorMessage}`);
      
      return false;
    } finally {
      this.reconnectingInProgress = false;
    }
  }
  
  /**
   * Безопасно закрывает пул подключений с таймаутом
   * @param pool Пул подключений для закрытия
   * @returns Promise<void>
   */
  private async safelyEndPool(pool: Pool): Promise<void> {
    const endPromise = pool.end();
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn('[DB Monitor] Таймаут при закрытии пула подключений');
        resolve();
      }, 5000);
    });
    
    await Promise.race([endPromise, timeoutPromise]);
  }
  
  /**
   * Безопасно подключается к пулу с таймаутом
   * @param pool Пул подключений
   * @returns Promise<PoolClient>
   */
  private async safelyConnect(pool: Pool): Promise<PoolClient> {
    const connectPromise = pool.connect();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Таймаут подключения к пулу')), 10000);
    });
    
    return await Promise.race([connectPromise, timeoutPromise]);
  }
  
  /**
   * Обновляет внутренний пул и вызывает колбэки для обновления внешних ссылок
   * @param newPool Новый пул подключений
   */
  private updatePool(newPool: Pool): void {
    this.pool = newPool;
    
    // Вызываем все зарегистрированные колбэки с новым пулом
    for (const callback of this.onReconnectCallbacks) {
      try {
        callback(newPool);
      } catch (callbackError) {
        console.error('[DB Monitor] Ошибка в колбэке переподключения:', callbackError);
      }
    }
  }
  
  /**
   * Регистрирует колбэк для обновления внешних ссылок на пул
   * @param callback Функция обратного вызова
   */
  public onReconnect(callback: (pool: Pool) => void): void {
    this.onReconnectCallbacks.push(callback);
  }
  
  /**
   * Удаляет ранее зарегистрированный колбэк
   * @param callback Функция обратного вызова для удаления
   */
  public offReconnect(callback: (pool: Pool) => void): void {
    this.onReconnectCallbacks = this.onReconnectCallbacks.filter(cb => cb !== callback);
  }
  
  /**
   * Устанавливает интервал проверки соединения
   * @param interval Интервал в миллисекундах
   */
  public setCheckInterval(interval: number): void {
    if (interval < 1000) {
      throw new Error('Интервал должен быть не менее 1000 мс');
    }
    
    this.checkInterval = interval;
    
    // Перезапускаем мониторинг с новым интервалом
    if (this.timerId) {
      this.stop();
      this.start();
    }
    
    console.log(`[DB Monitor] ⚙️ Интервал проверки изменен на ${interval}ms`);
  }
  
  /**
   * Устанавливает максимальное число последовательных ошибок перед переподключением
   * @param max Максимальное количество ошибок
   */
  public setMaxConsecutiveFailures(max: number): void {
    if (max < 1) {
      throw new Error('Максимальное количество ошибок должно быть не менее 1');
    }
    
    this.maxConsecutiveFailures = max;
    console.log(`[DB Monitor] ⚙️ Максимальное количество последовательных ошибок: ${max}`);
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
    
    console.log(`[DB Monitor] 🔄 Статистика сброшена`);
  }
  
  /**
   * Получает текущий статус соединения
   * @returns ConnectionStatus
   */
  public getStatus(): ConnectionStatus {
    return this.status;
  }
  
  /**
   * Получает текущий интервал проверки
   * @returns number
   */
  public getCheckInterval(): number {
    return this.checkInterval;
  }
  
  /**
   * Получает результат последней проверки
   * @returns CheckResult | null
   */
  public getLastCheckResult(): CheckResult | null {
    return this.lastCheckResult;
  }
  
  /**
   * Получает результат последнего переподключения
   * @returns ReconnectResult | null
   */
  public getLastReconnectResult(): ReconnectResult | null {
    return this.lastReconnectResult;
  }
  
  /**
   * Получает статистику мониторинга
   * @returns MonitorStats
   */
  public getStats(): MonitorStats {
    return { ...this.stats }; // Возвращаем копию объекта
  }
  
  /**
   * Запускает принудительную проверку соединения
   * @returns Promise<boolean>
   */
  public async forceCheck(): Promise<boolean> {
    return await this.checkConnection();
  }
  
  /**
   * Запускает принудительное переподключение
   * @returns Promise<boolean>
   */
  public async forceReconnect(): Promise<boolean> {
    return await this.attemptReconnect();
  }
  
  /**
   * Получает текущий пул подключений
   * @returns Pool
   */
  public getPool(): Pool {
    return this.pool;
  }
}

// Создадим вспомогательные функции для совместимости с предыдущим API

/**
 * Проверяет соединение с базой данных
 * @param pool Пул подключений
 * @returns Promise<boolean> Результат проверки
 */
export async function checkConnection(pool: Pool): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[DB] Ошибка при проверке соединения:', error);
    return false;
  }
}

/**
 * Создает экземпляр монитора для указанного пула
 * @param pool Пул подключений
 * @returns DatabaseMonitor
 */
export function createMonitor(pool: Pool): DatabaseMonitor {
  return new DatabaseMonitor(pool);
}