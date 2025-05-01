/**
 * Скрипт для проверки состояния партиционирования транзакций
 * Позволяет оценить эффективность партиционирования и проверить корректность настройки
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import ws from 'ws';

// Настройка WebSocket для Neon Serverless
neonConfig.webSocketConstructor = ws;

// Загружаем переменные окружения
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('Ошибка: Отсутствует переменная окружения DATABASE_URL');
  process.exit(1);
}

// Создаем подключение к базе данных
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Выполнение SQL запроса
 */
async function executeQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Ошибка выполнения запроса:', error.message);
    console.error('Запрос:', query);
    return [];
  }
}

/**
 * Проверка статуса партиционирования
 */
async function checkPartitioningStatus() {
  console.log('\n=== ПРОВЕРКА СТАТУСА ПАРТИЦИОНИРОВАНИЯ ===\n');
  
  // Проверяем, является ли таблица transactions партиционированной
  const isPartitionedResult = await executeQuery(`
    SELECT partrelid::regclass AS parent_table
    FROM pg_partitioned_table pt
    JOIN pg_class pc ON pt.partrelid = pc.oid
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
    WHERE pn.nspname = 'public' AND pc.relname = 'transactions';
  `);
  
  if (isPartitionedResult.length === 0) {
    console.log('❌ Таблица transactions НЕ является партиционированной');
    return;
  }
  
  console.log('✅ Таблица transactions является партиционированной');
  
  // Получаем список всех партиций
  const partitionsResult = await executeQuery(`
    SELECT
      child.relname AS partition_name,
      pg_size_pretty(pg_total_relation_size(child.oid)) AS partition_size,
      pg_total_relation_size(child.oid) AS partition_size_bytes
    FROM pg_inherits
    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
    JOIN pg_class child ON pg_inherits.inhrelid = child.oid
    JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
    JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
    WHERE parent.relname = 'transactions'
    ORDER BY partition_name;
  `);
  
  if (partitionsResult.length === 0) {
    console.log('❌ Не найдено ни одной партиции для таблицы transactions');
    return;
  }
  
  console.log(`Найдено ${partitionsResult.length} партиций:`);
  
  // Вычисляем общий размер всех партиций
  let totalSizeBytes = 0;
  partitionsResult.forEach(partition => {
    totalSizeBytes += parseInt(partition.partition_size_bytes);
  });
  
  // Строим таблицу партиций с их размерами
  console.log('\nСписок партиций:');
  console.log('-'.repeat(70));
  console.log('| Название партиции                | Размер     | % от общего |');
  console.log('-'.repeat(70));
  
  partitionsResult.forEach(partition => {
    const percentOfTotal = (parseInt(partition.partition_size_bytes) / totalSizeBytes * 100).toFixed(2);
    const paddedName = partition.partition_name.padEnd(32);
    const paddedSize = partition.partition_size.padEnd(10);
    const paddedPercent = `${percentOfTotal}%`.padEnd(10);
    
    console.log(`| ${paddedName} | ${paddedSize} | ${paddedPercent} |`);
  });
  
  console.log('-'.repeat(70));
  
  // Получаем количество записей в каждой партиции
  console.log('\nКоличество записей в партициях:');
  console.log('-'.repeat(50));
  console.log('| Название партиции                | Кол-во     |');
  console.log('-'.repeat(50));
  
  for (const partition of partitionsResult) {
    const countResult = await executeQuery(`SELECT COUNT(*) FROM ${partition.partition_name}`);
    const count = countResult[0].count;
    const paddedName = partition.partition_name.padEnd(32);
    const paddedCount = count.toString().padEnd(10);
    
    console.log(`| ${paddedName} | ${paddedCount} |`);
  }
  
  console.log('-'.repeat(50));
  
  // Проверяем наличие снимков фарминга
  const snapshotsResult = await executeQuery(`
    SELECT 
      snapshot_date,
      COUNT(*) as count
    FROM farming_snapshots
    GROUP BY snapshot_date
    ORDER BY snapshot_date DESC
    LIMIT 10;
  `);
  
  console.log('\nПоследние снимки фарминга:');
  
  if (snapshotsResult.length === 0) {
    console.log('❌ Снимки фарминга не найдены');
  } else {
    console.log('-'.repeat(45));
    console.log('| Дата снимка  | Количество пользователей |');
    console.log('-'.repeat(45));
    
    snapshotsResult.forEach(snapshot => {
      const date = new Date(snapshot.snapshot_date).toISOString().split('T')[0];
      console.log(`| ${date} | ${snapshot.count.toString().padEnd(22)} |`);
    });
    
    console.log('-'.repeat(45));
  }
  
  // Измеряем производительность запросов
  console.log('\nТестирование производительности запросов:');
  
  // Запрос к партиционированной таблице за сегодня
  console.time('Запрос к партиционированной таблице (сегодня)');
  await executeQuery(`
    SELECT COUNT(*) FROM transactions 
    WHERE created_at >= CURRENT_DATE
  `);
  console.timeEnd('Запрос к партиционированной таблице (сегодня)');
  
  // Запрос к партиционированной таблице за неделю
  console.time('Запрос к партиционированной таблице (неделя)');
  await executeQuery(`
    SELECT COUNT(*) FROM transactions 
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  `);
  console.timeEnd('Запрос к партиционированной таблице (неделя)');
  
  // Запрос к партиционированной таблице по user_id
  console.time('Запрос к партиционированной таблице (по user_id)');
  await executeQuery(`
    SELECT COUNT(*) FROM transactions 
    WHERE user_id = 1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'
  `);
  console.timeEnd('Запрос к партиционированной таблице (по user_id)');
  
  console.log('\n=== ПРОВЕРКА ЗАВЕРШЕНА ===\n');
}

