/**
 * CRITICAL MONITORING: Real-time scheduler activity monitoring
 * Shows exactly when and how often schedulers execute
 */

import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

let transactionCount = 0;
let lastCheckTime = new Date();

async function monitorSchedulerActivity() {
  logger.info('🔍 [SCHEDULER MONITOR] Начало мониторинга активности планировщиков');
  
  // Monitor every 30 seconds
  setInterval(async () => {
    try {
      const currentTime = new Date();
      const { data: recentTransactions, error } = await supabase
        .from('transactions')
        .select('id, created_at, amount_uni, user_id')
        .eq('type', 'FARMING_REWARD')
        .gte('created_at', lastCheckTime.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error('[SCHEDULER MONITOR] Ошибка запроса:', error);
        return;
      }
      
      if (recentTransactions && recentTransactions.length > 0) {
        transactionCount += recentTransactions.length;
        
        const avgAmount = recentTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount_uni || '0'), 0) / recentTransactions.length;
        
        logger.info(`🚨 [SCHEDULER MONITOR] АКТИВНОСТЬ ОБНАРУЖЕНА`, {
          newTransactions: recentTransactions.length,
          totalSinceStart: transactionCount,
          avgAmount: avgAmount.toFixed(6),
          timeWindow: `${((currentTime.getTime() - lastCheckTime.getTime()) / 1000).toFixed(0)}s`,
          rate: `${(recentTransactions.length * 120).toFixed(0)}/час` // Экстраполяция на час
        });
        
        // Log individual transactions for debugging
        recentTransactions.slice(0, 3).forEach(tx => {
          logger.info(`  📊 User ${tx.user_id}: ${parseFloat(tx.amount_uni || '0').toFixed(6)} UNI at ${tx.created_at}`);
        });
        
        if (recentTransactions.length > 2) {
          logger.error(`🚨 [CRITICAL] Обнаружено ${recentTransactions.length} транзакций за 30 секунд - планировщики работают слишком часто!`);
        }
      }
      
      lastCheckTime = currentTime;
    } catch (error) {
      logger.error('[SCHEDULER MONITOR] Критическая ошибка:', error);
    }
  }, 30000); // Каждые 30 секунд
  
  logger.info('✅ [SCHEDULER MONITOR] Мониторинг активен (проверка каждые 30 секунд)');
}

// Auto-start monitoring
monitorSchedulerActivity();