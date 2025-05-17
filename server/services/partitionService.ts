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
      const partitionName = `transactions_${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // Проверяем существование будущей партиции
      const futurePartitionExists = await this.isPartitionExists('transactions_future');
      
      if (futurePartitionExists) {
        // Если будущая партиция существует, перемещаем данные перед созданием новой
        await this.moveDataFromFuturePartition(date);
      }
  }> {
    return partitionServiceInstance.createPartitionForDate(date);
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