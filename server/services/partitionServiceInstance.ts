/**
 * Сервис для управления партициями таблицы transactions
 */

import { db, wrappedPool } from '../db';

// Функция-обертка для запросов к базе данных
async function dbQuery(text: string, params: any[] = []) {
  return await wrappedPool.query(text, params);
}
import { format, addDays } from 'date-fns';

/**
 * Интерфейс для информации о партиции
 */
export interface PartitionInfo {
  partition_name: string;
  partition_expression?: string;
  record_count?: number;
  size?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * Интерфейс для лога операций с партицией
 */
export interface PartitionLog {
  id: number;
  operation_type: string; // Используем operation_type согласно ТЗ
  partition_name: string;
  status: string;
  notes?: string;
  error_message?: string;
  created_at: Date;
}

/**
 * Интерфейс сервиса для работы с партициями таблицы transactions
 */
export interface IPartitionService {
  /**
   * Проверяет, является ли таблица партиционированной
   */
  isTablePartitioned(tableName?: string): Promise<boolean>;
  
  /**
   * Получает список всех партиций с информацией о них
   */
  getPartitionsList(): Promise<PartitionInfo[]>;
  
  /**
   * Получает логи операций с партициями
   * @param limit максимальное количество записей
   */
  getPartitionLogs(limit?: number): Promise<PartitionLog[]>;
  
  /**
   * Создаёт партицию для указанной даты
   */
  createPartitionForDate(date: Date): Promise<{
    success: boolean;
    partition_name?: string;
    error?: string;
  }>;
  
  /**
   * Создаёт партиции на будущие даты
   * @param daysAhead на сколько дней вперед создавать партиции
   */
  createFuturePartitions(daysAhead?: number): Promise<{
    success: boolean;
    createdCount: number;
    partitions: string[];
    errors: string[];
  }>;
  
  /**
   * Добавляет запись в лог операций с партициями
   */
  logPartitionOperation(
    operationType: string,
    partitionName: string,
    status: string,
    notes?: string,
    errorMessage?: string
  ): Promise<boolean>;
}

/**
 * Сервис для работы с партициями таблицы transactions
 */
class PartitionServiceImpl implements IPartitionService {
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
      
      const result = await dbQuery(query, [tableName]);
      return !!result.rowCount && result.rowCount > 0;
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
      
      const result = await dbQuery(query, []);
      
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
        
        const simpleResult = await dbQuery(simpleQuery, []);
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
      
      const tableExistsResult = await dbQuery(tableExistsQuery, []);
      
      if (!tableExistsResult.rows[0].exists) {
        console.log('Table partition_logs does not exist');
        return [];
      }
      
