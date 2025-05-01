/**
 * Скрипт для последовательного выполнения миграций партиционирования
 * 
 * Выполняет следующие шаги:
 * 1. Создает таблицу partition_logs для логирования операций с партициями
 * 2. Преобразует таблицу transactions в партиционированную по дате
 * 3. Создает партиции на ближайшие несколько дней
 */

import { runMigration as createPartitionLogs } from './server/migrations/create_partition_logs';
import { runMigration as createAutoPartitionedTransactions } from './server/migrations/create_auto_partitioned_transactions';
import { createPartitionsJob } from './server/scripts/create_partitions';
import { fileURLToPath } from 'url';

async function setupPartitioning() {
  try {
    console.log('=== НАСТРОЙКА ПАРТИЦИОНИРОВАНИЯ ТРАНЗАКЦИЙ ===');
    
    // Шаг 1: Создание таблицы partition_logs
    console.log('\n--- Шаг 1: Создание таблицы partition_logs ---');
    await createPartitionLogs();
    
    // Шаг 2: Преобразование таблицы transactions в партиционированную
    console.log('\n--- Шаг 2: Преобразование таблицы transactions в партиционированную ---');
    await createAutoPartitionedTransactions();
    
    // Шаг 3: Создание партиций на ближайшие дни
    console.log('\n--- Шаг 3: Создание партиций на ближайшие дни ---');
    const result = await createPartitionsJob();
    console.log('Результат создания партиций:', result);
    
    console.log('\n=== НАСТРОЙКА ПАРТИЦИОНИРОВАНИЯ ЗАВЕРШЕНА ===');
    console.log('Таблица transactions успешно партиционирована по дате');
    console.log('Партиции созданы на несколько дней вперед');
    console.log('Система готова к обработке миллионов транзакций в день');
    
    return { success: true };
  } catch (error: any) {
    console.error('Ошибка при настройке партиционирования:', error);
    return { 
      success: false, 
      error: error.message,
      stack: error.stack
    };
  }
}

// Если скрипт запущен напрямую, выполняем настройку партиционирования
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupPartitioning()
    .then((result) => {
      console.log('Выполнение завершено:', result.success ? 'успешно' : 'с ошибками');
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Критическая ошибка:', error);
      process.exit(1);
    });
}

export default setupPartitioning;