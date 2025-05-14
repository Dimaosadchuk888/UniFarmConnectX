/**
 * Скрипт для настройки партиционирования таблицы transactions в Neon DB
 */

import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

// Управление цветами в консоли
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Основная функция для настройки партиционирования
async function setupPartitioning() {
  if (!process.env.DATABASE_URL) {
    log('❌ Ошибка: DATABASE_URL не установлен в переменных окружения', colors.red);
    return false;
  }

  log('🔄 Настройка партиционирования для таблицы transactions в Neon DB...', colors.blue);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  let client;
  
  try {
    client = await pool.connect();
    
    // Шаг 1: Проверяем, существует ли таблица transactions
    const tableExistsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'transactions'
      )
    `);
    
    if (!tableExistsResult.rows[0].exists) {
      log('❌ Ошибка: Таблица transactions не существует', colors.red);
      return false;
    }
    
    // Шаг 2: Проверяем, партиционирована ли уже таблица
    const partitionCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relname = 'transactions' AND n.nspname = 'public' AND c.relkind = 'p'
      ) as is_partitioned
    `);
    
    if (partitionCheckResult.rows[0].is_partitioned) {
      log('✅ Таблица transactions уже партиционирована', colors.green);
      
      // Получаем список существующих партиций
      const partitionsResult = await client.query(`
        SELECT child.relname as partition_name
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        JOIN pg_namespace nmsp_parent ON parent.relnamespace = nmsp_parent.oid
        JOIN pg_namespace nmsp_child ON child.relnamespace = nmsp_child.oid
        WHERE parent.relname = 'transactions' AND nmsp_parent.nspname = 'public'
      `);
      
      log(`Найдено ${partitionsResult.rows.length} партиций:`, colors.blue);
      partitionsResult.rows.forEach((row, index) => {
        log(`${index + 1}. ${row.partition_name}`, colors.reset);
      });
      
      return true;
    }
    
    // Шаг 3: Создаем резервную копию таблицы
    log('📦 Создание резервной копии таблицы transactions...', colors.yellow);
    
    // Проверяем наличие данных
    const countResult = await client.query('SELECT COUNT(*) FROM transactions');
    const rowCount = parseInt(countResult.rows[0].count);
    
    log(`В таблице transactions найдено ${rowCount} записей`, colors.blue);
    
    // Создаем резервную копию
    await client.query('BEGIN');
    try {
      await client.query('CREATE TABLE transactions_backup AS SELECT * FROM transactions');
      log('✅ Резервная копия transactions_backup успешно создана', colors.green);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      log(`❌ Ошибка при создании резервной копии: ${err.message}`, colors.red);
      return false;
    }
    
    // Шаг 4: Проверяем успешность создания резервной копии
    const backupCountResult = await client.query('SELECT COUNT(*) FROM transactions_backup');
    const backupRowCount = parseInt(backupCountResult.rows[0].count);
    
    if (backupRowCount !== rowCount) {
      log(`❌ Ошибка: В резервной копии ${backupRowCount} записей вместо ${rowCount}`, colors.red);
      return false;
    }
    
    // Шаг 5: Определяем диапазон дат для партиций
    let minDate, maxDate;
    
    if (rowCount > 0) {
      const dateRangeResult = await client.query(`
        SELECT 
          MIN(created_at) as min_date,
          MAX(created_at) as max_date
        FROM transactions_backup
      `);
      
      minDate = dateRangeResult.rows[0].min_date;
      maxDate = dateRangeResult.rows[0].max_date;
      
      log(`Диапазон дат: ${minDate} - ${maxDate}`, colors.blue);
    } else {
      // Если данных нет, используем текущий месяц
      const now = new Date();
      minDate = new Date(now.getFullYear(), now.getMonth(), 1);
      maxDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      
      log(`Таблица пуста, используем диапазон дат: ${minDate.toISOString().slice(0, 10)} - ${maxDate.toISOString().slice(0, 10)}`, colors.yellow);
    }
    
    // Шаг 6: Пересоздаем таблицу с партиционированием
    log('🔄 Пересоздание таблицы transactions с партиционированием...', colors.magenta);
    
    await client.query('BEGIN');
    try {
      // Удаляем исходную таблицу
      await client.query('DROP TABLE transactions CASCADE');
      
      // Создаем партиционированную таблицу
      await client.query(`
        CREATE TABLE transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          type TEXT,
          currency TEXT,
          amount NUMERIC(18, 6),
          status TEXT DEFAULT 'confirmed',
          source TEXT,
          category TEXT,
          tx_hash TEXT,
          description TEXT,
          source_user_id INTEGER,
          wallet_address TEXT,
          data TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        ) PARTITION BY RANGE (created_at)
      `);
      
      log('✅ Таблица с партиционированием создана', colors.green);
      
      // Создаем индексы на основной таблице
      await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_source_user_id ON transactions(source_user_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(type, status)');
      
      log('✅ Индексы созданы', colors.green);
      
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      log(`❌ Ошибка при пересоздании таблицы: ${err.message}`, colors.red);
      return false;
    }
    
    // Шаг 7: Создаем партиции
    log('🔄 Создание партиций...', colors.blue);
    
    // Функция для создания партиции
    async function createPartition(startDate, endDate) {
      const formattedStart = startDate instanceof Date 
        ? startDate.toISOString().slice(0, 10)
        : startDate;
        
      const formattedEnd = endDate instanceof Date 
        ? endDate.toISOString().slice(0, 10)
        : endDate;
      
      const partitionName = `transactions_${formattedStart.replace(/-/g, '_')}`;
      
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF transactions
          FOR VALUES FROM ('${formattedStart}') TO ('${formattedEnd}')
        `);
        
        // Создаем дополнительные индексы на партиции
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${partitionName}_created_at ON ${partitionName}(created_at)`);
        
        log(`✅ Создана партиция ${partitionName} (${formattedStart} - ${formattedEnd})`, colors.green);
        return true;
      } catch (err) {
        log(`❌ Ошибка при создании партиции ${partitionName}: ${err.message}`, colors.red);
        return false;
      }
    }
    
    // Создаем партиции по месяцам
    const startDate = minDate ? new Date(minDate) : new Date();
    startDate.setDate(1); // Начало месяца
    
    const endDate = maxDate ? new Date(maxDate) : new Date();
    endDate.setMonth(endDate.getMonth() + 3); // Добавляем 3 месяца для будущих записей
    
    const current = new Date(startDate);
    
    while (current < endDate) {
      const partitionStart = new Date(current);
      
      current.setMonth(current.getMonth() + 1);
      
      const partitionEnd = new Date(current);
      
      await createPartition(
        partitionStart.toISOString().slice(0, 10),
        partitionEnd.toISOString().slice(0, 10)
      );
    }
    
    // Шаг 8: Восстанавливаем данные
    if (rowCount > 0) {
      log('🔄 Восстановление данных из резервной копии...', colors.blue);
      
      try {
        await client.query('BEGIN');
        
        // Копируем данные
        await client.query(`
          INSERT INTO transactions (
            id, user_id, type, currency, amount, status, 
            source, category, tx_hash, description, 
            source_user_id, wallet_address, data, created_at
          )
          SELECT 
            id, user_id, type, currency, amount, status, 
            source, category, tx_hash, description, 
            source_user_id, wallet_address, data, created_at
          FROM transactions_backup
        `);
        
        await client.query('COMMIT');
        
        // Проверяем восстановление
        const restoredCountResult = await client.query('SELECT COUNT(*) FROM transactions');
        const restoredCount = parseInt(restoredCountResult.rows[0].count);
        
        if (restoredCount === rowCount) {
          log(`✅ Успешно восстановлено ${restoredCount} записей из резервной копии`, colors.green);
        } else {
          log(`⚠️ Восстановлено только ${restoredCount} из ${rowCount} записей`, colors.yellow);
        }
      } catch (err) {
        await client.query('ROLLBACK');
        log(`❌ Ошибка при восстановлении данных: ${err.message}`, colors.red);
        return false;
      }
    }
    
    // Шаг 9: Проверяем настройку партиционирования
    const finalCheckResult = await client.query(`
      SELECT COUNT(*) as partition_count
      FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_namespace nmsp_parent ON parent.relnamespace = nmsp_parent.oid
      WHERE parent.relname = 'transactions' AND nmsp_parent.nspname = 'public'
    `);
    
    const partitionCount = parseInt(finalCheckResult.rows[0].partition_count);
    
    if (partitionCount > 0) {
      log(`🎉 Партиционирование успешно настроено! Создано ${partitionCount} партиций.`, colors.green);
      return true;
    } else {
      log('❌ Что-то пошло не так. Партиции не созданы.', colors.red);
      return false;
    }
  } catch (err) {
    log(`❌ Критическая ошибка: ${err.message}`, colors.red);
    console.error(err.stack);
    return false;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

// Запускаем скрипт
setupPartitioning()
  .then(success => {
    if (success) {
      log('\n✅ Настройка партиционирования успешно завершена', colors.green);
    } else {
      log('\n❌ Не удалось настроить партиционирование', colors.red);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Непредвиденная ошибка:', err);
    process.exit(1);
  });