
/**
 * Система автоматического восстановления соединений с базой данных
 * Включает мониторинг состояния и автоматическое переподключение
 */

import logger from './logger';

interface RecoveryAttempt {
  timestamp: Date;
  success: boolean;
  error?: string;
  duration: number;
}

class AutoRecoverySystem {
  private isMonitoring = false;
  private recoveryAttempts: RecoveryAttempt[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private readonly maxRecoveryAttempts = 5;
  private readonly recoveryIntervalMs = 30000; // 30 секунд
  
  /**
   * Запускает систему мониторинга и автовосстановления
   */
  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('[AutoRecovery] Monitoring already started');
      return;
    }
    
    this.isMonitoring = true;
    logger.info('[AutoRecovery] Starting database monitoring and auto-recovery system');
    
    // Проверяем каждые 30 секунд
    this.monitoringInterval = setInterval(async () => {
      await this.checkAndRecover();
    }, this.recoveryIntervalMs);
    
    // Начальная проверка
    setTimeout(() => this.checkAndRecover(), 5000);
  }
  
  /**
   * Останавливает систему мониторинга
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    logger.info('[AutoRecovery] Stopped database monitoring');
  }
  
  /**
   * Проверяет состояние БД и пытается восстановить соединение при необходимости
   */
  private async checkAndRecover() {
    try {
      const { testConnection, getConnectionStatus } = await import('../db-unified');
      
      // Проверяем состояние соединения
      const isConnected = await testConnection();
      const connectionInfo = getConnectionStatus();
      
      if (!isConnected || connectionInfo.isMemoryMode) {
        logger.warn('[AutoRecovery] Database connection issue detected', {
          isConnected,
          isMemoryMode: connectionInfo.isMemoryMode,
          provider: connectionInfo.connectionName
        });
        
        // Пытаемся восстановить соединение
        await this.attemptRecovery();
      } else {
        // Соединение в порядке, очищаем старые попытки восстановления
        if (this.recoveryAttempts.length > 0) {
          this.recoveryAttempts = [];
          logger.info('[AutoRecovery] Database connection restored, cleared recovery attempts');
        }
      }
      
    } catch (error) {
      logger.error('[AutoRecovery] Error during monitoring check:', error);
    }
  }
  
  /**
   * Пытается восстановить соединение с базой данных
   */
  private async attemptRecovery(): Promise<void> {
    const startTime = Date.now();
    
    // Проверяем, не превышено ли количество попыток за последние 10 минут
    const recentAttempts = this.recoveryAttempts.filter(
      attempt => Date.now() - attempt.timestamp.getTime() < 10 * 60 * 1000
    );
    
    if (recentAttempts.length >= this.maxRecoveryAttempts) {
      logger.warn('[AutoRecovery] Maximum recovery attempts reached, waiting before next attempt');
      return;
    }
    
    try {
      logger.info('[AutoRecovery] Attempting database recovery...');
      
      // Импортируем модуль восстановления БД
      const { recoverDatabaseConnection } = await import('./db-auto-recovery');
      
      // Пытаемся восстановить соединение
      const recoveryResult = await recoverDatabaseConnection();
      
      const duration = Date.now() - startTime;
      
      if (recoveryResult.success) {
        logger.info('[AutoRecovery] Database recovery successful', {
          duration: `${duration}ms`,
          provider: recoveryResult.provider
        });
        
        this.recoveryAttempts.push({
          timestamp: new Date(),
          success: true,
          duration
        });
        
        // Очищаем историю после успешного восстановления
        setTimeout(() => {
          this.recoveryAttempts = [];
        }, 60000); // Через минуту
        
      } else {
        logger.error('[AutoRecovery] Database recovery failed', {
          error: recoveryResult.error,
          duration: `${duration}ms`
        });
        
        this.recoveryAttempts.push({
          timestamp: new Date(),
          success: false,
          error: recoveryResult.error,
          duration
        });
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error('[AutoRecovery] Recovery attempt failed with exception:', error);
      
      this.recoveryAttempts.push({
        timestamp: new Date(),
        success: false,
        error: errorMessage,
        duration
      });
    }
  }
  
  /**
   * Получает статистику попыток восстановления
   */
  getRecoveryStats() {
    const total = this.recoveryAttempts.length;
    const successful = this.recoveryAttempts.filter(a => a.success).length;
    const recentAttempts = this.recoveryAttempts.filter(
      attempt => Date.now() - attempt.timestamp.getTime() < 60 * 60 * 1000 // За последний час
    );
    
    return {
      isMonitoring: this.isMonitoring,
      totalAttempts: total,
      successfulAttempts: successful,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      recentAttempts: recentAttempts.length,
      lastAttempt: this.recoveryAttempts.length > 0 
        ? this.recoveryAttempts[this.recoveryAttempts.length - 1]
        : null
    };
  }
  
  /**
   * Принудительно запускает попытку восстановления
   */
  async forceRecovery(): Promise<boolean> {
    logger.info('[AutoRecovery] Force recovery requested');
    
    try {
      await this.attemptRecovery();
      const lastAttempt = this.recoveryAttempts[this.recoveryAttempts.length - 1];
      return lastAttempt ? lastAttempt.success : false;
    } catch (error) {
      logger.error('[AutoRecovery] Force recovery failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const autoRecoverySystem = new AutoRecoverySystem();

// Автоматический запуск при импорте модуля
setTimeout(() => {
  autoRecoverySystem.startMonitoring();
}, 10000); // Запускаем через 10 секунд после старта сервера
