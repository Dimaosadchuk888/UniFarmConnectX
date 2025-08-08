import { logger } from '../../core/logger.js';

/**
 * Планировщик автоматической верификации pending TON Boost платежей
 * Безопасно добавлен к существующей архитектуре без изменения пополнения кошелька
 */
export class BoostVerificationScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Запуск планировщика с интервалом 5 минут
   */
  start() {
    if (this.isRunning) {
      logger.warn('[BoostVerificationScheduler] Планировщик уже запущен');
      return;
    }

    logger.info('[BoostVerificationScheduler] Запуск автоматической верификации pending boost платежей');
    
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.verifyPendingBoostPayments();
    }, 5 * 60 * 1000); // Каждые 5 минут (было 2 минуты)

    // Первая проверка сразу после запуска
    setTimeout(() => {
      this.verifyPendingBoostPayments();
    }, 10000); // Через 10 секунд после старта (было 5 секунд)
  }

  /**
   * Остановка планировщика
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('[BoostVerificationScheduler] Планировщик остановлен');
  }

  /**
   * Основная логика проверки pending платежей
   */
  private async verifyPendingBoostPayments() {
    try {
      logger.info('[BoostVerificationScheduler] Начало проверки pending boost платежей');
      
      const { supabase } = await import('../../core/supabase');
      
      // Найти все pending TON_DEPOSIT транзакции для TON Boost покупок старше 2 минут
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      const { data: pendingPurchases, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'TON_DEPOSIT')
        .eq('status', 'pending')
        .not('tx_hash', 'is', null)
        .lt('created_at', twoMinutesAgo)
        .limit(10); // Ограничиваем количество для безопасности

      if (error) {
        logger.error('[BoostVerificationScheduler] Ошибка получения pending покупок:', error);
        return;
      }

      if (!pendingPurchases || pendingPurchases.length === 0) {
        logger.debug('[BoostVerificationScheduler] Нет pending покупок для проверки');
        return;
      }

      logger.info('[BoostVerificationScheduler] Найдено pending покупок для проверки:', {
        count: pendingPurchases.length,
        purchases: pendingPurchases.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          tx_hash: p.tx_hash?.slice(0, 10) + '...',
          created_at: p.created_at
        }))
      });

      // Импортируем BoostService для использования существующей логики
      const { BoostService } = await import('../boost/service');
      const boostService = new BoostService();

      let verified = 0;
      let failed = 0;

      // Обрабатываем каждую pending транзакцию
      for (const transaction of pendingPurchases) {
        try {
          // Проверяем, является ли это TON Boost покупкой через metadata
          const metadata = transaction.metadata || {};
          const isBoostPurchase = metadata.transaction_type === 'ton_boost_purchase';
          
          if (!isBoostPurchase) {
            // Пропускаем обычные TON депозиты
            continue;
          }

          logger.info('[BoostVerificationScheduler] Проверяем TON Boost платеж:', {
            transactionId: transaction.id,
            userId: transaction.user_id,
            txHash: transaction.tx_hash?.slice(0, 10) + '...',
            boostPackageId: metadata.boost_package_id
          });

          // Используем существующий метод verifyTonPayment для проверки блокчейна
          const result = await boostService.verifyTonPayment(
            transaction.tx_hash,
            transaction.user_id.toString(),
            metadata.boost_package_id.toString()
          );

          if (result.success && result.status === 'confirmed') {
            verified++;
            
            // Обновляем статус транзакции на confirmed
            await supabase
              .from('transactions')
              .update({ status: 'confirmed' })
              .eq('id', transaction.id);
            
            logger.info('[BoostVerificationScheduler] TON Boost платеж успешно подтвержден и активирован:', {
              transactionId: transaction.id,
              userId: transaction.user_id,
              txHash: transaction.tx_hash?.slice(0, 10) + '...',
              amount: result.transaction_amount,
              boostActivated: result.boost_activated
            });
          } else if (result.status === 'waiting') {
            logger.debug('[BoostVerificationScheduler] TON Boost платеж еще не подтвержден в блокчейне:', {
              transactionId: transaction.id,
              txHash: transaction.tx_hash?.slice(0, 10) + '...'
            });
          } else if (result.status === 'error' || result.status === 'not_found') {
            failed++;
            
            // Помечаем транзакцию как failed
            await supabase
              .from('transactions')
              .update({ status: 'failed' })
              .eq('id', transaction.id);
              
            logger.warn('[BoostVerificationScheduler] Ошибка верификации TON Boost платежа:', {
              transactionId: transaction.id,
              status: result.status,
              message: result.message
            });
          }

          // Пауза между проверками для снижения нагрузки на TonAPI
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          failed++;
          logger.error('[BoostVerificationScheduler] Критическая ошибка проверки TON Boost платежа:', {
            transactionId: transaction.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Подсчитываем только TON Boost транзакции  
      const boostTransactionsCount = pendingPurchases.filter((tx: any) => 
        tx.metadata?.transaction_type === 'ton_boost_purchase'
      ).length;
      
      logger.info('[BoostVerificationScheduler] Завершена проверка pending TON Boost платежей:', {
        totalPendingTransactions: pendingPurchases.length,
        boostTransactions: boostTransactionsCount,
        verified,
        failed,
        waiting: boostTransactionsCount - verified - failed
      });

      // Очищаем очень старые pending записи (старше 24 часов)
      await this.cleanupExpiredPending();

      // Очищаем память после выполнения
      await this.cleanupMemory();

    } catch (error) {
      logger.error('[BoostVerificationScheduler] Критическая ошибка планировщика:', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Очистка expired pending записей старше 24 часов
   */
  private async cleanupExpiredPending() {
    try {
      const { supabase } = await import('../../core/supabase');
      
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: expiredPurchases, error: selectError } = await supabase
        .from('boost_purchases')
        .select('id, user_id, tx_hash, created_at')
        .eq('status', 'pending')
        .lt('created_at', twentyFourHoursAgo);

      if (selectError || !expiredPurchases || expiredPurchases.length === 0) {
        return;
      }

      logger.warn('[BoostVerificationScheduler] Найдены expired pending записи:', {
        count: expiredPurchases.length,
        records: expiredPurchases.map(p => ({
          id: p.id,
          user_id: p.user_id,
          created_at: p.created_at
        }))
      });

      // Обновляем статус на failed для expired записей
      const { error: updateError } = await supabase
        .from('boost_purchases')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .in('id', expiredPurchases.map(p => p.id));

      if (updateError) {
        logger.error('[BoostVerificationScheduler] Ошибка очистки expired записей:', updateError);
      } else {
        logger.info('[BoostVerificationScheduler] Expired pending записи помечены как failed:', {
          count: expiredPurchases.length
        });
      }

    } catch (error) {
      logger.error('[BoostVerificationScheduler] Ошибка очистки expired записей:', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Очистка памяти после выполнения операций
   */
  private async cleanupMemory(): Promise<void> {
    try {
      // Принудительный вызов garbage collector если доступен
      if (global.gc) {
        global.gc();
        logger.debug('[BoostVerificationScheduler] Memory cleanup: garbage collector called');
      }

      // Очищаем кэш модулей если они накопились
      const moduleCache = require.cache;
      const boostModuleKeys = Object.keys(moduleCache).filter(key => 
        key.includes('boost') || key.includes('Boost')
      );
      
      if (boostModuleKeys.length > 10) {
        boostModuleKeys.slice(0, 5).forEach(key => {
          delete moduleCache[key];
        });
        logger.debug('[BoostVerificationScheduler] Memory cleanup: cleared module cache');
      }

      // Логируем использование памяти
      const memUsage = process.memoryUsage();
      logger.info('[BoostVerificationScheduler] Memory usage after cleanup:', {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100) + '%'
      });

    } catch (error) {
      logger.warn('[BoostVerificationScheduler] Memory cleanup failed:', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Получение статуса планировщика
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId !== null
    };
  }
}

// Singleton instance
export const boostVerificationScheduler = new BoostVerificationScheduler();