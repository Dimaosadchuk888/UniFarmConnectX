/**
 * T15: Синхронизация структуры базы данных
 * Исправляет расхождения, найденные в анализе T14
 */

import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseSynchronizer {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.operations = [];
    this.results = [];
    this.t14Report = null;
  }

  /**
   * Загружает отчет T14 для получения рекомендаций
   */
  loadT14Report() {
    console.log('📋 Загрузка отчета T14...');
    
    try {
      const reportPath = path.join(__dirname, 'T14_CORRECTED_ANALYSIS_REPORT.json');
      if (fs.existsSync(reportPath)) {
        this.t14Report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        console.log(`  ✅ Загружен отчет T14: ${this.t14Report.recommendations.length} рекомендаций`);
        return true;
      } else {
        console.log('  ⚠️  Отчет T14 не найден, создаю операции на основе схемы');
        return false;
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки отчета T14:', error.message);
      return false;
    }
  }

  /**
   * Планирует операции синхронизации
   */
  planSynchronizationOperations() {
    console.log('\n🔧 Планирование операций синхронизации...');
    
    if (this.t14Report) {
      this.planFromT14Report();
    } else {
      this.planFromSchemaAnalysis();
    }
    
    console.log(`📝 Запланировано операций: ${this.operations.length}`);
  }

  /**
   * Планирует операции на основе отчета T14
   */
  planFromT14Report() {
    const criticalRecs = this.t14Report.recommendations.filter(r => r.priority === 'critical');
    const mediumRecs = this.t14Report.recommendations.filter(r => r.priority === 'medium');
    
    // Критические операции
    for (const rec of criticalRecs) {
      if (rec.action === 'ADD_COLUMN') {
        this.operations.push({
          type: 'ADD_COLUMN',
          priority: 'critical',
          table: rec.table,
          field: rec.field,
          sql: this.generateAddColumnSQL(rec.table, rec.field),
          description: rec.description
        });
      }
    }
    
    // Операции среднего приоритета
    for (const rec of mediumRecs) {
      if (rec.action === 'CREATE_INDEX') {
        this.operations.push({
          type: 'CREATE_INDEX',
          priority: 'medium',
          table: rec.table,
          field: rec.field,
          sql: rec.sql,
          description: rec.description
        });
      }
    }
  }

  /**
   * Генерирует SQL для добавления колонки
   */
  generateAddColumnSQL(tableName, fieldName) {
    const fieldTypes = {
      'ref_code': 'TEXT UNIQUE',
      'parent_ref_code': 'TEXT',
      'source_user_id': 'INTEGER',
      'user_id': 'INTEGER',
      'telegram_id': 'BIGINT UNIQUE'
    };
    
    const fieldType = fieldTypes[fieldName] || 'TEXT';
    return `ALTER TABLE ${tableName} ADD COLUMN ${fieldName} ${fieldType};`;
  }

  /**
   * Планирует операции на основе анализа схемы
   */
  planFromSchemaAnalysis() {
    // Критические недостающие поля
    const criticalFields = [
      { table: 'users', field: 'ref_code', type: 'TEXT UNIQUE' },
      { table: 'users', field: 'parent_ref_code', type: 'TEXT' },
      { table: 'transactions', field: 'source_user_id', type: 'INTEGER' },
      { table: 'airdrop_participants', field: 'user_id', type: 'INTEGER' }
    ];

    for (const field of criticalFields) {
      this.operations.push({
        type: 'ADD_COLUMN',
        priority: 'critical',
        table: field.table,
        field: field.field,
        sql: `ALTER TABLE ${field.table} ADD COLUMN ${field.field} ${field.type};`,
        description: `Добавление критического поля ${field.field} в таблицу ${field.table}`
      });
    }

    // Критические индексы
    const criticalIndexes = [
      { table: 'users', field: 'telegram_id' },
      { table: 'users', field: 'ref_code' },
      { table: 'transactions', field: 'user_id' },
      { table: 'referrals', field: 'user_id' },
      { table: 'missions', field: 'type' }
    ];

    for (const index of criticalIndexes) {
      this.operations.push({
        type: 'CREATE_INDEX',
        priority: 'medium',
        table: index.table,
        field: index.field,
        sql: `CREATE INDEX IF NOT EXISTS idx_${index.table}_${index.field} ON ${index.table}(${index.field});`,
        description: `Создание индекса для ${index.table}.${index.field}`
      });
    }
  }

  /**
   * Проверяет текущую структуру базы данных
   */
  async checkCurrentStructure() {
    console.log('\n🔍 Проверка текущей структуры базы данных...');
    
    try {
      // Получаем список таблиц
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;
      
      const tablesResult = await this.pool.query(tablesQuery);
      const existingTables = tablesResult.rows.map(row => row.table_name);
      
      console.log(`📋 Существующие таблицы (${existingTables.length}): ${existingTables.join(', ')}`);
      
      // Проверяем каждую таблицу из операций
      for (const operation of this.operations) {
        if (operation.type === 'ADD_COLUMN') {
          const columnExists = await this.checkColumnExists(operation.table, operation.field);
          operation.skipReason = columnExists ? 'Колонка уже существует' : null;
        }
        
        if (operation.type === 'CREATE_INDEX') {
          const indexExists = await this.checkIndexExists(operation.table, operation.field);
          operation.skipReason = indexExists ? 'Индекс уже существует' : null;
        }
      }
      
      const operationsToExecute = this.operations.filter(op => !op.skipReason);
      console.log(`✅ Операций к выполнению: ${operationsToExecute.length} из ${this.operations.length}`);
      
      return existingTables;
    } catch (error) {
      console.error('❌ Ошибка проверки структуры:', error.message);
      throw error;
    }
  }

  /**
   * Проверяет существование колонки
   */
  async checkColumnExists(tableName, columnName) {
    try {
      const query = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = $1 
          AND column_name = $2;
      `;
      
      const result = await this.pool.query(query, [tableName, columnName]);
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Проверяет существование индекса
   */
  async checkIndexExists(tableName, columnName) {
    try {
      const query = `
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = $1 
          AND schemaname = 'public'
          AND indexdef ILIKE $2;
      `;
      
      const pattern = `%${columnName}%`;
      const result = await this.pool.query(query, [tableName, pattern]);
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Выполняет синхронизацию базы данных
   */
  async executeSynchronization() {
    console.log('\n🚀 Выполнение синхронизации базы данных...');
    
    const operationsToExecute = this.operations.filter(op => !op.skipReason);
    
    if (operationsToExecute.length === 0) {
      console.log('✅ Все операции уже выполнены, синхронизация не требуется');
      return;
    }
    
    // Сортируем операции по приоритету
    operationsToExecute.sort((a, b) => {
      const priorityOrder = { critical: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    for (const operation of operationsToExecute) {
      await this.executeOperation(operation);
    }
    
    console.log(`✅ Синхронизация завершена: ${this.results.filter(r => r.success).length} успешных операций`);
  }

  /**
   * Выполняет отдельную операцию
   */
  async executeOperation(operation) {
    const priority = operation.priority === 'critical' ? '🚨' : operation.priority === 'medium' ? '⚠️' : '📝';
    
    try {
      console.log(`${priority} Выполнение: ${operation.description}`);
      console.log(`   SQL: ${operation.sql}`);
      
      const startTime = Date.now();
      await this.pool.query(operation.sql);
      const duration = Date.now() - startTime;
      
      this.results.push({
        operation: operation,
        success: true,
        duration: duration,
        error: null
      });
      
      console.log(`   ✅ Выполнено за ${duration}ms`);
    } catch (error) {
      this.results.push({
        operation: operation,
        success: false,
        duration: null,
        error: error.message
      });
      
      console.log(`   ❌ Ошибка: ${error.message}`);
      
      // Для критических операций останавливаем выполнение
      if (operation.priority === 'critical') {
        console.log('🛑 Остановка выполнения из-за критической ошибки');
        throw error;
      }
    }
  }

  /**
   * Проверяет результаты синхронизации
   */
  async validateSynchronization() {
    console.log('\n🔍 Проверка результатов синхронизации...');
    
    const validationResults = [];
    
    // Проверяем добавленные колонки
    const addColumnOps = this.results.filter(r => r.success && r.operation.type === 'ADD_COLUMN');
    
    for (const result of addColumnOps) {
      const operation = result.operation;
      const exists = await this.checkColumnExists(operation.table, operation.field);
      
      validationResults.push({
        type: 'column',
        table: operation.table,
        field: operation.field,
        exists: exists,
        message: exists ? `Колонка ${operation.table}.${operation.field} успешно создана` : `Колонка ${operation.table}.${operation.field} не найдена`
      });
    }
    
    // Проверяем созданные индексы
    const createIndexOps = this.results.filter(r => r.success && r.operation.type === 'CREATE_INDEX');
    
    for (const result of createIndexOps) {
      const operation = result.operation;
      const exists = await this.checkIndexExists(operation.table, operation.field);
      
      validationResults.push({
        type: 'index',
        table: operation.table,
        field: operation.field,
        exists: exists,
        message: exists ? `Индекс для ${operation.table}.${operation.field} успешно создан` : `Индекс для ${operation.table}.${operation.field} не найден`
      });
    }
    
    const successful = validationResults.filter(v => v.exists).length;
    const total = validationResults.length;
    
    console.log(`📊 Результат проверки: ${successful}/${total} операций подтверждены`);
    
    validationResults.forEach(validation => {
      const status = validation.exists ? '✅' : '❌';
      console.log(`  ${status} ${validation.message}`);
    });
    
    return validationResults;
  }

  /**
   * Генерирует отчет T15
   */
  generateReport(validationResults) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 ОТЧЕТ T15: СИНХРОНИЗАЦИЯ СТРУКТУРЫ БАЗЫ ДАННЫХ');
    console.log('='.repeat(80));

    const stats = {
      totalOperations: this.operations.length,
      executedOperations: this.results.filter(r => r.success).length,
      failedOperations: this.results.filter(r => !r.success).length,
      skippedOperations: this.operations.filter(op => op.skipReason).length,
      validatedChanges: validationResults.filter(v => v.exists).length,
      totalValidations: validationResults.length
    };

    console.log(`\n📈 СТАТИСТИКА СИНХРОНИЗАЦИИ:`);
    console.log(`  Запланировано операций: ${stats.totalOperations}`);
    console.log(`  Выполнено успешно: ${stats.executedOperations}`);
    console.log(`  Провалено: ${stats.failedOperations}`);
    console.log(`  Пропущено (уже существует): ${stats.skippedOperations}`);
    console.log(`  Подтверждено при проверке: ${stats.validatedChanges}/${stats.totalValidations}`);

    console.log(`\n🔧 ВЫПОЛНЕННЫЕ ОПЕРАЦИИ:`);
    
    const successfulOps = this.results.filter(r => r.success);
    if (successfulOps.length > 0) {
      console.log(`\n✅ УСПЕШНЫЕ ОПЕРАЦИИ (${successfulOps.length}):`);
      successfulOps.forEach((result, index) => {
        const op = result.operation;
        console.log(`  ${index + 1}. ${op.type}: ${op.table}.${op.field} (${result.duration}ms)`);
      });
    }
    
    const failedOps = this.results.filter(r => !r.success);
    if (failedOps.length > 0) {
      console.log(`\n❌ НЕУДАЧНЫЕ ОПЕРАЦИИ (${failedOps.length}):`);
      failedOps.forEach((result, index) => {
        const op = result.operation;
        console.log(`  ${index + 1}. ${op.type}: ${op.table}.${op.field} - ${result.error}`);
      });
    }
    
    const skippedOps = this.operations.filter(op => op.skipReason);
    if (skippedOps.length > 0) {
      console.log(`\n⏭️  ПРОПУЩЕННЫЕ ОПЕРАЦИИ (${skippedOps.length}):`);
      skippedOps.forEach((op, index) => {
        console.log(`  ${index + 1}. ${op.type}: ${op.table}.${op.field} - ${op.skipReason}`);
      });
    }

    console.log(`\n📋 ПРОВЕРКА ЦЕЛОСТНОСТИ:`);
    if (validationResults.length > 0) {
      validationResults.forEach(validation => {
        const status = validation.exists ? '✅' : '❌';
        console.log(`  ${status} ${validation.type}: ${validation.table}.${validation.field}`);
      });
    }

    const isSuccess = stats.failedOperations === 0 && stats.validatedChanges === stats.totalValidations;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`СТАТУС T15: ${isSuccess ? '✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА УСПЕШНО' : '⚠️ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА С ПРОБЛЕМАМИ'}`);
    console.log(`${'='.repeat(80)}`);

    // Сохраняем отчет
    this.saveReport(stats, validationResults);

    return { stats, isSuccess };
  }

  /**
   * Сохраняет отчет T15
   */
  saveReport(stats, validationResults) {
    const report = {
      timestamp: new Date().toISOString(),
      task: 'T15_DATABASE_SYNCHRONIZATION',
      statistics: stats,
      operations_planned: this.operations,
      operations_executed: this.results,
      validation_results: validationResults,
      summary: {
        success_rate: ((stats.executedOperations / (stats.totalOperations - stats.skippedOperations)) * 100).toFixed(1),
        completion_status: stats.failedOperations === 0 ? 'COMPLETED' : 'PARTIAL',
        database_integrity: stats.validatedChanges === stats.totalValidations ? 'VERIFIED' : 'ISSUES_FOUND'
      }
    };

    fs.writeFileSync('T15_DATABASE_SYNCHRONIZATION_REPORT.json', JSON.stringify(report, null, 2));
    console.log(`\n✅ Отчет T15 сохранен: T15_DATABASE_SYNCHRONIZATION_REPORT.json`);
  }

  /**
   * Основной метод выполнения T15
   */
  async runSynchronization() {
    try {
      console.log('🚀 ЗАПУСК T15: СИНХРОНИЗАЦИЯ СТРУКТУРЫ БАЗЫ ДАННЫХ');
      
      this.loadT14Report();
      this.planSynchronizationOperations();
      
      const existingTables = await this.checkCurrentStructure();
      await this.executeSynchronization();
      
      const validationResults = await this.validateSynchronization();
      const { stats, isSuccess } = this.generateReport(validationResults);
      
      console.log('\n✅ T15 ЗАВЕРШЕН');
      console.log(`📊 Результат: ${stats.executedOperations} операций выполнено, ${stats.validatedChanges} изменений подтверждено`);
      
      return { isSuccess, stats, validationResults };
    } catch (error) {
      console.error('❌ Критическая ошибка T15:', error.message);
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}

// Запуск синхронизации
async function main() {
  const synchronizer = new DatabaseSynchronizer();
  await synchronizer.runSynchronization();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DatabaseSynchronizer };