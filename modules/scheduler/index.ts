/**
 * Scheduler Module Index
 * Управляет всеми планировщиками UniFarm
 */

import { tonBoostIncomeScheduler } from './tonBoostIncomeScheduler';
import { logger } from '../../core/logger';

/**
 * Запускает все планировщики UniFarm
 */
export function startAllSchedulers(): void {
  try {
    logger.info('[SCHEDULERS] Запуск всех планировщиков UniFarm');
    
    // Запускаем планировщик TON Boost доходов
    tonBoostIncomeScheduler.start();
    
    logger.info('[SCHEDULERS] ✅ Все планировщики запущены успешно');
  } catch (error) {
    logger.error('[SCHEDULERS] Ошибка запуска планировщиков:', error);
  }
}

/**
 * Останавливает все планировщики UniFarm
 */
export function stopAllSchedulers(): void {
  try {
    logger.info('[SCHEDULERS] Остановка всех планировщиков UniFarm');
    
    // Останавливаем планировщик TON Boost доходов
    tonBoostIncomeScheduler.stop();
    
    logger.info('[SCHEDULERS] ✅ Все планировщики остановлены');
  } catch (error) {
    logger.error('[SCHEDULERS] Ошибка остановки планировщиков:', error);
  }
}

/**
 * Проверяет статус всех планировщиков
 */
export function getSchedulersStatus(): {
  tonBoostIncomeScheduler: boolean;
} {
  return {
    tonBoostIncomeScheduler: tonBoostIncomeScheduler.isActive()
  };
}

// Экспортируем отдельные планировщики для прямого доступа
export { tonBoostIncomeScheduler };