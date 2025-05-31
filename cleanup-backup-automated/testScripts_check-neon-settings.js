/**
 * Скрипт для проверки текущих настроек Neon DB
 */

import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

async function checkNeonSettings() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Ошибка: DATABASE_URL не установлен в переменных окружения');
    return false;
  }

  console.log('🔍 Проверка настроек Neon DB...\n');
  console.log(`URL подключения: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

  // Проверяем, использует ли URL пулер соединений
  const isUsingPooler = process.env.DATABASE_URL.includes('-pooler');
  console.log(`👥 Использование пулера соединений: ${isUsingPooler ? '✅ Да' : '❌ Нет'}`);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // 1. Проверка версии PostgreSQL
    const versionResult = await pool.query('SELECT version()');
    console.log(`🔢 Версия PostgreSQL: ${versionResult.rows[0].version.split(',')[0]}`);

    // 2. Проверка SSL
    const sslResult = await pool.query('SHOW ssl');
    console.log(`🔒 SSL включен: ${sslResult.rows[0].ssl === 'on' ? '✅ Да' : '❌ Нет'}`);

    // 3. Проверка текущих соединений
    const connectionsResult = await pool.query(`
      SELECT count(*) as active_connections 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);
    console.log(`🔌 Активные соединения: ${connectionsResult.rows[0].active_connections}`);

    // 4. Проверка лимитов соединений
    const maxConnectionsResult = await pool.query('SHOW max_connections');
    console.log(`📊 Максимальное количество соединений: ${maxConnectionsResult.rows[0].max_connections}`);

    // 5. Проверка партиционирования transactions
    try {
      const partitionResult = await pool.query(`
        SELECT count(*) as partition_count
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        WHERE parent.relname = 'transactions'
      `);
      
      const isPartitioned = partitionResult.rows[0].partition_count > 0;
      console.log(`📋 Таблица transactions партиционирована: ${isPartitioned ? '✅ Да' : '❌ Нет'}`);
      
      if (isPartitioned) {
        console.log(`   Количество партиций: ${partitionResult.rows[0].partition_count}`);
      }
    } catch (err) {
      console.log(`📋 Проверка партиционирования transactions: ❌ Ошибка (${err.message})`);
    }

    // 6. Проверка размера базы данных
    const dbSizeResult = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as db_size
    `);
    console.log(`💾 Размер базы данных: ${dbSizeResult.rows[0].db_size}`);

    // 7. Проверка настроек безопасности
    const passwordEncryptionResult = await pool.query('SHOW password_encryption');
    console.log(`🔐 Метод шифрования паролей: ${passwordEncryptionResult.rows[0].password_encryption}`);

    // 8. Дополнительная информация о конфигурации
    console.log('\n⚙️ Дополнительные настройки PostgreSQL:');
    
    const configParams = [
      'work_mem', 
      'maintenance_work_mem', 
      'shared_buffers', 
      'effective_cache_size',
      'max_wal_size',
      'default_statistics_target'
    ];
    
    for (const param of configParams) {
      try {
        const result = await pool.query(`SHOW ${param}`);
        console.log(`   ${param}: ${result.rows[0][param]}`);
      } catch (err) {
        console.log(`   ${param}: недоступно`);
      }
    }

    console.log('\n✅ Проверка настроек Neon DB завершена');
    
    // Рекомендации на основе проверки
    console.log('\n🔧 Рекомендации:');
    
    if (!isUsingPooler) {
      console.log('1. Включите пулер соединений в Neon Dashboard для улучшения производительности');
      console.log('   - Строка подключения должна содержать "-pooler" в имени хоста');
    }
    
    try {
      const partitionCheckResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_tables 
          WHERE schemaname = 'public' AND tablename = 'transactions'
        ) as exists
      `);
      
      if (partitionCheckResult.rows[0].exists) {
        const partitionResult = await pool.query(`
          SELECT EXISTS (
            SELECT FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relname = 'transactions' AND n.nspname = 'public' AND c.relkind = 'p'
          ) as is_partitioned
        `);
        
        if (!partitionResult.rows[0].is_partitioned) {
          console.log('2. Настройте партиционирование для таблицы transactions');
          console.log('   - Запустите скрипт fix-partition-schema.cjs для настройки партиционирования');
        }
      }
    } catch (err) {
      console.log('2. Не удалось проверить партиционирование. Возможно, требуется настройка.');
    }

    return true;
  } catch (err) {
    console.error(`❌ Ошибка при проверке настроек Neon DB: ${err.message}`);
    console.error(err.stack);
    return false;
  } finally {
    await pool.end();
  }
}

// Запускаем проверку
checkNeonSettings()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Непредвиденная ошибка:', err);
    process.exit(1);
  });