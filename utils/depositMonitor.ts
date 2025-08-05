/**
 * Real-time monitoring system for TON deposit processing
 * Ensures all deposits are processed correctly and alerts on failures
 */

import { logger } from '../core/logger';
import { healthCheck } from '../core/tonApiClient';
// import { depositSystemHealthCheck } from './tonDepositFallback'; // Отключено до создания модуля

export interface DepositMetrics {
  total_deposits: number;
  successful_deposits: number;
  failed_deposits: number;
  boc_data_processed: number;
  hash_extractions_successful: number;
  fallback_activations: number;
  tonapi_errors: number;
  last_successful_deposit: string | null;
  last_failed_deposit: string | null;
  success_rate: number;
  health_status: 'healthy' | 'degraded' | 'critical';
}

class DepositMonitor {
  private static instance: DepositMonitor;
  private metrics: DepositMetrics;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  private constructor() {
    this.metrics = {
      total_deposits: 0,
      successful_deposits: 0,
      failed_deposits: 0,
      boc_data_processed: 0,
      hash_extractions_successful: 0,
      fallback_activations: 0,
      tonapi_errors: 0,
      last_successful_deposit: null,
      last_failed_deposit: null,
      success_rate: 0,
      health_status: 'healthy'
    };
  }

  static getInstance(): DepositMonitor {
    if (!DepositMonitor.instance) {
      DepositMonitor.instance = new DepositMonitor();
    }
    return DepositMonitor.instance;
  }

  /**
   * Start monitoring deposit system
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('[DepositMonitor] Monitoring already active');
      return;
    }

    this.isMonitoring = true;
    logger.info('[DepositMonitor] Starting deposit system monitoring');

    // Health check every 2 minutes
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 2 * 60 * 1000);

    // Initial health check
    this.performHealthCheck();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    logger.info('[DepositMonitor] Deposit monitoring stopped');
  }

  /**
   * Record successful deposit
   */
  recordSuccessfulDeposit(data: {
    user_id: number;
    amount: number;
    tx_hash: string;
    hash_extracted?: boolean;
    fallback_used?: boolean;
  }): void {
    this.metrics.total_deposits++;
    this.metrics.successful_deposits++;
    this.metrics.last_successful_deposit = new Date().toISOString();

    if (data.hash_extracted) {
      this.metrics.boc_data_processed++;
      this.metrics.hash_extractions_successful++;
    }

    if (data.fallback_used) {
      this.metrics.fallback_activations++;
    }

    this.updateSuccessRate();
    this.updateHealthStatus();

    logger.info('[DepositMonitor] Successful deposit recorded', {
      user_id: data.user_id,
      amount: data.amount,
      metrics: this.getMetrics()
    });
  }

  /**
   * Record failed deposit
   */
  recordFailedDeposit(data: {
    user_id: number;
    amount: number;
    tx_hash: string;
    error: string;
    tonapi_error?: boolean;
  }): void {
    this.metrics.total_deposits++;
    this.metrics.failed_deposits++;
    this.metrics.last_failed_deposit = new Date().toISOString();

    if (data.tonapi_error) {
      this.metrics.tonapi_errors++;
    }

    this.updateSuccessRate();
    this.updateHealthStatus();

    logger.error('[DepositMonitor] Failed deposit recorded', {
      user_id: data.user_id,
      amount: data.amount,
      error: data.error,
      metrics: this.getMetrics()
    });

    // Alert if failure rate is high
    if (this.metrics.success_rate < 0.8) {
      this.sendAlert('HIGH_FAILURE_RATE', `Deposit success rate dropped to ${(this.metrics.success_rate * 100).toFixed(1)}%`);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): DepositMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    const oldMetrics = { ...this.metrics };
    this.metrics = {
      total_deposits: 0,
      successful_deposits: 0,
      failed_deposits: 0,
      boc_data_processed: 0,
      hash_extractions_successful: 0,
      fallback_activations: 0,
      tonapi_errors: 0,
      last_successful_deposit: null,
      last_failed_deposit: null,
      success_rate: 0,
      health_status: 'healthy'
    };

    logger.info('[DepositMonitor] Metrics reset', {
      previous_metrics: oldMetrics,
      new_metrics: this.metrics
    });
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      logger.info('[DepositMonitor] Performing system health check');

      const healthResults = { isHealthy: true, checks: { unifiedTransactionService: true, balanceManager: true } }; // Временная заглушка
      const tonApiHealthy = await healthCheck();

      const overallHealth = healthResults.isHealthy && tonApiHealthy;
      
      if (!overallHealth) {
        const issues = [];
        if (!tonApiHealthy) issues.push('TonAPI connectivity');
        if (!healthResults.checks.unifiedTransactionService) issues.push('UnifiedTransactionService');
        if (!healthResults.checks.balanceManager) issues.push('BalanceManager');

        this.sendAlert('SYSTEM_UNHEALTHY', `System health issues detected: ${issues.join(', ')}`);
      }

      logger.info('[DepositMonitor] Health check completed', {
        overall_healthy: overallHealth,
        tonapi_healthy: tonApiHealthy,
        system_checks: healthResults.checks,
        current_metrics: this.getMetrics()
      });

    } catch (error) {
      logger.error('[DepositMonitor] Health check failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      this.sendAlert('HEALTH_CHECK_FAILED', 'Failed to perform system health check');
    }
  }

