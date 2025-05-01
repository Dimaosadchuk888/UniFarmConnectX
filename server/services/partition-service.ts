/**
 * Сервис для управления партициями таблицы transactions
 * Отвечает за создание новых партиций и логирование операций
 */

import { Pool } from '@neondatabase/serverless';
import { format, addDays } from 'date-fns';
import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Класс для управления партициями
 */
export class PartitionService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Проверяет, является ли таблица партиционированной
   */
  async isTablePartitioned(tableName: string = 'transactions'): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT partrelid::regclass AS parent_table
        FROM pg_partitioned_table pt
        JOIN pg_class pc ON pt.partrelid = pc.oid
        JOIN pg_namespace pn ON pc.relnamespace = pn.oid
        WHERE pn.nspname = 'public' AND pc.relname = $1;
      `, [tableName]);

      return result.rows.length > 0;
    } catch (error) {
      console.error('Ошибка при проверке партиционирования таблицы:', error);
      return false;
    }
  }

  /**
   * Создает партицию для указанной даты
   */
  async createPartitionForDate(date: Date): Promise<{ success: boolean, partitionName: string, error?: string }> {
    const dateStr = format(date, 'yyyy_MM_dd');
    const partitionName = `transactions_${dateStr}`;
    const nextDate = addDays(date, 1);
    
    try {
      // Проверяем существование партиции
      const partitionExists = await this.partitionExists(partitionName);
      
      if (partitionExists) {
        await this.logPartitionOperation(partitionName, date, 'skipped', 'Партиция уже существует');
        return { success: true, partitionName, error: 'Партиция уже существует' };
      }
      
      // Создаем новую партицию
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF transactions
        FOR VALUES FROM ('${format(date, 'yyyy-MM-dd')}') TO ('${format(nextDate, 'yyyy-MM-dd')}');
      `);
      
      // Создаем индексы для партиции
      await this.createPartitionIndexes(partitionName);
      
      // Логируем успешное создание
      await this.logPartitionOperation(partitionName, date, 'success');
      
      console.log(`Создана партиция ${partitionName} для даты ${format(date, 'yyyy-MM-dd')}`);
      return { success: true, partitionName };
    } catch (error: any) {
      console.error(`Ошибка при создании партиции для даты ${format(date, 'yyyy-MM-dd')}:`, error);
      
      // Логируем ошибку
      await this.logPartitionOperation(partitionName, date, 'error', error.message);
      
      return { success: false, partitionName, error: error.message };
    }
  }

  /**
   * Создает индексы для партиции
   */
  private async createPartitionIndexes(partitionName: string): Promise<void> {
    try {
      // Индекс по user_id
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS ${partitionName}_user_id_idx ON ${partitionName} (user_id);
      `);
      
      // Индекс по типу транзакции
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS ${partitionName}_type_idx ON ${partitionName} (type);
      `);
      
      // Индекс по времени создания
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS ${partitionName}_created_at_idx ON ${partitionName} (created_at);
      `);
      
      // Составной индекс по user_id и типу для частых запросов
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS ${partitionName}_user_id_type_idx ON ${partitionName} (user_id, type);
      `);
    } catch (error) {
      console.error(`Ошибка при создании индексов для партиции ${partitionName}:`, error);
      throw error;
    }
  }

  /**
   * Проверяет существование партиции
   */
  async partitionExists(partitionName: string): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT 1 
        FROM pg_tables 
        WHERE tablename = $1;
      `, [partitionName]);
      
      return result.rows.length > 0;
    } catch (error) {
      console.error(`Ошибка при проверке существования партиции ${partitionName}:`, error);
      return false;
    }
  }

  /**
   * Создает партиции на несколько дней вперед
   */
  async createFuturePartitions(daysAhead: number = 5): Promise<{ success: boolean, createdCount: number, errors: any[] }> {
    const errors: any[] = [];
    let createdCount = 0;
    
    try {
      // Создаем партиции от сегодня до указанного количества дней вперед
      const today = new Date();
      
      for (let i = 0; i <= daysAhead; i++) {
        const targetDate = addDays(today, i);
        const result = await this.createPartitionForDate(targetDate);
        
        if (result.success && !result.error) {
          createdCount++;
        } else if (!result.success) {
          errors.push({
            date: format(targetDate, 'yyyy-MM-dd'),
            error: result.error
          });
        }
      }
      
      return { success: true, createdCount, errors };
    } catch (error) {
      console.error('Ошибка при создании будущих партиций:', error);
      return { success: false, createdCount, errors: [...errors, error] };
    }
  }

  /**
   * Логирует операцию с партицией в таблицу partition_logs
   */
  private async logPartitionOperation(
    partitionName: string, 
    partitionDate: Date, 
    status: 'success' | 'error' | 'skipped',
    details: string = ''
  ): Promise<void> {
    try {
      await this.pool.query(`
        INSERT INTO partition_logs (
          partition_name, 
          partition_date, 
          status, 
          details
        ) VALUES ($1, $2, $3, $4)
      `, [
        partitionName,
        format(partitionDate, 'yyyy-MM-dd'),
        status,
        details
      ]);
    } catch (error) {
      console.error('Ошибка при логировании операции с партицией:', error);
    }
  }

  /**
   * Получение статистики по партициям
   */
  async getPartitionsStats(): Promise<any[]> {
    try {
      const result = await this.pool.query(`
        SELECT
          child.relname AS partition_name,
          pg_size_pretty(pg_total_relation_size(child.oid)) AS partition_size,
          pg_total_relation_size(child.oid) AS partition_size_bytes,
          (SELECT COUNT(*) FROM ${sql.raw('child.relname')}) AS record_count
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
        JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
        WHERE parent.relname = 'transactions'
        ORDER BY partition_name;
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Ошибка при получении статистики по партициям:', error);
      return [];
    }
  }

  /**
   * Получает список всех партиций и количество записей в них
   */
  async getAllPartitions(): Promise<any[]> {
    try {
      // Сначала получаем список всех партиций
      const partitionsResult = await this.pool.query(`
        SELECT tablename AS partition_name
        FROM pg_tables
        WHERE tablename LIKE 'transactions_%'
        ORDER BY tablename;
      `);
      
      const partitions = partitionsResult.rows;
      
      // Для каждой партиции получаем количество записей
      for (const partition of partitions) {
        try {
          const countResult = await this.pool.query(`
            SELECT COUNT(*) FROM ${partition.partition_name}
          `);
          
          partition.record_count = parseInt(countResult.rows[0].count);
          
          // Получаем размер партиции
          const sizeResult = await this.pool.query(`
            SELECT pg_size_pretty(pg_total_relation_size($1::regclass)) AS size
          `, [`public.${partition.partition_name}`]);
          
          partition.size = sizeResult.rows[0].size;
          
          // Добавляем дату партиции
          const dateMatch = partition.partition_name.match(/transactions_(\d{4})_(\d{2})_(\d{2})/);
          if (dateMatch) {
            partition.date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
          }
        } catch (error) {
          console.error(`Ошибка при получении информации о партиции ${partition.partition_name}:`, error);
          partition.record_count = 'Ошибка';
          partition.size = 'Недоступно';
        }
      }
      
      return partitions;
    } catch (error) {
      console.error('Ошибка при получении списка партиций:', error);
      return [];
    }
  }

  /**
   * Получает логи операций с партициями
   */
  async getPartitionLogs(limit: number = 50): Promise<any[]> {
    try {
      const result = await this.pool.query(`
        SELECT * FROM partition_logs
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    } catch (error) {
      console.error('Ошибка при получении логов партиций:', error);
      return [];
    }
  }
}

// Экспортируем singleton-инстанс сервиса партиционирования
export const partitionService = new PartitionService(db.$client);