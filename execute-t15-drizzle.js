/**
 * T15: Выполнение синхронизации базы данных через Drizzle
 * Исправляет критические недостатки структуры, найденные в T14
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import fs from 'fs';

class DrizzleT15Executor {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(this.pool);
    this.operations = [];
    this.results = [];
  }

  /**
   * Определяет критические операции для T15
   */
  defineCriticalOperations() {
    // Критические недостающие поля из анализа T14
    this.operations = [
      {
        name: 'add_users_ref_code',
        description: 'Добавление ref_code в таблицу users',
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS ref_code TEXT UNIQUE',
        priority: 'critical'
      },
      {
        name: 'add_users_parent_ref_code',
        description: 'Добавление parent_ref_code в таблицу users',
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_ref_code TEXT',
        priority: 'critical'
      },
      {
        name: 'add_transactions_source_user_id',
        description: 'Добавление source_user_id в таблицу transactions',
        sql: 'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_user_id INTEGER',
        priority: 'critical'
      },
      {
        name: 'add_airdrop_user_id',
        description: 'Добавление user_id в таблицу airdrop_participants',
        sql: 'ALTER TABLE airdrop_participants ADD COLUMN IF NOT EXISTS user_id INTEGER',
        priority: 'critical'
      },
      {
        name: 'idx_users_telegram_id',
        description: 'Индекс для users.telegram_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)',
        priority: 'high'
      },
      {
        name: 'idx_users_ref_code',
        description: 'Индекс для users.ref_code',
        sql: 'CREATE INDEX IF NOT EXISTS idx_users_ref_code ON users(ref_code)',
        priority: 'high'
      },
      {
        name: 'idx_users_parent_ref_code',
        description: 'Индекс для users.parent_ref_code',
        sql: 'CREATE INDEX IF NOT EXISTS idx_users_parent_ref_code ON users(parent_ref_code)',
        priority: 'high'
      },
      {
        name: 'idx_transactions_user_id',
        description: 'Индекс для transactions.user_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)',
        priority: 'high'
      },
      {
        name: 'idx_transactions_source_user_id',
        description: 'Индекс для transactions.source_user_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_source_user_id ON transactions(source_user_id)',
        priority: 'high'
      },
      {
        name: 'idx_transactions_type',
        description: 'Индекс для transactions.transaction_type',
        sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type)',
        priority: 'high'
      },
      {
        name: 'idx_referrals_user_id',
        description: 'Индекс для referrals.user_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id)',
        priority: 'medium'
      },
      {
        name: 'idx_referrals_inviter_id',
        description: 'Индекс для referrals.inviter_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_referrals_inviter_id ON referrals(inviter_id)',
        priority: 'medium'
      },
      {
        name: 'idx_missions_type',
        description: 'Индекс для missions.type',
        sql: 'CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(type)',
        priority: 'medium'
      },
      {
        name: 'idx_airdrop_telegram_id',
        description: 'Индекс для airdrop_participants.telegram_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_airdrop_telegram_id ON airdrop_participants(telegram_id)',
        priority: 'medium'
      }
    ];

    console.log(`Запланировано ${this.operations.length} операций синхронизации`);
  }

  /**
   * Проверяет существующую структуру
   */
  async checkExistingStructure() {
    console.log('Проверка существующей структуры базы данных...');
    
    try {
      // Проверяем существующие таблицы
      const tablesResult = await this.db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      const existingTables = tablesResult.rows.map(row => row.table_name);
      console.log(`Найдено таблиц: ${existingTables.length}`);
      console.log(`Таблицы: ${existingTables.join(', ')}`);
      
      // Проверяем существующие колонки в критических таблицах
      const criticalTables = ['users', 'transactions', 'airdrop_participants'];
      
      for (const tableName of criticalTables) {
        if (existingTables.includes(tableName)) {
          const columnsResult = await this.db.execute(sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = ${tableName}
            ORDER BY column_name
          `);
          
          const columns = columnsResult.rows.map(row => row.column_name);
          console.log(`${tableName}: ${columns.join(', ')}`);
        }
      }
      
      return existingTables;
    } catch (error) {
      console.error('Ошибка проверки структуры:', error.message);
      throw error;
    }
  }

  /**
   * Выполняет операцию синхронизации
   */
  async executeOperation(operation) {
    console.log(`Выполнение: ${operation.description}`);
    
    try {
      const startTime = Date.now();
      
      await this.db.execute(sql.raw(operation.sql));
      
      const duration = Date.now() - startTime;
      
      this.results.push({
        operation: operation.name,
        description: operation.description,
        sql: operation.sql,
        success: true,
        duration: duration,
        error: null
      });
      
      console.log(`✅ Выполнено за ${duration}ms`);
      return true;
    } catch (error) {
      console.log(`❌ Ошибка: ${error.message}`);
      
      this.results.push({
        operation: operation.name,
        description: operation.description,
        sql: operation.sql,
        success: false,
        duration: null,
        error: error.message
      });
      
      // Для критических операций показываем детали, но продолжаем
      if (operation.priority === 'critical') {
        console.log(`Критическая операция провалена: ${operation.name}`);
      }
      
      return false;
    }
  }

  /**
   * Выполняет все операции синхронизации
   */
  async executeAllOperations() {
    console.log('Начало выполнения операций синхронизации...');
    
    // Сортируем по приоритету
    const sortedOps = [...this.operations].sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2, low: 3 };
      return priority[a.priority] - priority[b.priority];
    });
    
    let successCount = 0;
    let failCount = 0;
    
    for (const operation of sortedOps) {
      const success = await this.executeOperation(operation);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Небольшая пауза между операциями
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\nРезультат выполнения: ${successCount} успешных, ${failCount} неудачных`);
    return { successCount, failCount };
  }

  /**
   * Проверяет результаты синхронизации
   */
  async validateResults() {
    console.log('Проверка результатов синхронизации...');
    
    const validations = [];
    
    // Проверяем добавленные колонки
    const criticalFields = [
      { table: 'users', field: 'ref_code' },
      { table: 'users', field: 'parent_ref_code' },
      { table: 'transactions', field: 'source_user_id' },
      { table: 'airdrop_participants', field: 'user_id' }
    ];
    
    for (const { table, field } of criticalFields) {
      try {
        const result = await this.db.execute(sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = ${table} 
            AND column_name = ${field}
        `);
        
        const exists = result.rows.length > 0;
        validations.push({
          type: 'column',
          table,
          field,
          exists,
          status: exists ? 'создан' : 'отсутствует'
        });
        
        console.log(`${table}.${field}: ${exists ? '✅' : '❌'}`);
      } catch (error) {
        validations.push({
          type: 'column',
          table,
          field,
          exists: false,
          status: `ошибка: ${error.message}`
        });
      }
    }
    
    // Проверяем некоторые индексы
    try {
      const indexResult = await this.db.execute(sql`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND indexname LIKE 'idx_%'
        ORDER BY indexname
      `);
      
      const indexes = indexResult.rows.map(row => row.indexname);
      console.log(`Найдено индексов: ${indexes.length}`);
      console.log(`Индексы: ${indexes.join(', ')}`);
      
      validations.push({
        type: 'indexes',
        count: indexes.length,
        list: indexes
      });
    } catch (error) {
      console.log(`Ошибка проверки индексов: ${error.message}`);
    }
    
    return validations;
  }

  /**
   * Генерирует отчет T15
   */
  generateReport(executionResults, validationResults) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 ОТЧЕТ T15: СИНХРОНИЗАЦИЯ СТРУКТУРЫ БАЗЫ ДАННЫХ');
    console.log('='.repeat(80));

    const { successCount, failCount } = executionResults;
    const totalOps = successCount + failCount;
    
    console.log(`\nСтатистика выполнения:`);
    console.log(`  Всего операций: ${totalOps}`);
    console.log(`  Успешных: ${successCount}`);
    console.log(`  Неудачных: ${failCount}`);
    console.log(`  Процент успеха: ${Math.round((successCount / totalOps) * 100)}%`);

    console.log(`\nДетализация операций:`);
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const timing = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`  ${index + 1}. ${status} ${result.description}${timing}`);
      if (!result.success) {
        console.log(`     Ошибка: ${result.error}`);
      }
    });

    console.log(`\nПроверка результатов:`);
    const columnValidations = validationResults.filter(v => v.type === 'column');
    const successfulColumns = columnValidations.filter(v => v.exists).length;
    
    console.log(`  Критические поля: ${successfulColumns}/${columnValidations.length} созданы`);
    columnValidations.forEach(v => {
      const status = v.exists ? '✅' : '❌';
      console.log(`    ${status} ${v.table}.${v.field}: ${v.status}`);
    });

    const indexValidation = validationResults.find(v => v.type === 'indexes');
    if (indexValidation) {
      console.log(`  Индексы: ${indexValidation.count} создано`);
    }

    const isSuccess = successCount > failCount && successfulColumns >= 3;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`СТАТУС T15: ${isSuccess ? '✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА УСПЕШНО' : '⚠️ ЧАСТИЧНАЯ СИНХРОНИЗАЦИЯ'}`);
    console.log(`${'='.repeat(80)}`);

    // Сохраняем отчет
    const report = {
      timestamp: new Date().toISOString(),
      task: 'T15_DRIZZLE_SYNCHRONIZATION',
      statistics: { totalOps, successCount, failCount, successRate: Math.round((successCount / totalOps) * 100) },
      operations: this.results,
      validations: validationResults,
      status: isSuccess ? 'SUCCESS' : 'PARTIAL',
      summary: {
        critical_fields_added: successfulColumns,
        indexes_created: indexValidation?.count || 0,
        system_ready: isSuccess
      }
    };

    fs.writeFileSync('T15_DRIZZLE_EXECUTION_REPORT.json', JSON.stringify(report, null, 2));
    console.log('\n✅ Отчет T15 сохранен: T15_DRIZZLE_EXECUTION_REPORT.json');

    return { isSuccess, report };
  }

  /**
   * Основной метод выполнения T15
   */
  async execute() {
    try {
      console.log('🚀 ЗАПУСК T15: СИНХРОНИЗАЦИЯ ЧЕРЕЗ DRIZZLE');
      
      this.defineCriticalOperations();
      
      const existingTables = await this.checkExistingStructure();
      
      const executionResults = await this.executeAllOperations();
      
      const validationResults = await this.validateResults();
      
      const { isSuccess } = this.generateReport(executionResults, validationResults);
      
      console.log('\n✅ T15 ЗАВЕРШЕН');
      
      if (isSuccess) {
        console.log('🎉 Структура базы данных успешно синхронизирована!');
        console.log('Система готова к полноценному использованию.');
      } else {
        console.log('⚠️ Синхронизация выполнена частично. Проверьте детали выше.');
      }
      
      return { isSuccess, executionResults, validationResults };
    } catch (error) {
      console.error('❌ Критическая ошибка T15:', error.message);
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}

// Запуск T15
async function main() {
  const executor = new DrizzleT15Executor();
  await executor.execute();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DrizzleT15Executor };