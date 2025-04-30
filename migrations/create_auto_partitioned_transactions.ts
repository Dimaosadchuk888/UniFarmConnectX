import { db, pool } from '../server/db';
import { format } from 'date-fns';

/**
 * Миграция для создания автоматически партиционируемой таблицы транзакций
 * 
 * Эта миграция создает новую структуру таблицы transactions с автоматическим
 * партиционированием по дате. Она также добавляет триггер для создания новых
 * партиций при необходимости.
 */
async function runMigration() {
  try {
    console.log('Начало миграции: создание автоматически партиционируемой таблицы transactions...');

    // Создаем функцию для автоматического создания партиций
    await pool.query(`
      -- Функция для создания партиции по дате
      CREATE OR REPLACE FUNCTION create_transactions_partition_if_not_exists(partition_date DATE)
      RETURNS VOID AS $$
      DECLARE
        partition_name TEXT;
        start_date TEXT;
        end_date TEXT;
      BEGIN
        -- Формируем имя партиции в формате transactions_YYYY_MM_DD
        partition_name := 'transactions_' || TO_CHAR(partition_date, 'YYYY_MM_DD');
        
        -- Определяем границы партиции (1 день)
        start_date := TO_CHAR(partition_date, 'YYYY-MM-DD');
        end_date := TO_CHAR(partition_date + INTERVAL '1 day', 'YYYY-MM-DD');
        
        -- Проверяем, существует ли партиция
        IF NOT EXISTS (
          SELECT 1
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = partition_name AND n.nspname = 'public'
        ) THEN
          -- Создаем партицию, если не существует
          EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF transactions_partitioned 
                          FOR VALUES FROM (%L) TO (%L)', 
                          partition_name, start_date, end_date);
          
          -- Создаем индексы на партиции для оптимизации запросов
          EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (user_id)', 
                       'idx_' || partition_name || '_user_id', partition_name);
          
          EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (created_at)', 
                       'idx_' || partition_name || '_created_at', partition_name);
                       
          EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (user_id, created_at)', 
                       'idx_' || partition_name || '_user_id_created_at', 
                       partition_name);
                       
          -- Логируем создание новой партиции
          RAISE NOTICE 'Created new partition: %', partition_name;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Создаем основную партиционированную таблицу
    await pool.query(`
      -- Создаем новую партиционированную таблицу
      CREATE TABLE IF NOT EXISTS transactions_partitioned (
        id SERIAL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        amount NUMERIC NOT NULL,
        currency VARCHAR(10) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'completed',
        tx_hash VARCHAR(255),
        wallet_address VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP,
        PRIMARY KEY (id, created_at)
      ) PARTITION BY RANGE (created_at);
    `);

    // Создаем функцию для создания партиций на следующие 30 дней
    await pool.query(`
      -- Функция для создания партиций на следующие 30 дней
      CREATE OR REPLACE FUNCTION create_future_transactions_partitions()
      RETURNS VOID AS $$
      DECLARE
        current_date DATE := CURRENT_DATE;
        i INTEGER;
      BEGIN
        -- Создаем партиции на следующие 30 дней
        FOR i IN 0..30 LOOP
          PERFORM create_transactions_partition_if_not_exists(current_date + (i * INTERVAL '1 day'));
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Создаем триггерную функцию для автоматического создания партиций при вставке
    await pool.query(`
      -- Триггерная функция для проверки наличия нужной партиции перед вставкой
      CREATE OR REPLACE FUNCTION transactions_insert_trigger()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Создаем партицию для даты вставляемой транзакции, если её нет
        PERFORM create_transactions_partition_if_not_exists(NEW.created_at::DATE);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Триггер на вставку новых транзакций
      DROP TRIGGER IF EXISTS transactions_before_insert_trigger ON transactions_partitioned;
      CREATE TRIGGER transactions_before_insert_trigger
        BEFORE INSERT ON transactions_partitioned
        FOR EACH ROW EXECUTE FUNCTION transactions_insert_trigger();
    `);

    // Создаем партиции для текущей даты и на 30 дней вперед
    await pool.query(`
      -- Создаем партиции для текущего дня и на 30 дней вперед
      SELECT create_future_transactions_partitions();
    `);

    console.log('Партиционированная таблица transactions_partitioned успешно создана');
    console.log('Функция для автоматического создания партиций успешно создана');
    console.log('Триггеры для автоматического партиционирования успешно созданы');
    console.log('Партиции для текущего дня и 30 дней вперед успешно созданы');
    
    console.log('\nВАЖНО: Для перехода на партиционированную таблицу необходимо:');
    console.log('1. Мигрировать данные из старой таблицы "transactions" в новую "transactions_partitioned"');
    console.log('2. После успешной миграции данных переименовать таблицы');
    console.log('Эти шаги рекомендуется выполнять в контролируемом окне обслуживания.');
  } catch (error) {
    console.error('Ошибка при создании автоматически партиционируемой таблицы transactions:', error);
    throw error;
  }
}

// Экспортируем функцию миграции
export default runMigration;

// Если скрипт запущен напрямую, выполняем миграцию
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Миграция для автоматического партиционирования успешно выполнена');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ошибка при выполнении миграции автоматического партиционирования:', error);
      process.exit(1);
    });
}