/**
 * Проверка настроек индексов
 */
async function checkIndexes() {
  console.log('\n=== ПРОВЕРКА ИНДЕКСОВ ПАРТИЦИЙ ===\n');
  
  // Получаем список всех индексов на партициях
  const indexesResult = await executeQuery(`
    SELECT
      t.relname AS table_name,
      i.relname AS index_name,
      a.attname AS column_name,
      ix.indisunique AS is_unique,
      ix.indisprimary AS is_primary
    FROM
      pg_class t,
      pg_class i,
      pg_index ix,
      pg_attribute a
    WHERE
      t.oid = ix.indrelid
      AND i.oid = ix.indexrelid
      AND a.attrelid = t.oid
      AND a.attnum = ANY(ix.indkey)
      AND t.relkind = 'r'
      AND t.relname LIKE 'transactions_%'
    ORDER BY
      t.relname,
      i.relname;
  `);
  
  if (indexesResult.length === 0) {
    console.log('❌ Не найдено индексов на партициях');
    return;
  }
  
  // Группируем индексы по таблицам
  const indexesByTable = {};
  indexesResult.forEach(row => {
    if (!indexesByTable[row.table_name]) {
      indexesByTable[row.table_name] = [];
    }
    indexesByTable[row.table_name].push({
      index_name: row.index_name,
      column_name: row.column_name,
      is_unique: row.is_unique,
      is_primary: row.is_primary
    });
  });
  
  // Выводим результаты
  console.log(`Найдено индексов: ${indexesResult.length} на ${Object.keys(indexesByTable).length} партициях`);
  
  console.log('\nИндексы по партициям:');
  for (const [tableName, indexes] of Object.entries(indexesByTable)) {
    console.log(`\nПартиция: ${tableName}`);
    console.log('-'.repeat(80));
    console.log('| Индекс                          | Колонка    | Уникальный | Primary Key |');
    console.log('-'.repeat(80));
    
    indexes.forEach(index => {
      const paddedIndexName = index.index_name.padEnd(32);
      const paddedColumnName = index.column_name.padEnd(10);
      const paddedUnique = (index.is_unique ? 'Да' : 'Нет').padEnd(10);
      const paddedPrimary = (index.is_primary ? 'Да' : 'Нет').padEnd(11);
      
      console.log(`| ${paddedIndexName} | ${paddedColumnName} | ${paddedUnique} | ${paddedPrimary} |`);
    });
    
    console.log('-'.repeat(80));
  }
  
  console.log('\n=== ПРОВЕРКА ИНДЕКСОВ ЗАВЕРШЕНА ===\n');
}

/**
 * Основная функция
 */
async function main() {
  try {
    console.log('=== АНАЛИЗ ПАРТИЦИОНИРОВАНИЯ ТРАНЗАКЦИЙ ===');
    console.log(`Время запуска: ${new Date().toISOString()}`);
    
    await checkPartitioningStatus();
    await checkIndexes();
    
    console.log('\nАнализ успешно завершен.');
  } catch (error) {
    console.error('Ошибка при выполнении анализа:', error);
  } finally {
    // Завершаем подключение к базе данных
    await pool.end();
  }
}

// Запускаем основную функцию
main();