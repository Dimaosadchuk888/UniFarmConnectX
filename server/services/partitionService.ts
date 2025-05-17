/**
 * ВНИМАНИЕ: Используйте импорт из services/index.ts вместо прямого импорта
 * 
 * Этот файл является прокси-оберткой для обратной совместимости.
 * Для новых разработок используйте инстанс partitionService из services/index.ts
 */
import { partitionServiceInstance } from './partitionServiceInstance';
import { 
  PartitionInfo, 
  PartitionLog, 
  IPartitionService 
} from './partitionServiceInstance';

// Реэкспортируем типы для удобства
export { 
  PartitionInfo, 
  PartitionLog, 
  IPartitionService 
};

/**
 * @deprecated Используйте инстанс partitionService из services/index.ts вместо статических методов
 */
export class PartitionService {
  /**
   * Проверяет, является ли таблица партиционированной
   */
  static async isTablePartitioned(tableName?: string): Promise<boolean> {
    return partitionServiceInstance.isTablePartitioned(tableName);
  }

  /**
   * Получает список всех партиций с информацией о них
   */
  static async getPartitionsList(): Promise<PartitionInfo[]> {
    return partitionServiceInstance.getPartitionsList();
  }

  /**
   * Получает логи операций с партициями
   * @param limit максимальное количество записей
   */
  static async getPartitionLogs(limit?: number): Promise<PartitionLog[]> {
    return partitionServiceInstance.getPartitionLogs(limit);
  }

  /**
   * Создаёт партицию для указанной даты
   */
  static async createPartitionForDate(date: Date): Promise<{
    success: boolean;
    partition_name?: string;
    error?: string;
  }> {
    try {
      // Проверяем, не пересекается ли дата с future partition
      const today = new Date();
      if (date > today && date < new Date(today.getFullYear() + 1, 0, 1)) {
        return {
          success: false,
          error: 'Cannot create partition that overlaps with future partition'
        };
      }

      const partitionName = `transactions_${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Оптимизированная проверка для Neon
      const partitionExists = await this.isPartitionExists(partitionName);
      if (partitionExists) {
        return {
          success: true,
          partition_name: partitionName,
          message: 'Partition already exists'
        };
      }

      // Создаем новую партицию напрямую
      await this.createPartitionDirect(date, partitionName);
    } catch (error) {
      console.error('Error creating partition:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Создаёт партиции на будущие даты
   * @param daysAhead на сколько дней вперед создавать партиции
   */
  static async createFuturePartitions(daysAhead?: number): Promise<{
    success: boolean;
    createdCount: number;
    partitions: string[];
    errors: string[];
  }> {
    // Сначала проверяем и удаляем конфликтующую future партицию
    try {
      await db.execute(sql`
        ALTER TABLE transactions DETACH PARTITION transactions_future;
        DROP TABLE IF EXISTS transactions_future;
      `);
    } catch (error) {
      console.log('[Partition Service] Future partition не существует или уже удалена');
    }

    const result = {
      success: true,
      createdCount: 0,
      errors: [] as string[]
    };

    return partitionServiceInstance.createFuturePartitions(daysAhead);
  }

  /**
   * Добавляет запись в лог операций с партициями
   */
  static async logPartitionOperation(
    operationType: string,
    partitionName: string,
    status: string,
    notes?: string,
    errorMessage?: string
  ): Promise<boolean> {
    return partitionServiceInstance.logPartitionOperation(
      operationType,
      partitionName,
      status,
      notes,
      errorMessage
    );
  }
}