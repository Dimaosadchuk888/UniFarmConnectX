/**
 * Модуль интеграции оптимизированной реферальной системы
 * 
 * Этот модуль обеспечивает плавную миграцию с существующей системы на новую
 * оптимизированную версию без нарушения работы приложения
 */

import { optimizedReferralBonusProcessor } from './optimizedReferralBonusProcessor';
import { optimizedReferralTreeService } from './optimizedReferralTreeService';
import { referralBonusProcessor } from './referralBonusProcessor';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { Currency } from './transactionService';

/**
 * Флаг, указывающий на использование оптимизированной версии
 * Можно изменить для постепенного тестирования и перехода
 */
let useOptimizedVersion = false;

/**
 * Интерфейс для системных метрик
 */
interface SystemMetrics {
  optimizationEnabled: boolean;
  processingQueueSize: number;
  recentCompletion: number;
  recentErrors: number;
  averageProcessingTime: number;
  indices: {
    ref_code: boolean;
    parent_ref_code: boolean;
    referral_user_id: boolean;
    reward_distribution_logs: boolean;
  };
}

/**
 * Класс для интеграции оптимизированной реферальной системы
 */
export class ReferralSystemIntegrator {
  /**
   * Инициализирует оптимизированную систему и создает необходимые индексы
   */
  async initialize(): Promise<void> {
    try {
      console.log('[ReferralSystemIntegrator] Initializing optimized referral system...');
      
      // Создаем индексы для улучшения производительности
      await optimizedReferralTreeService.createOptimalIndexes();
      
      // Инициализируем оптимизированный процессор
      await optimizedReferralBonusProcessor.initialize();
      
      console.log('[ReferralSystemIntegrator] Optimized referral system initialized successfully');
    } catch (error) {
      console.error('[ReferralSystemIntegrator] Initialization error:', error);
    }
  }
  
  /**
   * Переключает между обычной и оптимизированной версией реферальной системы
   */
  setOptimizedVersion(enabled: boolean): void {
    useOptimizedVersion = enabled;
    console.log(`[ReferralSystemIntegrator] Optimized referral system is now ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
  
  /**
   * Проверяет, используется ли оптимизированная версия
   */
  isOptimizedVersionEnabled(): boolean {
    return useOptimizedVersion;
  }
  
  /**
   * Асинхронно обрабатывает реферальное вознаграждение с использованием
   * выбранной системы (оптимизированной или стандартной)
   */
  async queueReferralReward(userId: number, earnedAmount: number, currency: Currency): Promise<string> {
    if (useOptimizedVersion) {
      return optimizedReferralBonusProcessor.queueReferralReward(userId, earnedAmount, currency);
    } else {
      return referralBonusProcessor.queueReferralReward(userId, earnedAmount, currency);
    }
  }
  
  /**
   * Получает метрики системы для мониторинга
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Проверяем наличие индексов
      const indexesResult = await db.execute(sql`
        SELECT 
          EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'idx_users_ref_code'
          ) as has_ref_code_index,
          EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'idx_users_parent_ref_code'
          ) as has_parent_ref_code_index,
          EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'idx_referrals_user_id'
          ) as has_referral_user_id_index,
          EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'idx_reward_distribution_logs_source_user_id'
          ) as has_reward_logs_index
      `);
      
      // Получаем статистику по последним операциям
      const statsResult = await db.execute(sql`
        SELECT 
          COUNT(*) as completed_count,
          COUNT(*) FILTER (WHERE status = 'failed') as error_count,
          AVG(
            EXTRACT(EPOCH FROM (completed_at - processed_at)) * 1000
          ) as avg_processing_ms
        FROM 
          reward_distribution_logs
        WHERE 
          processed_at > NOW() - INTERVAL '24 hours'
      `);
      
      // Формируем метрики
      return {
        optimizationEnabled: useOptimizedVersion,
        processingQueueSize: 0, // Заглушка, реальное значение будет динамическим
        recentCompletion: Number(statsResult.rows[0]?.completed_count || 0),
        recentErrors: Number(statsResult.rows[0]?.error_count || 0),
        averageProcessingTime: Number(statsResult.rows[0]?.avg_processing_ms || 0),
        indices: {
          ref_code: indexesResult.rows[0]?.has_ref_code_index === true,
          parent_ref_code: indexesResult.rows[0]?.has_parent_ref_code_index === true,
          referral_user_id: indexesResult.rows[0]?.has_referral_user_id_index === true,
          reward_distribution_logs: indexesResult.rows[0]?.has_reward_logs_index === true
        }
      };
    } catch (error) {
      console.error('[ReferralSystemIntegrator] Error getting system metrics:', error);
      return {
        optimizationEnabled: useOptimizedVersion,
        processingQueueSize: 0,
        recentCompletion: 0,
        recentErrors: 0,
        averageProcessingTime: 0,
        indices: {
          ref_code: false,
          parent_ref_code: false,
          referral_user_id: false,
          reward_distribution_logs: false
        }
      };
    }
  }
  
  /**
   * Получает дерево рефералов для указанного пользователя
   * используя оптимизированную версию для глубоких деревьев
   */
  async getReferralTree(userId: number, maxDepth: number = 5) {
    if (useOptimizedVersion) {
      return optimizedReferralTreeService.getReferralTree(userId, maxDepth);
    } else {
      // Здесь будет вызов стандартного метода получения дерева
      // Реализация зависит от существующей структуры
      return null;
    }
  }
  
  /**
   * Получает аналитику реферальной структуры пользователя
   */
  async getReferralStructureInfo(userId: number) {
    return optimizedReferralTreeService.getReferralStructureInfo(userId);
  }
  
  /**
   * Получает детальную статистику производительности
   */
  async getPerformanceStats() {
    if (useOptimizedVersion) {
      return optimizedReferralBonusProcessor.getPerformanceStats();
    } else {
      return { message: 'Performance stats are only available in optimized mode' };
    }
  }
}

// Создаем и экспортируем единственный экземпляр интегратора
export const referralSystemIntegrator = new ReferralSystemIntegrator();