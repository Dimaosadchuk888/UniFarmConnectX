/**
 * Модуль автоматического восстановления соединения с БД
 * 
 * Предоставляет механизм для мониторинга состояния соединения с БД
 * и автоматического восстановления при обнаружении проблем.
 */

import { getConnectionManager } from '../db-connect-unified';
import { getDbEventManager, DatabaseEventType } from './db-events';
import logger from './logger';

// Состояние системы восстановления
interface RecoveryState {
  isActive: boolean;                // Активно ли восстановление
  consecutiveFailures: number;      // Количество последовательных неудач
  lastRecoveryAttempt: Date | null; // Время последней попытки восстановления
  recoveryScheduled: boolean;       // Запланировано ли восстановление
  currentBackoff: number;           // Текущее время отсрочки (мс)
  recoverySuccesses: number;        // Количество успешных восстановлений
}

// Настройки системы восстановления
interface RecoveryOptions {
  initialBackoff: number;           // Начальная задержка перед повторной попыткой (мс)
  maxBackoff: number;               // Максимальная задержка (мс)
  backoffFactor: number;            // Множитель для увеличения задержки
  resetThreshold: number;           // Время, после которого сбрасывается счетчик неудач (мс)
  maxConsecutiveFailures: number;   // Максимальное количество последовательных неудач
}

/**
 * Класс управления автоматическим восстановлением БД
 */
class DatabaseAutoRecovery {
  private static instance: DatabaseAutoRecovery;
  private state: RecoveryState;
  private options: RecoveryOptions;
  private timeoutId: NodeJS.Timeout | null = null;

  private constructor() {
    // Состояние по умолчанию
    this.state = {
      isActive: false,
      consecutiveFailures: 0,
      lastRecoveryAttempt: null,
      recoveryScheduled: false,
      currentBackoff: 0,
      recoverySuccesses: 0
    };

    // Настройки по умолчанию
    this.options = {
      initialBackoff: 5000,         // 5 секунд начальная задержка
      maxBackoff: 300000,           // Максимум 5 минут между попытками
      backoffFactor: 1.5,           // Увеличение задержки в 1.5 раза при каждой неудаче
      resetThreshold: 600000,       // Сброс счетчика неудач после 10 минут успешной работы
      maxConsecutiveFailures: 5     // Максимум 5 последовательных неудач
    };

    // Подписываемся на события БД
    this.subscribeToDbEvents();
  }

  /**
   * Получить экземпляр класса
   */
  public static getInstance(): DatabaseAutoRecovery {
    if (!DatabaseAutoRecovery.instance) {
      DatabaseAutoRecovery.instance = new DatabaseAutoRecovery();
    }
    return DatabaseAutoRecovery.instance;
  }

  /**
   * Подписаться на события БД
   */
  private subscribeToDbEvents(): void {
    const dbEvents = getDbEventManager();

    // Подписываемся на события потери соединения
    dbEvents.on(DatabaseEventType.DISCONNECTED, (event) => {
      logger.warn(`[DB AutoRecovery] Detected disconnection: ${event.message || 'Unknown reason'}`);
      this.scheduleRecovery();
    });

    // Подписываемся на события ошибок запросов
    dbEvents.on(DatabaseEventType.QUERY_ERROR, (event) => {
      logger.warn(`[DB AutoRecovery] Detected query error: ${event.message || 'Unknown error'}`);
      
      // Планируем восстановление только если ошибка связана с соединением
      const errorMessage = String(event.error || '');
      if (
        errorMessage.includes('connection') || 
        errorMessage.includes('timeout') || 
        errorMessage.includes('terminate')
      ) {
        this.scheduleRecovery();
      }
    });

    // Подписываемся на события успешного соединения
    dbEvents.on(DatabaseEventType.CONNECTED, () => {
      // Сбрасываем счетчик неудач при успешном подключении
      this.resetFailureCount();
    });

    // Подписываемся на события неудачных попыток переподключения
    dbEvents.on(DatabaseEventType.RECONNECT_FAILED, () => {
      this.state.consecutiveFailures++;
      this.calculateBackoff();
    });
  }

  /**
   * Сбросить счетчик неудач
   */
  private resetFailureCount(): void {
    // Только если были неудачные попытки или запланированное восстановление
    if (this.state.consecutiveFailures > 0 || this.state.recoveryScheduled) {
      logger.info(`[DB AutoRecovery] Resetting failure counter. Previous: ${this.state.consecutiveFailures}`);
      this.state.consecutiveFailures = 0;
      this.state.currentBackoff = this.options.initialBackoff;
      this.state.recoveryScheduled = false;
      
      // Отменяем запланированное восстановление, если оно было
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
    }
  }

