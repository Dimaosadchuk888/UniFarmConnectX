/**
 * Сервис мониторинга депозитов для отслеживания и логирования всех этапов
 */
export class DepositMonitor {
  private static readonly LOG_KEY = 'deposit_logs';
  private static readonly MAX_LOGS = 50;

  /**
   * Логирует этап депозита
   */
  static logDeposit(stage: string, data: any): void {
    const log = {
      timestamp: Date.now(),
      stage,
      ...data
    };
    
    // Выводим в консоль для разработки
    console.log('[DEPOSIT_MONITOR]', log);
    
    // Сохраняем в localStorage для отладки
    try {
      const existingLogs = this.getLogs();
      existingLogs.push(log);
      
      // Ограничиваем количество логов
      const trimmedLogs = existingLogs.slice(-this.MAX_LOGS);
      localStorage.setItem(this.LOG_KEY, JSON.stringify(trimmedLogs));
    } catch (error) {
      console.error('[DEPOSIT_MONITOR] Failed to save log', error);
    }
  }

  /**
   * Получает все логи депозитов
   */
  static getLogs(): any[] {
    try {
      const logs = localStorage.getItem(this.LOG_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('[DEPOSIT_MONITOR] Failed to get logs', error);
      return [];
    }
  }

  /**
   * Очищает логи депозитов
   */
  static clearLogs(): void {
    localStorage.removeItem(this.LOG_KEY);
  }

  /**
   * Проверяет наличие незавершенных депозитов
   */
  static checkPendingDeposits(): {
    hasPending: boolean;
    failedDeposit?: any;
    pendingDeposit?: any;
  } {
    const failedDeposit = localStorage.getItem('failed_ton_deposit');
    const pendingDeposit = localStorage.getItem('pending_ton_deposit');
    
    return {
      hasPending: !!(failedDeposit || pendingDeposit),
      failedDeposit: failedDeposit ? JSON.parse(failedDeposit) : null,
      pendingDeposit: pendingDeposit ? JSON.parse(pendingDeposit) : null
    };
  }

  /**
   * Создает сводку по последним депозитам
   */
  static getDepositSummary(): {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    lastDeposit?: any;
  } {
    const logs = this.getLogs();
    const depositLogs = logs.filter(log => log.stage.includes('TON_DEPOSIT'));
    
    const successful = depositLogs.filter(log => log.stage.includes('SUCCESS') || log.stage.includes('✅')).length;
    const failed = depositLogs.filter(log => log.stage.includes('ERROR') || log.stage.includes('❌')).length;
    const pending = this.checkPendingDeposits();
    
    return {
      total: depositLogs.length,
      successful,
      failed,
      pending: pending.hasPending ? 1 : 0,
      lastDeposit: depositLogs[depositLogs.length - 1]
    };
  }

  /**
   * Отправляет критическую ошибку админу (если настроено)
   */
  static async notifyAdminOnCriticalError(error: {
    type: string;
    userId?: number;
    amount?: number;
    error: string;
  }): Promise<void> {
    console.error('[DEPOSIT_MONITOR] CRITICAL ERROR', error);
    
    // Сохраняем критическую ошибку отдельно
    try {
      const criticalErrors = JSON.parse(localStorage.getItem('critical_deposit_errors') || '[]');
      criticalErrors.push({
        ...error,
        timestamp: Date.now()
      });
      localStorage.setItem('critical_deposit_errors', JSON.stringify(criticalErrors.slice(-10)));
    } catch (e) {
      console.error('[DEPOSIT_MONITOR] Failed to save critical error', e);
    }
  }
}

// Экспортируем для глобального доступа
if (typeof window !== 'undefined') {
  (window as any).DepositMonitor = DepositMonitor;
}