/**
 * Система мониторинга TON депозитов в реальном времени
 * Отслеживает все этапы: отправка -> обработка -> сохранение -> уведомления
 */

import { supabase } from './core/supabase';
import { createLogger } from './core/logger';

const logger = createLogger('TON_DEPOSIT_MONITOR');

interface DepositEvent {
  timestamp: string;
  stage: 'WALLET_SEND' | 'BACKEND_RECEIVE' | 'DB_SAVE' | 'NOTIFICATION_SENT';
  boc?: string;
  userId?: number;
  amount?: number;
  txId?: number;
  details?: any;
}

class TonDepositMonitor {
  private events: DepositEvent[] = [];
  private duplicateTracker = new Map<string, number>();

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring() {
    logger.info('🔍 TON Deposit Monitor запущен');
    
    // Мониторинг новых транзакций в реальном времени
    this.subscribeToTransactions();
    
    // Проверка дублирующихся BOC каждые 30 секунд
    setInterval(() => this.checkForDuplicates(), 30000);
  }

  private subscribeToTransactions() {
    const subscription = supabase
      .channel('ton_deposits')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: 'type=in.(TON_DEPOSIT,DEPOSIT)'
      }, (payload) => {
        this.onNewTransaction(payload.new as any);
      })
      .subscribe();

    logger.info('✅ Подписка на новые TON депозиты активна');
  }

  private onNewTransaction(transaction: any) {
    const boc = transaction.tx_hash_unique;
    const userId = transaction.user_id;
    const amount = parseFloat(transaction.amount_ton || '0');

    logger.info('🆕 Новый TON депозит обнаружен:', {
      id: transaction.id,
      userId,
      amount,
      boc: boc?.substring(0, 30) + '...',
      time: transaction.created_at
    });

    // Записываем событие
    this.addEvent({
      timestamp: new Date().toISOString(),
      stage: 'DB_SAVE',
      boc,
      userId,
      amount,
      txId: transaction.id,
      details: transaction
    });

    // Проверяем на дублирование
    if (boc) {
      const count = this.duplicateTracker.get(boc) || 0;
      this.duplicateTracker.set(boc, count + 1);

      if (count > 0) {
        logger.error('🚨 ДУБЛИРОВАНИЕ ОБНАРУЖЕНО!', {
          boc: boc.substring(0, 50) + '...',
          count: count + 1,
          userId,
          transactionId: transaction.id
        });

        this.reportDuplicate(boc, count + 1, transaction);
      }
    }
  }

  private addEvent(event: DepositEvent) {
    this.events.push(event);
    
    // Храним только последние 100 событий
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
  }

  private async checkForDuplicates() {
    logger.info('🔍 Проверка дублирования BOC хешей...');

    try {
      // Проверяем дублирующиеся BOC за последний час
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: recentTransactions, error } = await supabase
        .from('transactions')
        .select('id, user_id, tx_hash_unique, amount_ton, created_at')
        .gte('created_at', oneHourAgo)
        .not('tx_hash_unique', 'is', null)
        .in('type', ['TON_DEPOSIT', 'DEPOSIT'])
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('❌ Ошибка проверки дублирования:', error);
        return;
      }

      // Группируем по BOC хешам
      const bocGroups = new Map<string, any[]>();
      
      recentTransactions?.forEach(tx => {
        const boc = tx.tx_hash_unique;
        if (!bocGroups.has(boc)) {
          bocGroups.set(boc, []);
        }
        bocGroups.get(boc)!.push(tx);
      });

      // Ищем дубликаты
      let duplicatesFound = 0;
      bocGroups.forEach((transactions, boc) => {
        if (transactions.length > 1) {
          duplicatesFound++;
          logger.error('🚨 ДУБЛИРУЮЩИЙСЯ BOC:', {
            boc: boc.substring(0, 50) + '...',
            count: transactions.length,
            transactions: transactions.map(tx => ({
              id: tx.id,
              userId: tx.user_id,
              amount: tx.amount_ton,
              time: tx.created_at
            }))
          });
        }
      });

      if (duplicatesFound === 0) {
        logger.info('✅ Дублирование не обнаружено');
      } else {
        logger.error(`🚨 Найдено ${duplicatesFound} дублирующихся BOC хешей!`);
      }

    } catch (error) {
      logger.error('❌ Ошибка проверки дублирования:', error);
    }
  }

  private reportDuplicate(boc: string, count: number, transaction: any) {
    console.log('\n🚨 === ОТЧЕТ О ДУБЛИРОВАНИИ ===');
    console.log(`📦 BOC: ${boc.substring(0, 60)}...`);
    console.log(`🔢 Количество дублей: ${count}`);
    console.log(`👤 Пользователь: ${transaction.user_id}`);
    console.log(`💰 Сумма: ${transaction.amount_ton} TON`);
    console.log(`⏰ Время: ${transaction.created_at}`);
    console.log(`🆔 ID транзакции: ${transaction.id}`);
    console.log('================================\n');
  }

  public getEvents(stage?: string): DepositEvent[] {
    if (stage) {
      return this.events.filter(e => e.stage === stage);
    }
    return this.events;
  }

  public getDuplicateStats() {
    const stats = new Map<string, number>();
    this.duplicateTracker.forEach((count, boc) => {
      if (count > 1) {
        stats.set(boc.substring(0, 50) + '...', count);
      }
    });
    return stats;
  }
}

// Создаем глобальный монитор
const monitor = new TonDepositMonitor();

// Экспортируем для использования в других модулях
export { monitor as tonDepositMonitor };

// Запуск в standalone режиме
if (require.main === module) {
  console.log('🔍 TON Deposit Monitor запущен в standalone режиме');
  
  // Показываем статистику каждые 60 секунд
  setInterval(() => {
    const duplicates = monitor.getDuplicateStats();
    if (duplicates.size > 0) {
      console.log('📊 Статистика дублирования:');
      duplicates.forEach((count, boc) => {
        console.log(`  ${boc}: ${count} дублей`);
      });
    } else {
      console.log('✅ Дублирование не обнаружено');
    }
  }, 60000);

  // Предотвращаем завершение процесса
  process.on('SIGINT', () => {
    console.log('\n🛑 TON Deposit Monitor остановлен');
    process.exit(0);
  });
}