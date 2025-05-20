/**
 * Модуль мониторинга состояния подключения к базе данных
 * 
 * Этот модуль объединяет функциональность ранее разделенных db-health.ts и db-monitor.ts,
 * предоставляя единый интерфейс для проверки состояния БД, сбора статистики и
 * управления процессом переподключения. Модуль устраняет циклические зависимости.
 */

import { Pool, PoolClient } from 'pg';
import { getDbConfig } from './db-config';

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

  // Статистика мониторинга
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
    startTime: new Date().toISOString()
  };

  /**
   * Создает экземпляр мониторинга
   * @param pool Пул подключений к БД
   * @param autoStart Автоматически запускать мониторинг
   */
  constructor(pool: Pool, autoStart: boolean = false) {
    this.pool = pool;
    
    if (autoStart) {
      this.start();
    }
  }
  
  /**
   * Запускает процесс мониторинга
   */
  public start(): void {
    if (this.timerId !== null) {
      this.stop(); // Остановить существующий мониторинг, если он уже запущен
    }
    
    // Запускаем первую проверку немедленно
    this.checkConnection().catch(err => {
      console.error('[DB Monitor] Ошибка при начальной проверке:', err);
    });
    
    // Запускаем периодические проверки
    this.timerId = setInterval(() => {
      this.checkConnection().catch(err => {
        console.error('[DB Monitor] Ошибка при проверке соединения:', err);
      });
    }, this.checkInterval);
  }
  
  /**
   * Останавливает процесс мониторинга
   */
  public stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
  
  /**
   * Проверяет состояние соединения
   * @returns Promise<boolean> Результат проверки
   */
  public async checkConnection(): Promise<boolean> {
    const startTime = Date.now();
    let client: PoolClient | null = null;
    
    try {
      // Увеличиваем счетчик общего числа проверок
      this.stats.totalChecks++;
      
      // Пытаемся получить подключение с таймаутом
      client = await this.safelyConnect(this.pool);
      
      // Выполняем простой запрос для проверки соединения
      await client.query('SELECT 1');
      
      // Если запрос успешен, обновляем счетчики
      const responseTime = Date.now() - startTime;
      
      // Обновляем статистику
      this.stats.successfulChecks++;
      this.stats.avgResponseTime = 
        (this.stats.avgResponseTime * (this.stats.successfulChecks - 1) + responseTime) / 
        this.stats.successfulChecks;
      
      if (this.status !== 'ok') {
        this.stats.lastUpTime = new Date().toISOString();
        console.log(`[DB Monitor] ✅ Соединение восстановлено (${responseTime}ms)`);
      }
      
      // Сбрасываем счетчик последовательных ошибок
      this.consecutiveFailures = 0;
      
      // Обновляем статус и результат последней проверки
      this.status = 'ok';
      this.lastCheckResult = {
        timestamp: new Date().toISOString(),
        success: true,
        responseTime
      };
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const responseTime = Date.now() - startTime;
      
      // Обрабатываем ошибку соединения
      this.handleConnectionFailure(errorMessage, responseTime);
      
      return false;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  
  /**
   * Обрабатывает ошибку соединения
   * @param error Сообщение об ошибке
   * @param responseTime Время ответа
   */
  private handleConnectionFailure(error: string, responseTime: number): void {
    // Обновляем статистику
    this.stats.failedChecks++;
    
    // Записываем результат последней проверки
    this.lastCheckResult = {
      timestamp: new Date().toISOString(),
      success: false,
      responseTime,
      error
    };
    
    // Увеличиваем счетчик последовательных ошибок
    this.consecutiveFailures++;
    
    // Если это первая ошибка (переход из статуса ok), фиксируем время
    if (this.status === 'ok') {
      this.stats.lastDownTime = new Date().toISOString();
    }
    
    // Обновляем статус
    this.status = 'error';
    
    // Проверяем необходимость переподключения
    if (this.consecutiveFailures >= this.maxConsecutiveFailures && !this.reconnectingInProgress) {
      console.warn(`[DB Monitor] ⚠️ ${this.consecutiveFailures} последовательных ошибок соединения. Попытка переподключения...`);
      
      // Запускаем процесс переподключения
      this.attemptReconnect().catch(reconnectError => {
        console.error('[DB Monitor] Ошибка при попытке переподключения:', reconnectError);
      });
    } else {
      console.warn(`[DB Monitor] ⚠️ Ошибка соединения (${responseTime}ms): ${error}`);
    }
  }
  
  /**
   * Пытается восстановить соединение с базой данных
   * @returns Promise<boolean> Результат переподключения
   */
  public async attemptReconnect(): Promise<boolean> {
    // Если переподключение уже в процессе, возвращаем Promise с результатом
    if (this.reconnectingInProgress) {
      console.log('[DB Monitor] Переподключение уже выполняется. Ожидание...');
      
      // Ждем, пока завершится текущее переподключение и возвращаем его результат
      return new Promise<boolean>((resolve) => {
        const checkStatus = () => {
          if (!this.reconnectingInProgress) {
            resolve(this.status === 'ok');
          } else {
            setTimeout(checkStatus, 500);
          }
        };
        
        setTimeout(checkStatus, 500);
      });
    }
    
    this.reconnectingInProgress = true;
    this.status = 'reconnecting';
    
    const startTime = Date.now();
    let success = false;
    let attempts = 0;
    let lastError = '';
    
    try {
      // Обновляем статистику
      this.stats.totalReconnects++;
      
      console.log('[DB Monitor] 🔄 Попытка переподключения к базе данных...');
      
      // Максимальное количество попыток переподключения
      const maxRetries = 5;
      
      // Пытаемся создать новый пул соединений
      for (let retry = 0; retry < maxRetries; retry++) {
        attempts++;
        
        try {
          // Получаем актуальную конфигурацию
          const dbConfig = getDbConfig();
          
          // Создаем новый пул
          const newPool = new Pool(dbConfig);
          
          // Пробуем подключиться через новый пул
          const client = await this.safelyConnect(newPool);
          
          // Выполняем тестовый запрос
          await client.query('SELECT 1');
          
          // Если дошли до этой точки - подключение успешно
          client.release();
          
          // Закрываем старый пул
          await this.safelyEndPool(this.pool);
          
          // Обновляем пул и вызываем колбэки
          this.updatePool(newPool);
          
          // Обновляем статус и статистику
          this.status = 'ok';
          success = true;
          
          // Сбрасываем счетчик ошибок
          this.consecutiveFailures = 0;
          
          console.log(`[DB Monitor] ✅ Переподключение успешно после ${attempts} попыток (${Date.now() - startTime}ms)`);
          
          break;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          console.warn(`[DB Monitor] ⚠️ Попытка переподключения ${retry + 1}/${maxRetries} не удалась: ${lastError}`);
          
          // Ждем перед следующей попыткой (с увеличивающимся интервалом)
          if (retry < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, retry), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // Если все попытки не удались
      if (!success) {
        console.error(`[DB Monitor] ❌ Все попытки переподключения не удались (${attempts} попыток)`);
      }
      
      // Обновляем статистику успешности переподключения
      if (success) {
        this.stats.successfulReconnects++;
      } else {
        this.stats.failedReconnects++;
      }
      
      // Обновляем среднее время переподключения
      const reconnectTime = Date.now() - startTime;
      this.stats.avgReconnectTime = 
        (this.stats.avgReconnectTime * (this.stats.totalReconnects - 1) + reconnectTime) / 
        this.stats.totalReconnects;
      
      // Записываем результат последнего переподключения
      this.lastReconnectResult = {
        timestamp: new Date().toISOString(),
        success,
        attempts,
        totalTime: reconnectTime,
        error: success ? undefined : lastError
      };
      
      return success;
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
    // Установка таймаута для операции закрытия пула
    const closeTimeout = 5000; // 5 секунд
    
    try {
      // Пытаемся корректно закрыть пул
      const endPromise = pool.end();
      
      // Создаем обертку с таймаутом
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout при закрытии пула'));
        }, closeTimeout);
      });
      
      // Ожидаем завершения с таймаутом
      await Promise.race([endPromise, timeoutPromise]);
    } catch (error) {
      console.warn('[DB Monitor] ⚠️ Ошибка при закрытии пула:', 
        error instanceof Error ? error.message : String(error));
    }
  }
  
  /**
   * Безопасно подключается к пулу с таймаутом
   * @param pool Пул подключений
   * @returns Promise<PoolClient>
   */
  private async safelyConnect(pool: Pool): Promise<PoolClient> {
    // Установка таймаута для операции получения клиента
    const connectTimeout = 10000; // 10 секунд
    
    // Пытаемся получить клиента из пула
    const connectPromise = pool.connect();
    
    // Создаем обертку с таймаутом
    const timeoutPromise = new Promise<PoolClient>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout при подключении к базе данных'));
      }, connectTimeout);
    });
    
    // Ожидаем выполнение с таймаутом
    return Promise.race([connectPromise, timeoutPromise]);
  }
  
  /**
   * Обновляет внутренний пул и вызывает колбэки для обновления внешних ссылок
   * @param newPool Новый пул подключений
   */
  private updatePool(newPool: Pool): void {
    // Сохраняем предыдущее значение
    const oldPool = this.pool;
    
    // Обновляем внутреннюю ссылку
    this.pool = newPool;
    
    // Вызываем все зарегистрированные колбэки
    this.onReconnectCallbacks.forEach(callback => {
      try {
        callback(newPool);
      } catch (error) {
        console.error('[DB Monitor] Ошибка в колбэке при обновлении пула:', 
          error instanceof Error ? error.message : String(error));
      }
    });
    
    console.log('[DB Monitor] Пул соединений обновлен');
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
      console.warn('[DB Monitor] ⚠️ Интервал проверки слишком короткий, минимум 1000мс');
      interval = 1000;
    }
    
    this.checkInterval = interval;
    
    // Перезапускаем мониторинг с новым интервалом
    if (this.timerId !== null) {
      this.stop();
      this.start();
    }
  }
  
  /**
   * Устанавливает максимальное число последовательных ошибок перед переподключением
   * @param max Максимальное количество ошибок
   */
  public setMaxConsecutiveFailures(max: number): void {
    if (max < 1) {
      console.warn('[DB Monitor] ⚠️ Максимальное число ошибок не может быть меньше 1');
      max = 1;
    }
    
    this.maxConsecutiveFailures = max;
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
      startTime: new Date().toISOString()
    };
    
    this.lastCheckResult = null;
    this.lastReconnectResult = null;
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
    // Обновляем время работы перед возвратом статистики
    const now = Date.now();
    const startTimestamp = new Date(this.stats.startTime).getTime();
    const totalTime = now - startTimestamp;
    
    // Если есть последний результат проверки, используем его для расчета
    if (this.lastCheckResult) {
      // Если сейчас статус ОК, считаем uptime, иначе - downtime
      if (this.status === 'ok') {
        this.stats.uptime = totalTime - this.stats.downtime;
      } else {
        // Вычисляем с какого момента соединение отсутствует
        const lastDownTimestamp = this.stats.lastDownTime 
          ? new Date(this.stats.lastDownTime).getTime()
          : now;
        
        this.stats.downtime = totalTime - this.stats.uptime;
      }
    }
    
    return this.stats;
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

/**
 * Функция для проверки соединения с базой данных
 * @param pool Пул подключений
 * @returns Результат проверки
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
    console.error('Ошибка проверки соединения:', error);
    return false;
  }
}

/**
 * Создает экземпляр монитора для указанного пула
 * @param pool Пул подключений
 * @returns DatabaseMonitor
 */
export function createMonitor(pool: Pool): DatabaseMonitor {
  return new DatabaseMonitor(pool, true);
}