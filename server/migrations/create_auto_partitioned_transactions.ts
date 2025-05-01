/**
 * Миграция для преобразования таблицы transactions в партиционированную
 * 
 * Выполняет следующие действия:
 * 1. Создает временную таблицу для сохранения данных
 * 2. Копирует все данные из transactions во временную таблицу
 * 3. Удаляет старую таблицу transactions
 * 4. Создает новую партиционированную таблицу transactions
 * 5. Создает партиции для текущего дня и нескольких дней вперед
 * 6. Копирует данные обратно
 * 7. Создает необходимые индексы
 */

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { format, addDays } from 'date-fns';

// Загружаем переменные окружения
dotenv.config();

// Подключаемся к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Логирование
function log(message: string) {
  console.log(`[Migration] ${message}`);
}

/**
 * Выполнение SQL запроса
 */
async function executeQuery(query: string, params: any[] = []) {
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (error: any) {
    console.error(`SQL Error: ${error.message}`);
    console.error(`Query: ${query}`);
    console.error(`Params: ${JSON.stringify(params)}`);
    throw error;
  }
}

/**
 * Создание партиции для указанной даты
 */
async function createPartitionForDate(date: Date) {
  const dateStr = format(date, 'yyyy_MM_dd');
  const partitionName = `transactions_${dateStr}`;
  
  const startDate = format(date, 'yyyy-MM-dd');
  const endDate = format(addDays(date, 1), 'yyyy-MM-dd');
  
  log(`Creating partition ${partitionName} for date ${startDate}`);
  
  const query = `
    CREATE TABLE IF NOT EXISTS ${partitionName}
    PARTITION OF transactions
    FOR VALUES FROM ('${startDate}') TO ('${endDate}');
  `;
  
  await executeQuery(query);
  
  // Создаем индексы для партиции
  log(`Creating indexes for partition ${partitionName}`);
  await executeQuery(`CREATE INDEX IF NOT EXISTS ${partitionName}_user_id_idx ON ${partitionName} (user_id)`);
  await executeQuery(`CREATE INDEX IF NOT EXISTS ${partitionName}_transaction_type_idx ON ${partitionName} (transaction_type)`);
  await executeQuery(`CREATE INDEX IF NOT EXISTS ${partitionName}_created_at_idx ON ${partitionName} (created_at)`);
  
  log(`Partition ${partitionName} created successfully`);
}

/**
 * Проверка, является ли таблица партиционированной
 */
async function isTablePartitioned(tableName: string = 'transactions'): Promise<boolean> {
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
    
    const result = await pool.query(query, [tableName]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error checking if table is partitioned:', error);
    return false;
  }
}

/**
 * Основная функция миграции
 */
