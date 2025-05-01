/**
 * Сервис для управления партиционированием таблицы transactions
 * 
 * Предоставляет методы для:
 * 1. Проверки статуса партиционирования
 * 2. Получения списка партиций
 * 3. Создания новых партиций
 * 4. Очистки старых партиций
 */

import { pool } from '../db.js';
import { format, addDays } from 'date-fns';

// Логирование
export function log(message) {
  console.log(`[PartitionService] ${message}`);
}

// Выполнение SQL запроса
export async function executeQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (error) {
    console.error(`SQL Error: ${error.message}`);
    console.error(`Query: ${query}`);
    console.error(`Params: ${JSON.stringify(params)}`);
    throw error;
  }
}

// Проверка, является ли таблица партиционированной
export async function isTablePartitioned(tableName = 'transactions') {
  try {
    const query = `
      SELECT EXISTS (
        SELECT FROM pg_partitioned_table pt
        JOIN pg_class pc ON pt.partrelid = pc.oid
        JOIN pg_namespace pn ON pc.relnamespace = pn.oid
        WHERE pc.relname = $1
        AND pn.nspname = 'public'
      );
    `;
    
    const result = await executeQuery(query, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking if table is partitioned: ${error.message}`);
    return false;
  }
}

// Получение списка всех партиций
export async function getPartitionsList(tableName = 'transactions') {
  try {
    const query = `
      SELECT c.relname as partition_name, 
             pg_get_expr(c.relpartbound, c.oid) as partition_expression,
             pg_size_pretty(pg_total_relation_size(c.oid)) as size,
             pg_relation_size(c.oid) as raw_size,
             (SELECT COUNT(*) FROM ${tableName} WHERE created_at::date = TO_DATE(SUBSTRING(c.relname FROM '${tableName}_([0-9_]+)'), 'YYYY_MM_DD')) as row_count
      FROM pg_inherits i
      JOIN pg_class p ON p.oid = i.inhparent
      JOIN pg_class c ON c.oid = i.inhrelid
      WHERE p.relname = $1
      AND c.relname LIKE '${tableName}_%'
      ORDER BY c.relname;
    `;
    
    const result = await executeQuery(query, [tableName]);
    return result.rows;
  } catch (error) {
    console.error(`Error getting partitions list: ${error.message}`);
    return [];
  }
}

// Получение истории операций над партициями
export async function getPartitionLogs(limit = 50) {
  try {
    const query = `
      SELECT * FROM partition_logs
      ORDER BY created_at DESC
      LIMIT $1;
    `;
    
    const result = await executeQuery(query, [limit]);
    return result.rows;
  } catch (error) {
    console.error(`Error getting partition logs: ${error.message}`);
    return [];
  }
}

// Проверка существования партиции
export async function partitionExists(partitionName) {
  try {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `;
    const result = await executeQuery(query, [partitionName]);
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking if partition exists: ${error.message}`);
    return false;
  }
}

// Создание партиции для указанной даты
export async function createPartitionForDate(date, tableName = 'transactions') {
  const dateStr = format(date, 'yyyy_MM_dd');
  const partitionName = `${tableName}_${dateStr}`;
  
  // Проверяем, существует ли уже партиция
  const exists = await partitionExists(partitionName);
  if (exists) {
    log(`Partition ${partitionName} already exists. Skipping.`);
    return {
      created: false,
      partitionName,
      alreadyExists: true
    };
  }
  
  const startDate = format(date, 'yyyy-MM-dd');
  const endDate = format(addDays(date, 1), 'yyyy-MM-dd');
  
  log(`Creating partition ${partitionName} for date ${startDate}`);
  
  try {
    // Начинаем транзакцию
    await executeQuery('BEGIN');
    
    // Создаем партицию
    const query = `
      CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${tableName}
      FOR VALUES FROM ('${startDate}') TO ('${endDate}');
    `;
    
    await executeQuery(query);
    
    // Создаем индексы для партиции
    log(`Creating indexes for partition ${partitionName}`);
    await executeQuery(`CREATE INDEX IF NOT EXISTS ${partitionName}_user_id_idx ON ${partitionName} (user_id)`);
    await executeQuery(`CREATE INDEX IF NOT EXISTS ${partitionName}_type_idx ON ${partitionName} (type)`);
    await executeQuery(`CREATE INDEX IF NOT EXISTS ${partitionName}_created_at_idx ON ${partitionName} (created_at)`);
    
    // Записываем информацию о созданной партиции в таблицу логов
    await executeQuery(`
      INSERT INTO partition_logs 
      (operation_type, partition_name, status, notes) 
      VALUES 
      ('create', $1, 'success', $2)
    `, [partitionName, `Partition created for date ${startDate}`]);
    
    // Подтверждаем транзакцию
    await executeQuery('COMMIT');
    
    log(`Partition ${partitionName} created successfully`);
    return {
      created: true,
      partitionName
    };
  } catch (error) {
    // Откатываем транзакцию в случае ошибки
    await executeQuery('ROLLBACK');
    
    // Логируем ошибку в таблицу логов
    try {
      await executeQuery(`
        INSERT INTO partition_logs 
        (operation_type, partition_name, status, notes, error_message) 
        VALUES 
        ('create', $1, 'error', $2, $3)
      `, [partitionName, `Failed to create partition for date ${startDate}`, error.message]);
    } catch (logError) {
      console.error(`Failed to log error to partition_logs: ${logError.message}`);
    }
    
    log(`Error creating partition ${partitionName}: ${error.message}`);
    return {
      created: false,
      error: error.message,
      partitionName
    };
  }
}

// Создание партиций на будущие дни
export async function createFuturePartitions(days = 7, tableName = 'transactions') {
  const today = new Date();
  const results = [];
  
  // Проверяем, является ли таблица партиционированной
  const isPartitioned = await isTablePartitioned(tableName);
  if (!isPartitioned) {
    log(`Table ${tableName} is not partitioned. Cannot create partitions.`);
    return {
      success: false,
      error: `Table ${tableName} is not partitioned`
    };
  }
  
  // Создаем партиции на будущие дни
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const result = await createPartitionForDate(date, tableName);
    results.push(result);
  }
  
  return {
    success: true,
    results
  };
}

// Удаление партиции
export async function dropPartition(partitionName, tableName = 'transactions') {
  try {
    // Проверяем, существует ли партиция
    const exists = await partitionExists(partitionName);
    if (!exists) {
      log(`Partition ${partitionName} does not exist. Cannot drop.`);
      return {
        dropped: false,
        partitionName,
        error: 'Partition does not exist'
      };
    }
    
    log(`Dropping partition ${partitionName}`);
    
    // Начинаем транзакцию
    await executeQuery('BEGIN');
    
    try {
      // Удаляем партицию
      await executeQuery(`DROP TABLE IF EXISTS ${partitionName}`);
      
      // Записываем информацию об удалении в таблицу логов
      await executeQuery(`
        INSERT INTO partition_logs 
        (operation_type, partition_name, status, notes) 
        VALUES 
        ('drop', $1, 'success', $2)
      `, [partitionName, `Partition ${partitionName} dropped successfully`]);
      
      // Подтверждаем транзакцию
      await executeQuery('COMMIT');
      
      log(`Partition ${partitionName} dropped successfully`);
      return {
        dropped: true,
        partitionName
      };
    } catch (error) {
      // Откатываем транзакцию в случае ошибки
      await executeQuery('ROLLBACK');
      
      // Логируем ошибку в таблицу логов
      await executeQuery(`
        INSERT INTO partition_logs 
        (operation_type, partition_name, status, notes, error_message) 
        VALUES 
        ('drop', $1, 'error', $2, $3)
      `, [partitionName, `Failed to drop partition ${partitionName}`, error.message]);
      
      log(`Error dropping partition ${partitionName}: ${error.message}`);
      return {
        dropped: false,
        partitionName,
        error: error.message
      };
    }
  } catch (error) {
    console.error(`Error in dropPartition: ${error.message}`);
    return {
      dropped: false,
      partitionName,
      error: error.message
    };
  }
}

// Получение статистики о партициях
export async function getPartitionStats(tableName = 'transactions') {
  try {
    // Проверяем, является ли таблица партиционированной
    const isPartitioned = await isTablePartitioned(tableName);
    if (!isPartitioned) {
      return {
        isPartitioned: false,
        totalPartitions: 0,
        totalSize: '0 bytes',
        partitions: []
      };
    }
    
    // Получаем список партиций
    const partitions = await getPartitionsList(tableName);
    
    // Получаем общий размер всех партиций
    const totalSizeQuery = `
      SELECT pg_size_pretty(sum(pg_total_relation_size(c.oid))) as total_size
      FROM pg_inherits i
      JOIN pg_class p ON p.oid = i.inhparent
      JOIN pg_class c ON c.oid = i.inhrelid
      WHERE p.relname = $1;
    `;
    
    const totalSizeResult = await executeQuery(totalSizeQuery, [tableName]);
    const totalSize = totalSizeResult.rows[0]?.total_size || '0 bytes';
    
    // Получаем количество записей в таблице
    const countQuery = `SELECT COUNT(*) as total_rows FROM ${tableName};`;
    const countResult = await executeQuery(countQuery);
    const totalRows = parseInt(countResult.rows[0]?.total_rows || '0', 10);
    
    return {
      isPartitioned,
      totalPartitions: partitions.length,
      totalSize,
      totalRows,
      partitions
    };
  } catch (error) {
    console.error(`Error getting partition stats: ${error.message}`);
    return {
      isPartitioned: false,
      totalPartitions: 0,
      totalSize: '0 bytes',
      totalRows: 0,
      partitions: [],
      error: error.message
    };
  }
}