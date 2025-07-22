import { logger } from '../../utils/logger';

/**
 * Планировщик автоматической верификации pending TON Boost платежей
 * Безопасно добавлен к существующей архитектуре без изменения пополнения кошелька
 */
export class BoostVerificationScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Запуск планировщика с интервалом 2 минуты
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
    }, 2 * 60 * 1000); // Каждые 2 минуты

    // Первая проверка сразу после запуска
    setTimeout(() => {
      this.verifyPendingBoostPayments();
    }, 5000); // Через 5 секунд после старта
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
      
      // Найти все pending boost_purchases старше 2 минут
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      const { data: pendingPurchases, error } = await supabase
        .from('boost_purchases')
        .select('*')
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
        purchases: pendingPurchases.map(p => ({
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

      // Обрабатываем каждую pending покупку
      for (const purchase of pendingPurchases) {
        try {
          logger.info('[BoostVerificationScheduler] Проверяем платеж:', {
            purchaseId: purchase.id,
            userId: purchase.user_id,
            txHash: purchase.tx_hash?.slice(0, 10) + '...'
          });

          // Используем существующий метод verifyTonPayment
          const result = await boostService.verifyTonPayment(
            purchase.tx_hash,
            purchase.user_id.toString(),
            purchase.package_id.toString()
          );

          if (result.success && result.status === 'confirmed') {
            verified++;
            logger.info('[BoostVerificationScheduler] Платеж успешно подтвержден:', {
              purchaseId: purchase.id,
              userId: purchase.user_id,
              txHash: purchase.tx_hash?.slice(0, 10) + '...',
              amount: result.transaction_amount,
              boostActivated: result.boost_activated
            });
          } else if (result.status === 'waiting') {
            logger.debug('[BoostVerificationScheduler] Платеж еще не подтвержден в блокчейне:', {
              purchaseId: purchase.id,
              txHash: purchase.tx_hash?.slice(0, 10) + '...'
            });
          } else if (result.status === 'error' || result.status === 'not_found') {
            failed++;
            logger.warn('[BoostVerificationScheduler] Ошибка верификации платежа:', {
              purchaseId: purchase.id,
              status: result.status,
              message: result.message
            });
          }

          // Пауза между проверками для снижения нагрузки на TonAPI
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          failed++;
          logger.error('[BoostVerificationScheduler] Критическая ошибка проверки платежа:', {
            purchaseId: purchase.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      logger.info('[BoostVerificationScheduler] Завершена проверка pending платежей:', {
        total: pendingPurchases.length,
        verified,
        failed,
        waiting: pendingPurchases.length - verified - failed
      });

      // Очищаем очень старые pending записи (старше 24 часов)
      await this.cleanupExpiredPending();

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