      // Проверим структуру таблицы, чтобы использовать правильные имена колонок
      const columnsQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'partition_logs'
      `;
      
      const columnsResult = await dbQuery(columnsQuery, []);
      const columns = columnsResult.rows.map((row: any) => row.column_name);
      
      // Формируем запрос с учетом актуальных имен колонок
      const createdAtField = columns.includes('created_at') ? 'created_at' : 'timestamp';
      
      const sqlQuery = `
        SELECT 
          id,
          ${columns.includes('operation_type') ? 'operation_type' : 'operation'} as operation_type,
          partition_name,
          status,
          ${columns.includes('notes') ? 'notes' : 'null as notes'},
          ${columns.includes('error_message') ? 'error_message' : 
            (columns.includes('error_details') ? 'error_details' : 'null')} as error_message,
          ${createdAtField} as created_at
        FROM partition_logs
        ORDER BY ${createdAtField} DESC
        LIMIT $1
      `;
      
      const result = await dbQuery(sqlQuery, [limit]);
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
      
      const checkResult = await dbQuery(checkPartitionQuery, [partitionName]);
      
      if (!!checkResult.rowCount && checkResult.rowCount > 0) {
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
      
      await dbQuery(createPartitionQuery, []);
      
      // Создаем индексы для партиции
      console.log(`[PartitionService] Creating indexes for partition ${partitionName}`);
      
      await dbQuery(`CREATE INDEX IF NOT EXISTS ${partitionName}_user_id_idx ON ${partitionName} (user_id)`, []);
      await dbQuery(`CREATE INDEX IF NOT EXISTS ${partitionName}_type_idx ON ${partitionName} (type)`, []);
      await dbQuery(`CREATE INDEX IF NOT EXISTS ${partitionName}_created_at_idx ON ${partitionName} (created_at)`, []);
      
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
      
      const tableExistsResult = await dbQuery(tableExistsQuery, []);
      
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
        
        await dbQuery(createTableQuery, []);
        
        // Создаем индексы для таблицы
        await dbQuery('CREATE INDEX partition_logs_operation_type_idx ON partition_logs (operation_type)', []);
        await dbQuery('CREATE INDEX partition_logs_partition_name_idx ON partition_logs (partition_name)', []);
        await dbQuery('CREATE INDEX partition_logs_status_idx ON partition_logs (status)', []);
        await dbQuery('CREATE INDEX partition_logs_created_at_idx ON partition_logs (created_at)', []);
      } else {
        // Проверим структуру таблицы
        const columnsQuery = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'partition_logs'
        `;
        
        const columnsResult = await dbQuery(columnsQuery, []);
        const columns = columnsResult.rows.map((row: any) => row.column_name);
        
        // Проверяем и добавляем недостающие поля
        if (!columns.includes('notes')) {
          console.log('[PartitionService] Adding missing notes column to partition_logs');
          await dbQuery('ALTER TABLE partition_logs ADD COLUMN notes TEXT', []);
        }
        
        if (!columns.includes('error_message') && !columns.includes('error_details')) {
          console.log('[PartitionService] Adding missing error_message column to partition_logs');
          await dbQuery('ALTER TABLE partition_logs ADD COLUMN error_message TEXT', []);
        }
      }
      
      // Проверяем структуру таблицы для формирования правильного запроса
      const columnsQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'partition_logs'
      `;
      
      const columnsResult = await dbQuery(columnsQuery, []);
      const columns = columnsResult.rows.map((row: any) => row.column_name);
      
      // Используем операцию в зависимости от имени колонки
      const operationField = columns.includes('operation_type') ? 'operation_type' : 'operation';
      const errorField = columns.includes('error_message') ? 'error_message' : 
                        (columns.includes('error_details') ? 'error_details' : 'null');
      const timestampField = columns.includes('created_at') ? 'created_at' : 'timestamp';
      
      // Добавляем запись в лог
      const messageField = columns.includes('message') ? ', message' : '';
      
      const sqlQuery = `
        INSERT INTO partition_logs 
        (${operationField}, partition_name, status, notes, ${errorField}${messageField}) 
        VALUES 
        ($1, $2, $3, $4, $5${messageField ? ', $6' : ''})
      `;
      
      // Сообщение для лога, используем notes если оно доступно или создаем новое сообщение
      const logMessage = notes || `Operation ${operationType} for partition ${partitionName} with status ${status}`;
      
      // Параметры запроса
      const queryParams = messageField 
        ? [operationType, partitionName, status, notes, errorMessage, logMessage]
        : [operationType, partitionName, status, notes, errorMessage];
      
      await dbQuery(sqlQuery, queryParams);
      
      console.log(`[PartitionService] Logged partition operation: ${operationType} for ${partitionName} with status ${status}`);
      return true;
    } catch (error) {
      console.error('[PartitionService] Error logging partition operation:', error);
      return false;
    }
  }
}

/**
 * Создает экземпляр сервиса партиций
 */
export function createPartitionService(): IPartitionService {
  return new PartitionServiceImpl();
}

// Создаем единственный экземпляр сервиса
export const partitionServiceInstance = createPartitionService();