  /**
   * Рассчитать время задержки с экспоненциальным увеличением
   */
  private calculateBackoff(): void {
    // Увеличиваем задержку экспоненциально
    if (this.state.currentBackoff === 0) {
      this.state.currentBackoff = this.options.initialBackoff;
    } else {
      this.state.currentBackoff = Math.min(
        this.state.currentBackoff * this.options.backoffFactor,
        this.options.maxBackoff
      );
    }

    logger.info(`[DB AutoRecovery] Calculated backoff: ${this.state.currentBackoff}ms after ${this.state.consecutiveFailures} failures`);
  }

  /**
   * Запланировать восстановление соединения
   */
  private scheduleRecovery(): void {
    // Если восстановление уже запланировано, не планируем снова
    if (this.state.recoveryScheduled) {
      return;
    }

    // Если достигнуто максимальное количество неудач, отключаем автоматическое восстановление
    if (this.state.consecutiveFailures >= this.options.maxConsecutiveFailures) {
      logger.error(`[DB AutoRecovery] Max consecutive failures (${this.options.maxConsecutiveFailures}) reached. Disabling auto-recovery.`);
      this.state.isActive = false;
      return;
    }

    // Рассчитываем время задержки
    this.calculateBackoff();

    // Планируем восстановление
    this.state.recoveryScheduled = true;
    
    logger.info(`[DB AutoRecovery] Scheduling recovery attempt in ${this.state.currentBackoff}ms`);

    // Очищаем предыдущий таймер, если он существует
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Устанавливаем новый таймер
    this.timeoutId = setTimeout(async () => {
      await this.attemptRecovery();
    }, this.state.currentBackoff);
  }

  /**
   * Попытка восстановления соединения
   */
  private async attemptRecovery(): Promise<void> {
    if (!this.state.isActive) {
      logger.info('[DB AutoRecovery] Recovery disabled, skipping attempt');
      return;
    }

    this.state.lastRecoveryAttempt = new Date();
    this.state.recoveryScheduled = false;
    
    logger.info(`[DB AutoRecovery] Attempting to recover database connection (attempt #${this.state.consecutiveFailures + 1})`);

    try {
      // Попытка восстановить соединение
      const connectionManager = getConnectionManager();
      const result = await connectionManager.resetConnection();

      if (result) {
        // Успешное восстановление
        logger.info('[DB AutoRecovery] Successfully recovered database connection');
        this.state.recoverySuccesses++;
        this.resetFailureCount();
      } else {
        // Неудачное восстановление
        logger.warn('[DB AutoRecovery] Failed to recover database connection');
        this.state.consecutiveFailures++;
        this.scheduleRecovery();
      }
    } catch (error) {
      // Ошибка при попытке восстановления
      logger.error(`[DB AutoRecovery] Error during recovery attempt: ${error instanceof Error ? error.message : String(error)}`);
      this.state.consecutiveFailures++;
      this.scheduleRecovery();
    }
  }

  /**
   * Включить автоматическое восстановление
   * @param customOptions Пользовательские настройки восстановления
   */
  public enable(customOptions?: Partial<RecoveryOptions>): void {
    // Обновляем настройки, если они предоставлены
    if (customOptions) {
      this.options = { ...this.options, ...customOptions };
    }

    this.state.isActive = true;
    logger.info('[DB AutoRecovery] Auto-recovery system enabled');
  }

  /**
   * Выключить автоматическое восстановление
   */
  public disable(): void {
    this.state.isActive = false;
    
    // Отменяем запланированное восстановление, если оно было
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    logger.info('[DB AutoRecovery] Auto-recovery system disabled');
  }

  /**
   * Получить текущее состояние системы восстановления
   */
  public getState(): { state: RecoveryState, options: RecoveryOptions } {
    return {
      state: { ...this.state },
      options: { ...this.options }
    };
  }

  /**
   * Принудительно запустить восстановление
   */
  public async forceRecovery(): Promise<boolean> {
    logger.info('[DB AutoRecovery] Forced recovery attempt initiated');
    
    try {
      await this.attemptRecovery();
      return true;
    } catch (error) {
      logger.error(`[DB AutoRecovery] Forced recovery failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

// Экспортируем функцию для получения экземпляра
export function getDbAutoRecovery(): DatabaseAutoRecovery {
  return DatabaseAutoRecovery.getInstance();
}

// Экспортируем типы для использования в других модулях
export type { RecoveryState, RecoveryOptions };

// Инициализируем и экспортируем функцию для активации автовосстановления
export function initDbAutoRecovery(options?: Partial<RecoveryOptions>): void {
  const recovery = getDbAutoRecovery();
  recovery.enable(options);
  logger.info('[DB AutoRecovery] Initialized and enabled');
}

export default getDbAutoRecovery;