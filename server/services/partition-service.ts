/**
 * Сервис для управления партициями таблицы transactions
 */

import { db, query } from '../db';
import { format, addDays } from 'date-fns';

/**
 * Интерфейс для информации о партиции
 */
interface PartitionInfo {
  partition_name: string;
  record_count?: number;
  size?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * Интерфейс для лога операций с партицией
 */
interface PartitionLog {
  id: number;
  operation_type: string;
  partition_name: string;
  status: string;
  notes?: string;
  error_message?: string;
  created_at: Date;
}

/**
 * Сервис для работы с партициями таблицы transactions
 */
class PartitionService {
  /**
   * Проверяет, является ли таблица партиционированной
   */
  async isTablePartitioned(tableName: string = 'transactions'): Promise<boolean> {
    try {
      const query = `
        SELECT pt.relname as parent_table, 
               c.relname as child_table,
               pg_get_expr(c.relpartbound, c.oid) as partition_expression
        FROM pg_inherits i
        JOIN pg_class pt ON pt.oid = i.inhparent
        JOIN pg_class c ON c.oid = i.inhrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE pt.relname = $1 
        AND n.nspname = 'public'
        LIMIT 1;
      `;
      
      const result = await query(query, [tableName]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error checking if table is partitioned:', error);
      return false;
    }
  }
  
  /**
   * Получает список всех партиций с информацией о них
   */
  async getPartitionsList(): Promise<PartitionInfo[]> {
    try {
      // Проверяем, что таблица партиционирована
      const isPartitioned = await this.isTablePartitioned();
      
      if (!isPartitioned) {
        console.log('Table transactions is not partitioned');
        return [];
      }
      
      const query = `
        SELECT
          child.relname AS partition_name,
          pg_size_pretty(pg_total_relation_size(child.oid)) AS size,
          pg_catalog.obj_description(child.oid) AS description,
          (SELECT count(*) FROM pg_stat_user_tables 
           WHERE relname = child.relname) AS record_count,
          pg_get_expr(child.relpartbound, child.oid) AS partition_expression
        FROM pg_inherits i
        JOIN pg_class parent ON parent.oid = i.inhparent
        JOIN pg_class child ON child.oid = i.inhrelid
        JOIN pg_namespace n ON n.oid = parent.relnamespace
        WHERE parent.relname = 'transactions'
        AND n.nspname = 'public'
        ORDER BY
          child.relname;
      `;
      
      const result = await db.query(query, []);
      
      // Если ошибка в запросе, пробуем более простой запрос
      if (!result.rows) {
        // Упрощенный запрос, если предыдущий не сработал
        const simpleQuery = `
          SELECT
            child.relname AS partition_name,
            pg_size_pretty(pg_relation_size(child.oid)) AS size
          FROM pg_inherits i
          JOIN pg_class parent ON parent.oid = i.inhparent
          JOIN pg_class child ON child.oid = i.inhrelid
          JOIN pg_namespace n ON n.oid = parent.relnamespace
          WHERE parent.relname = 'transactions'
          AND n.nspname = 'public'
          ORDER BY
            child.relname;
        `;
        
        const simpleResult = await db.query(simpleQuery, []);
        return simpleResult.rows;
      }
      
      return result.rows;
    } catch (error) {
      console.error('Error getting partitions list:', error);
      return [];
    }
  }
  
  /**
   * Получает логи операций с партициями
   * @param limit максимальное количество записей
   */
  async getPartitionLogs(limit: number = 50): Promise<PartitionLog[]> {
    try {
      // Проверяем, существует ли таблица partition_logs
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'partition_logs'
        )
      `;
      
      const tableExistsResult = await db.query(tableExistsQuery, []);
      
      if (!tableExistsResult.rows[0].exists) {
        console.log('Table partition_logs does not exist');
        return [];
      }
      
      const query = `
        SELECT * FROM partition_logs
        ORDER BY created_at DESC
        LIMIT $1
      `;
      
      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting partition logs:', error);
      return [];
    }
  }
  
  /**
   * Создаёт партицию для указанной даты
   */
  async createPartitionForDate(date: Date): Promise<{
    success: boolean;
    partition_name?: string;
    error?: string;
  }> {
    try {
      const dateStr = format(date, 'yyyy_MM_dd');
      const partitionName = `transactions_${dateStr}`;
      
      const startDate = format(date, 'yyyy-MM-dd');
      const endDate = format(addDays(date, 1), 'yyyy-MM-dd');
      
      console.log(`[PartitionService] Creating partition ${partitionName} for date ${startDate}`);
      
      // Проверяем, существует ли уже эта партиция
      const checkPartitionQuery = `
        SELECT relname 
        FROM pg_class 
        WHERE relname = $1
      `;
      
      const checkResult = await db.query(checkPartitionQuery, [partitionName]);
      
      if (checkResult.rowCount > 0) {
        console.log(`[PartitionService] Partition ${partitionName} already exists`);
        
        // Добавляем запись в логи
        await this.logPartitionOperation(
          'create',
          partitionName,
          'skipped',
          `Partition ${partitionName} already exists`
        );
        
        return {
          success: true,
          partition_name: partitionName
        };
      }
      
      // Создаем партицию
      const createPartitionQuery = `
        CREATE TABLE IF NOT EXISTS ${partitionName}
        PARTITION OF transactions
        FOR VALUES FROM ('${startDate}') TO ('${endDate}');
      `;
      
      await db.query(createPartitionQuery, []);
      
      // Создаем индексы для партиции
      console.log(`[PartitionService] Creating indexes for partition ${partitionName}`);
      
      await db.query(`CREATE INDEX IF NOT EXISTS ${partitionName}_user_id_idx ON ${partitionName} (user_id)`, []);
      await db.query(`CREATE INDEX IF NOT EXISTS ${partitionName}_transaction_type_idx ON ${partitionName} (transaction_type)`, []);
      await db.query(`CREATE INDEX IF NOT EXISTS ${partitionName}_created_at_idx ON ${partitionName} (created_at)`, []);
      
      // Добавляем запись в логи
      await this.logPartitionOperation(
        'create',
        partitionName,
        'success',
        `Partition ${partitionName} created successfully for date range ${startDate} to ${endDate}`
      );
      
      console.log(`[PartitionService] Partition ${partitionName} created successfully`);
      
      return {
        success: true,
        partition_name: partitionName
      };
    } catch (error: any) {
      console.error('[PartitionService] Error creating partition for date:', error);
      
      // Добавляем запись в логи об ошибке
      await this.logPartitionOperation(
        'create',
        `transactions_${format(date, 'yyyy_MM_dd')}`,
        'error',
        `Error creating partition: ${error.message}`,
        error.message
      );
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Создаёт партиции на будущие даты
   * @param daysAhead на сколько дней вперед создавать партиции
   */
  async createFuturePartitions(daysAhead: number = 5): Promise<{
    success: boolean;
    createdCount: number;
    partitions: string[];
    errors: string[];
  }> {
    const partitions: string[] = [];
    const errors: string[] = [];
    let createdCount = 0;
    
    try {
      // Проверяем, что таблица партиционирована
      const isPartitioned = await this.isTablePartitioned();
      
      if (!isPartitioned) {
        return {
          success: false,
          createdCount: 0,
          partitions: [],
          errors: ['Table transactions is not partitioned']
        };
      }
      
      // Создаем партиции на указанное количество дней вперед
      const today = new Date();
      
      for (let i = 0; i <= daysAhead; i++) {
        const date = addDays(today, i);
        const result = await this.createPartitionForDate(date);
        
        if (result.success) {
          if (result.partition_name) {
            partitions.push(result.partition_name);
            createdCount++;
          }
        } else if (result.error) {
          errors.push(result.error);
        }
      }
      
      return {
        success: true,
        createdCount,
        partitions,
        errors
      };
    } catch (error: any) {
      console.error('[PartitionService] Error creating future partitions:', error);
      
      return {
        success: false,
        createdCount,
        partitions,
        errors: [...errors, error.message]
      };
    }
  }
  
  /**
   * Добавляет запись в лог операций с партициями
   */
  async logPartitionOperation(
    operationType: string,
    partitionName: string,
    status: string,
    notes?: string,
    errorMessage?: string
  ): Promise<boolean> {
    try {
      // Проверяем, существует ли таблица partition_logs
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'partition_logs'
        )
      `;
      
      const tableExistsResult = await db.query(tableExistsQuery, []);
      
      if (!tableExistsResult.rows[0].exists) {
        console.log('[PartitionService] Table partition_logs does not exist, creating it');
        
        // Создаем таблицу partition_logs, если она не существует
        const createTableQuery = `
          CREATE TABLE partition_logs (
            id SERIAL PRIMARY KEY,
            operation_type VARCHAR(50) NOT NULL,
            partition_name VARCHAR(100) NOT NULL,
            status VARCHAR(20) NOT NULL,
            notes TEXT,
            error_message TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `;
        
        await db.query(createTableQuery, []);
        
        // Создаем индексы для таблицы
        await db.query('CREATE INDEX partition_logs_operation_type_idx ON partition_logs (operation_type)', []);
        await db.query('CREATE INDEX partition_logs_partition_name_idx ON partition_logs (partition_name)', []);
        await db.query('CREATE INDEX partition_logs_status_idx ON partition_logs (status)', []);
        await db.query('CREATE INDEX partition_logs_created_at_idx ON partition_logs (created_at)', []);
      }
      
      // Добавляем запись в лог
      const query = `
        INSERT INTO partition_logs 
        (operation_type, partition_name, status, notes, error_message) 
        VALUES 
        ($1, $2, $3, $4, $5)
      `;
      
      await db.query(query, [operationType, partitionName, status, notes, errorMessage]);
      
      return true;
    } catch (error) {
      console.error('[PartitionService] Error logging partition operation:', error);
      return false;
    }
  }
}

// Создаем экземпляр сервиса
export const partitionService = new PartitionService();