export async function runMigration() {
  try {
    log('Starting migration: Converting transactions table to partitioned table');
    
    // Проверяем, существует ли таблица transactions
    const tableExistsResult = await executeQuery(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions')"
    );
    
    const tableExists = tableExistsResult.rows[0].exists;
    if (!tableExists) {
      log('Table transactions does not exist. Cannot proceed with migration.');
      return;
    }
    
    // Проверяем, является ли таблица уже партиционированной
    const isPartitioned = await isTablePartitioned();
    if (isPartitioned) {
      log('Table transactions is already partitioned. Skipping migration.');
      return;
    }
    
    // Начинаем транзакцию
    await executeQuery('BEGIN');
    
    try {
      log('Creating temporary table for transactions data');
      await executeQuery(`
        CREATE TABLE transactions_temp (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          amount DECIMAL(18, 9) NOT NULL,
          transaction_type VARCHAR(50) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          details JSONB
        )
      `);
      
      log('Copying data from transactions to temporary table');
      await executeQuery(`
        INSERT INTO transactions_temp 
        (id, user_id, amount, transaction_type, description, created_at, details)
        SELECT id, user_id, amount, transaction_type, description, created_at, details
        FROM transactions
      `);
      
      // Получаем текущий max id для сброса sequence
      const maxIdResult = await executeQuery('SELECT MAX(id) FROM transactions');
      const maxId = maxIdResult.rows[0].max || 0;
      
      log(`Current max transaction ID: ${maxId}`);
      
      log('Dropping old transactions table');
      await executeQuery('DROP TABLE transactions');
      
      log('Creating new partitioned transactions table');
      await executeQuery(`
        CREATE TABLE transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          amount DECIMAL(18, 9) NOT NULL,
          transaction_type VARCHAR(50) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          details JSONB
        ) PARTITION BY RANGE (created_at)
      `);
      
      // Создаем партиции на текущий день и 5 дней вперед
      const today = new Date();
      for (let i = 0; i < 5; i++) {
        const date = addDays(today, i);
        await createPartitionForDate(date);
      }
      
      log('Copying data back from temporary table to partitioned table');
      await executeQuery(`
        INSERT INTO transactions 
        (id, user_id, amount, transaction_type, description, created_at, details)
        SELECT id, user_id, amount, transaction_type, description, created_at, details
        FROM transactions_temp
      `);
      
      log('Resetting transactions_id_seq');
      await executeQuery(`SELECT setval('transactions_id_seq', ${maxId}, true)`);
      
      log('Dropping temporary table');
      await executeQuery('DROP TABLE transactions_temp');
      
      // Создаем партиции для более старых данных, если они есть
      log('Creating partitions for older data if needed');
      const oldestDateResult = await executeQuery(`
        SELECT DATE_TRUNC('day', MIN(created_at)) as oldest_date
        FROM transactions
      `);
      
      const oldestDate = oldestDateResult.rows[0].oldest_date;
      if (oldestDate && oldestDate < today) {
        log(`Oldest transaction date: ${oldestDate}`);
        
        // Создаем партицию для всех старых записей
        const oldestDateStr = format(new Date(oldestDate), 'yyyy_MM_dd');
        const oldPartitionName = `transactions_old_before_${oldestDateStr}`;
        
        log(`Creating partition ${oldPartitionName} for all older data`);
        await executeQuery(`
          CREATE TABLE IF NOT EXISTS ${oldPartitionName}
          PARTITION OF transactions
          FOR VALUES FROM (MINVALUE) TO ('${format(today, 'yyyy-MM-dd')}');
        `);
        
        // Создаем индексы для старой партиции
        log(`Creating indexes for partition ${oldPartitionName}`);
        await executeQuery(`CREATE INDEX IF NOT EXISTS ${oldPartitionName}_user_id_idx ON ${oldPartitionName} (user_id)`);
        await executeQuery(`CREATE INDEX IF NOT EXISTS ${oldPartitionName}_transaction_type_idx ON ${oldPartitionName} (transaction_type)`);
        await executeQuery(`CREATE INDEX IF NOT EXISTS ${oldPartitionName}_created_at_idx ON ${oldPartitionName} (created_at)`);
      }
      
      // Создаем партицию для будущих записей
      log('Creating default partition for future data');
      const futurePartitionName = 'transactions_future';
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS ${futurePartitionName}
        PARTITION OF transactions
        FOR VALUES FROM ('${format(addDays(today, 5), 'yyyy-MM-dd')}') TO (MAXVALUE);
      `);
      
      // Создаем индексы для будущей партиции
      log(`Creating indexes for future partition ${futurePartitionName}`);
      await executeQuery(`CREATE INDEX IF NOT EXISTS ${futurePartitionName}_user_id_idx ON ${futurePartitionName} (user_id)`);
      await executeQuery(`CREATE INDEX IF NOT EXISTS ${futurePartitionName}_transaction_type_idx ON ${futurePartitionName} (transaction_type)`);
      await executeQuery(`CREATE INDEX IF NOT EXISTS ${futurePartitionName}_created_at_idx ON ${futurePartitionName} (created_at)`);
      
      // Добавляем запись в таблицу partition_logs
      log('Adding record to partition_logs table');
      await executeQuery(`
        INSERT INTO partition_logs 
        (operation_type, partition_name, status, notes) 
        VALUES 
        ('initial_setup', 'transactions', 'success', 'Initial partitioning setup completed successfully')
      `);
      
      log('Committing transaction');
      await executeQuery('COMMIT');
      
      log('Migration completed successfully');
    } catch (error) {
      log('Error during migration. Rolling back.');
      await executeQuery('ROLLBACK');
      throw error;
    } finally {
      // Закрываем соединение с базой данных
      await pool.end();
    }
  } catch (error: any) {
    log(`Migration failed: ${error.message}`);
    console.error(error);
    throw error;
  }
}

// Если скрипт запускается напрямую, выполняем миграцию
// @ts-ignore
if (import.meta.url === import.meta.main) {
  runMigration()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}