/**
 * Скрипт для создания партиций на несколько дней вперед
 * Запускается ежедневно для создания партиций на 5 дней вперед
 */

import { partitionService } from '../services/partition-service';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

/**
 * Функция для создания партиций на несколько дней вперед
 */
export async function createPartitionsJob(): Promise<void> {
  console.log('[Partition Job] Запуск задания по созданию партиций...');
  
  try {
    // Проверяем, является ли таблица партиционированной
    const isPartitioned = await partitionService.isTablePartitioned();
    
    if (!isPartitioned) {
      console.error('[Partition Job] Таблица transactions не является партиционированной. Невозможно создать партиции.');
      return;
    }
    
    // Создаем партиции на 5 дней вперед
    const result = await partitionService.createFuturePartitions(5);
    
    if (result.success) {
      console.log(`[Partition Job] Создано/проверено ${result.createdCount} партиций`);
      
      if (result.errors.length > 0) {
        console.warn('[Partition Job] При создании партиций возникли ошибки:', result.errors);
      }
    } else {
      console.error('[Partition Job] Ошибка при создании партиций:', result.errors);
    }
  } catch (error) {
    console.error('[Partition Job] Необработанная ошибка при создании партиций:', error);
  }
  
  console.log('[Partition Job] Завершение задания по созданию партиций');
}

// Если запущен напрямую, выполняем создание партиций
if (require.main === module) {
  createPartitionsJob()
    .then(() => {
      console.log('Задание по созданию партиций выполнено успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ошибка при выполнении задания по созданию партиций:', error);
      process.exit(1);
    });
}

export default createPartitionsJob;