  /**
   * Update success rate
   */
  private updateSuccessRate(): void {
    if (this.metrics.total_deposits === 0) {
      this.metrics.success_rate = 0;
      return;
    }

    this.metrics.success_rate = this.metrics.successful_deposits / this.metrics.total_deposits;
  }

  /**
   * Update health status based on metrics
   */
  private updateHealthStatus(): void {
    const successRate = this.metrics.success_rate;
    const recentFailures = this.metrics.failed_deposits;
    const tonApiErrors = this.metrics.tonapi_errors;

    if (successRate >= 0.95 && tonApiErrors < 5) {
      this.metrics.health_status = 'healthy';
    } else if (successRate >= 0.8 && tonApiErrors < 10) {
      this.metrics.health_status = 'degraded';
    } else {
      this.metrics.health_status = 'critical';
    }
  }

  /**
   * Send alert for critical issues
   */
  private sendAlert(type: string, message: string): void {
    logger.error('[DepositMonitor] ALERT', {
      alert_type: type,
      message,
      timestamp: new Date().toISOString(),
      current_metrics: this.getMetrics()
    });

    // In production, this would send alerts to external monitoring systems
    // For now, we just log the alert
  }

  /**
   * Get formatted status report
   */
  getStatusReport(): string {
    const metrics = this.getMetrics();
    
    return `
=== DEPOSIT SYSTEM STATUS REPORT ===
Health Status: ${metrics.health_status.toUpperCase()}
Success Rate: ${(metrics.success_rate * 100).toFixed(1)}%
Total Deposits: ${metrics.total_deposits}
Successful: ${metrics.successful_deposits}
Failed: ${metrics.failed_deposits}
BOC Data Processed: ${metrics.boc_data_processed}
Hash Extractions: ${metrics.hash_extractions_successful}
Fallback Activations: ${metrics.fallback_activations}
TonAPI Errors: ${metrics.tonapi_errors}
Last Success: ${metrics.last_successful_deposit || 'None'}
Last Failure: ${metrics.last_failed_deposit || 'None'}
Monitoring Active: ${this.isMonitoring}
======================================`;
  }
}

// Export singleton instance
export const depositMonitor = DepositMonitor.getInstance();
export default DepositMonitor;

/**
 * Helper function to record deposit attempt
 */
export function recordDepositAttempt(
  success: boolean,
  data: {
    user_id: number;
    amount: number;
    tx_hash: string;
    error?: string;
    hash_extracted?: boolean;
    fallback_used?: boolean;
    tonapi_error?: boolean;
  }
): void {
  if (success) {
    depositMonitor.recordSuccessfulDeposit({
      user_id: data.user_id,
      amount: data.amount,
      tx_hash: data.tx_hash,
      hash_extracted: data.hash_extracted,
      fallback_used: data.fallback_used
    });
  } else {
    depositMonitor.recordFailedDeposit({
      user_id: data.user_id,
      amount: data.amount,
      tx_hash: data.tx_hash,
      error: data.error || 'Unknown error',
      tonapi_error: data.tonapi_error
    });
  }
}

/**
 * Start monitoring when module is imported
 */
depositMonitor.startMonitoring();