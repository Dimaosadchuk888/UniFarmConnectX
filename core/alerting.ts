/**
 * Production Alerting System for UniFarm
 * Автоматическое оповещение о критических событиях
 */

import { logger } from './logger';
import { supabase } from './supabase';

interface Alert {
  type: 'error' | 'warning' | 'critical';
  service: string;
  message: string;
  details?: any;
  timestamp: string;
}

class AlertingService {
  private alertHistory: Alert[] = [];
  private readonly MAX_ALERTS = 100;
  
  async sendAlert(alert: Alert): Promise<void> {
    // Логируем алерт
    logger.error(`[ALERT] ${alert.type.toUpperCase()}: ${alert.service} - ${alert.message}`, alert.details);
    
    // Сохраняем в историю
    this.alertHistory.push(alert);
    if (this.alertHistory.length > this.MAX_ALERTS) {
      this.alertHistory.shift();
    }
    
    // Сохраняем критические алерты в базу данных
    if (alert.type === 'critical') {
      try {
        await supabase.from('system_alerts').insert({
          type: alert.type,
          service: alert.service,
          message: alert.message,
          details: alert.details,
          created_at: new Date().toISOString()
        });
      } catch (error) {
        logger.error('[AlertingService] Не удалось сохранить алерт в БД', error);
      }
    }
  }
  
  async checkCriticalThresholds(): Promise<void> {
    // Проверка использования памяти
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (memUsagePercent > 90) {
      await this.sendAlert({
        type: 'critical',
        service: 'memory',
        message: 'Критическое использование памяти',
        details: { 
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          percentage: memUsagePercent 
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Проверка времени ответа базы данных
    const startTime = Date.now();
    try {
      await supabase.from('users').select('id').limit(1);
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 5000) {
        await this.sendAlert({
          type: 'warning',
          service: 'database',
          message: 'Медленное время ответа базы данных',
          details: { responseTime },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      await this.sendAlert({
        type: 'critical',
        service: 'database',
        message: 'База данных недоступна',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString()
      });
    }
  }
  
  getRecentAlerts(count: number = 10): Alert[] {
    return this.alertHistory.slice(-count);
  }
  
  startMonitoring(intervalMs: number = 60000): void {
    setInterval(() => {
      this.checkCriticalThresholds().catch(error => {
        logger.error('[AlertingService] Ошибка мониторинга', error);
      });
    }, intervalMs);
    
    logger.info('[AlertingService] Система алертинга запущена');
  }
}

export const alertingService = new AlertingService();