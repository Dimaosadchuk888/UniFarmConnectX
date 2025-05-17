/**
 * Скрипт для проверки дубликатов транзакций в базе данных
 * Помогает выявить потенциальные ошибки в работе приложения
 */

// Загрузка переменных окружения из .env файла
require('dotenv').config();

const { Pool } = require('pg');

// Создание пула подключений к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/**
 * Выполняет SQL-запрос к базе данных
 * @param {string} query SQL-запрос
 * @param {Array} params Параметры запроса
 * @returns {Promise<Array>} Результаты запроса
 */
async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Проверяет наличие дубликатов транзакций
 */
async function checkTransactionDuplicates() {
  console.log('\n=== Проверка дубликатов транзакций ===\n');
  
  // Запрос для поиска дубликатов транзакций по user_id, amount, transaction_type и созданным в одинаковую дату
  const query = `
    SELECT 
      user_id, 
      amount, 
      transaction_type, 
      COUNT(*) as count,
      ARRAY_AGG(id) as transaction_ids,
      ARRAY_AGG(created_at) as dates
    FROM 
      transactions
    GROUP BY 
      user_id, amount, transaction_type, DATE(created_at)
    HAVING 
      COUNT(*) > 1
    ORDER BY 
      count DESC, MAX(created_at) DESC
    LIMIT 100
  `;
  
  const duplicates = await executeQuery(query);
  
  if (duplicates.length === 0) {
    console.log('Дубликатов транзакций не обнаружено.');
    return;
  }
  
  console.log(`Обнаружено ${duplicates.length} потенциальных групп дубликатов транзакций:`);
  
  for (const dup of duplicates) {
    console.log('\n------------------------------');
    console.log(`User ID: ${dup.user_id}`);
    console.log(`Сумма: ${dup.amount}`);
    console.log(`Тип транзакции: ${dup.transaction_type}`);
    console.log(`Количество дубликатов: ${dup.count}`);
    console.log(`ID транзакций: ${dup.transaction_ids.join(', ')}`);
    
    // Преобразуем даты в читаемый формат
    const dates = dup.dates.map(date => new Date(date).toISOString());
    console.log(`Даты создания: ${dates.join(', ')}`);
  }
}

/**
 * Проверяет целостность данных по рефералам
 */
async function checkReferralIntegrity() {
  console.log('\n=== Проверка целостности реферальных данных ===\n');
  
  // Запрос для поиска несоответствий в реферальных данных
  const query = `
    SELECT 
      u.id, 
      u.username,
      u.ref_code,
      u.referrer_id,
      r.id as referrer_exists
    FROM 
      users u
    LEFT JOIN
      users r ON u.referrer_id = r.id
    WHERE 
      u.referrer_id IS NOT NULL AND r.id IS NULL
  `;
  
  const invalidReferrals = await executeQuery(query);
  
  if (invalidReferrals.length === 0) {
    console.log('Несоответствий в реферальных данных не обнаружено.');
    return;
  }
  
  console.log(`Обнаружено ${invalidReferrals.length} несоответствий в реферальных данных:`);
  
  for (const invalid of invalidReferrals) {
    console.log('\n------------------------------');
    console.log(`User ID: ${invalid.id}`);
    console.log(`Username: ${invalid.username || 'Не указан'}`);
    console.log(`Реферальный код: ${invalid.ref_code || 'Не задан'}`);
    console.log(`ID несуществующего реферера: ${invalid.referrer_id}`);
  }
}

/**
 * Проверяет состояние партиций таблицы транзакций
 */
async function checkPartitionStatus() {
  console.log('\n=== Проверка состояния партиций транзакций ===\n');
  
  // Запрос для получения информации о партициях
  const query = `
    SELECT
      parent.relname AS parent_table,
      child.relname AS partition_name,
      pg_get_expr(child.relpartbound, child.oid) AS partition_expression
    FROM pg_inherits
    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
    JOIN pg_class child ON pg_inherits.inhrelid = child.oid
    JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
    JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
    WHERE parent.relname = 'transactions'
    ORDER BY partition_name
  `;
  
  try {
    const partitions = await executeQuery(query);
    
    if (partitions.length === 0) {
      console.log('Партиции для таблицы транзакций не найдены или партиционирование не настроено.');
      return;
    }
    
    console.log(`Обнаружено ${partitions.length} партиций для таблицы транзакций:`);
    
    for (const partition of partitions) {
      console.log('\n------------------------------');
      console.log(`Родительская таблица: ${partition.parent_table}`);
      console.log(`Название партиции: ${partition.partition_name}`);
      console.log(`Выражение партиции: ${partition.partition_expression}`);
    }
    
    // Дополнительно проверим размер каждой партиции
    console.log('\n=== Размеры партиций ===\n');
    
    for (const partition of partitions) {
      const sizeQuery = `
        SELECT pg_size_pretty(pg_total_relation_size('${partition.partition_name}')) as size
      `;
      
      const sizeResult = await executeQuery(sizeQuery);
      console.log(`${partition.partition_name}: ${sizeResult[0].size}`);
    }
  } catch (error) {
    console.error('Ошибка при проверке партиций:', error.message);
  }
}

/**
 * Главная функция для запуска всех проверок
 */
async function runAllChecks() {
  try {
    console.log('=================================================');
    console.log('  ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ UNIFARM');
    console.log('=================================================');
    console.log(`Дата проверки: ${new Date().toISOString()}`);
    console.log('=================================================\n');
    
    await checkTransactionDuplicates();
    await checkReferralIntegrity();
    await checkPartitionStatus();
    
    console.log('\n=================================================');
    console.log('  ПРОВЕРКА ЗАВЕРШЕНА');
    console.log('=================================================');
  } catch (error) {
    console.error('\nОШИБКА при выполнении проверок:', error);
  } finally {
    // Закрываем соединение с базой данных
    pool.end();
  }
}

// Запускаем все проверки
runAllChecks();