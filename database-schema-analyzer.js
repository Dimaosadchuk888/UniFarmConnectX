/**
 * T14: Database Schema Analysis Tool
 * Анализ структуры базы данных Neon и сравнение с кодом системы
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseSchemaAnalyzer {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    this.dbTables = new Map();
    this.codeModels = new Map();
    this.discrepancies = [];
  }

  /**
   * Получает структуру всех таблиц из базы данных
   */
  async analyzeDatabaseStructure() {
    console.log('🔍 Анализ структуры базы данных...');
    
    try {
      // Получаем список всех таблиц
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;
      
      const tablesResult = await this.pool.query(tablesQuery);
      console.log(`📋 Найдено таблиц в базе: ${tablesResult.rows.length}`);
      
      for (const table of tablesResult.rows) {
        const tableName = table.table_name;
        
        // Получаем структуру каждой таблицы
        const columnsQuery = `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = $1
          ORDER BY ordinal_position;
        `;
        
        const columnsResult = await this.pool.query(columnsQuery, [tableName]);
        
        // Получаем индексы для таблицы
        const indexesQuery = `
          SELECT 
            indexname,
            indexdef
          FROM pg_indexes 
          WHERE tablename = $1 
            AND schemaname = 'public';
        `;
        
        const indexesResult = await this.pool.query(indexesQuery, [tableName]);
        
        this.dbTables.set(tableName, {
          columns: columnsResult.rows,
          indexes: indexesResult.rows
        });
        
        console.log(`  ✅ ${tableName}: ${columnsResult.rows.length} колонок, ${indexesResult.rows.length} индексов`);
      }
      
      return this.dbTables;
    } catch (error) {
      console.error('❌ Ошибка анализа базы данных:', error.message);
      throw error;
    }
  }

  /**
   * Анализирует модели в коде системы
   */
  async analyzeCodeModels() {
    console.log('\n🔍 Анализ моделей в коде...');
    
    // Анализируем schema.ts
    await this.analyzeSchemaFile();
    
    // Анализируем сервисы
    await this.analyzeServicesFiles();
    
    // Анализируем типы
    await this.analyzeTypesFiles();
    
    return this.codeModels;
  }

  /**
   * Анализирует shared/schema.ts
   */
  async analyzeSchemaFile() {
    const schemaPath = path.join(__dirname, 'shared/schema.ts');
    
    try {
      if (fs.existsSync(schemaPath)) {
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        
        // Ищем определения таблиц (Drizzle ORM)
        const tableMatches = schemaContent.match(/export const (\w+) = pgTable\(['"`](\w+)['"`]/g);
        
        if (tableMatches) {
          for (const match of tableMatches) {
            const [, tableName, dbTableName] = match.match(/export const (\w+) = pgTable\(['"`](\w+)['"`]/);
            
            // Извлекаем поля таблицы
            const tableDefStart = schemaContent.indexOf(match);
            const tableDefEnd = schemaContent.indexOf('});', tableDefStart);
            const tableDef = schemaContent.substring(tableDefStart, tableDefEnd);
            
            const fields = this.extractFieldsFromTableDef(tableDef);
            
            this.codeModels.set(dbTableName || tableName, {
              type: 'drizzle_table',
              fields: fields,
              source: 'shared/schema.ts'
            });
            
            console.log(`  📝 ${dbTableName || tableName}: ${fields.length} полей (Drizzle)`);
          }
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Не удалось проанализировать schema.ts: ${error.message}`);
    }
  }

  /**
   * Извлекает поля из определения таблицы Drizzle
   */
  extractFieldsFromTableDef(tableDef) {
    const fields = [];
    const fieldMatches = tableDef.match(/(\w+): (\w+)\([^)]*\)/g);
    
    if (fieldMatches) {
      for (const fieldMatch of fieldMatches) {
        const [, fieldName, fieldType] = fieldMatch.match(/(\w+): (\w+)\(/);
        fields.push({
          name: fieldName,
          type: fieldType,
          source: 'drizzle_definition'
        });
      }
    }
    
    return fields;
  }

  /**
   * Анализирует файлы сервисов
   */
  async analyzeServicesFiles() {
    const modulesDir = path.join(__dirname, 'modules');
    
    if (!fs.existsSync(modulesDir)) {
      console.log('  ⚠️  Папка modules не найдена');
      return;
    }
    
    const modules = fs.readdirSync(modulesDir);
    
    for (const module of modules) {
      const servicePath = path.join(modulesDir, module, 'service.ts');
      
      if (fs.existsSync(servicePath)) {
        try {
          const serviceContent = fs.readFileSync(servicePath, 'utf8');
          
          // Ищем SQL запросы и используемые поля
          const sqlMatches = serviceContent.match(/SELECT [^;]+/gi);
          const insertMatches = serviceContent.match(/INSERT INTO [^;]+/gi);
          const updateMatches = serviceContent.match(/UPDATE [^;]+/gi);
          
          const usedFields = new Set();
          const usedTables = new Set();
          
          // Анализируем SQL запросы
          if (sqlMatches) {
            for (const sql of sqlMatches) {
              const tableMatch = sql.match(/FROM (\w+)/i);
              if (tableMatch) {
                usedTables.add(tableMatch[1]);
              }
              
              const fieldMatches = sql.match(/\b\w+\.\w+\b/g);
              if (fieldMatches) {
                fieldMatches.forEach(field => usedFields.add(field));
              }
            }
          }
          
          if (usedTables.size > 0) {
            this.codeModels.set(`${module}_service`, {
              type: 'service',
              tables: Array.from(usedTables),
              fields: Array.from(usedFields),
              source: `modules/${module}/service.ts`
            });
            
            console.log(`  📝 ${module} service: ${usedTables.size} таблиц, ${usedFields.size} полей`);
          }
        } catch (error) {
          console.log(`  ⚠️  Ошибка анализа ${module}/service.ts: ${error.message}`);
        }
      }
    }
  }

  /**
   * Анализирует файлы типов
   */
  async analyzeTypesFiles() {
    const typesDir = path.join(__dirname, 'types');
    
    if (fs.existsSync(typesDir)) {
      const typeFiles = fs.readdirSync(typesDir).filter(f => f.endsWith('.ts'));
      
      for (const typeFile of typeFiles) {
        try {
          const typeContent = fs.readFileSync(path.join(typesDir, typeFile), 'utf8');
          
          // Ищем интерфейсы и типы
          const interfaceMatches = typeContent.match(/interface (\w+) \{[^}]+\}/g);
          const typeMatches = typeContent.match(/type (\w+) = \{[^}]+\}/g);
          
          if (interfaceMatches || typeMatches) {
            console.log(`  📝 ${typeFile}: найдены определения типов`);
          }
        } catch (error) {
          console.log(`  ⚠️  Ошибка анализа ${typeFile}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Сравнивает структуру базы данных с кодом
   */
  compareStructures() {
    console.log('\n🔍 Сравнение структур...');
    
    // Таблицы в базе, но не в коде
    const dbOnlyTables = new Set([...this.dbTables.keys()]);
    const codeOnlyTables = new Set();
    
    // Находим таблицы, которые есть в коде
    for (const [modelName, model] of this.codeModels) {
      if (model.type === 'drizzle_table') {
        dbOnlyTables.delete(modelName);
      }
      if (model.tables) {
        model.tables.forEach(table => {
          if (!this.dbTables.has(table)) {
            codeOnlyTables.add(table);
          } else {
            dbOnlyTables.delete(table);
          }
        });
      }
    }
    
    // Анализируем каждую таблицу
    for (const [tableName, tableInfo] of this.dbTables) {
      const codeModel = this.codeModels.get(tableName);
      
      if (!codeModel) {
        this.discrepancies.push({
          type: 'table_unused',
          table: tableName,
          message: 'Таблица существует в базе, но не используется в коде',
          severity: 'medium'
        });
        continue;
      }
      
      // Сравниваем поля
      if (codeModel.type === 'drizzle_table') {
        this.compareTableFields(tableName, tableInfo, codeModel);
      }
      
      // Проверяем индексы
      this.checkIndexes(tableName, tableInfo);
    }
    
    // Таблицы только в коде
    for (const table of codeOnlyTables) {
      this.discrepancies.push({
        type: 'table_missing',
        table: table,
        message: 'Таблица используется в коде, но отсутствует в базе',
        severity: 'high'
      });
    }
    
    // Неиспользуемые таблицы в базе
    for (const table of dbOnlyTables) {
      this.discrepancies.push({
        type: 'table_unused',
        table: table,
        message: 'Таблица присутствует в базе, но не используется',
        severity: 'low'
      });
    }
  }

  /**
   * Сравнивает поля таблицы
   */
  compareTableFields(tableName, dbTable, codeModel) {
    const dbFields = new Map(dbTable.columns.map(col => [col.column_name, col]));
    const codeFields = new Map(codeModel.fields.map(field => [field.name, field]));
    
    // Поля в базе, но не в коде
    for (const [fieldName, fieldInfo] of dbFields) {
      if (!codeFields.has(fieldName)) {
        this.discrepancies.push({
          type: 'field_unused',
          table: tableName,
          field: fieldName,
          message: `Поле ${fieldName} существует в базе, но не используется в коде`,
          details: fieldInfo,
          severity: 'low'
        });
      }
    }
    
    // Поля в коде, но не в базе
    for (const [fieldName, fieldInfo] of codeFields) {
      if (!dbFields.has(fieldName)) {
        this.discrepancies.push({
          type: 'field_missing',
          table: tableName,
          field: fieldName,
          message: `Поле ${fieldName} используется в коде, но отсутствует в базе`,
          details: fieldInfo,
          severity: 'high'
        });
      }
    }
    
    // Сравниваем типы существующих полей
    for (const [fieldName, codeField] of codeFields) {
      const dbField = dbFields.get(fieldName);
      if (dbField) {
        const typeMatch = this.compareFieldTypes(dbField.data_type, codeField.type);
        if (!typeMatch) {
          this.discrepancies.push({
            type: 'type_mismatch',
            table: tableName,
            field: fieldName,
            message: `Несоответствие типов: база(${dbField.data_type}) vs код(${codeField.type})`,
            dbType: dbField.data_type,
            codeType: codeField.type,
            severity: 'medium'
          });
        }
      }
    }
  }

  /**
   * Сравнивает типы полей
   */
  compareFieldTypes(dbType, codeType) {
    const typeMapping = {
      'text': ['text', 'varchar', 'string'],
      'varchar': ['text', 'varchar', 'string'],
      'integer': ['integer', 'int', 'number'],
      'bigint': ['bigint', 'bigserial', 'number'],
      'boolean': ['boolean', 'bool'],
      'timestamp': ['timestamp', 'date', 'datetime'],
      'uuid': ['uuid', 'text'],
      'decimal': ['decimal', 'numeric', 'real', 'number'],
      'jsonb': ['json', 'jsonb']
    };
    
    for (const [standard, variants] of Object.entries(typeMapping)) {
      if (variants.includes(dbType.toLowerCase()) && variants.includes(codeType.toLowerCase())) {
        return true;
      }
    }
    
    return dbType.toLowerCase() === codeType.toLowerCase();
  }

  /**
   * Проверяет индексы
   */
  checkIndexes(tableName, tableInfo) {
    const criticalFields = ['telegram_id', 'user_id', 'ref_code', 'mission_id', 'type', 'id'];
    const existingIndexes = tableInfo.indexes.map(idx => idx.indexname.toLowerCase());
    
    for (const column of tableInfo.columns) {
      const fieldName = column.column_name;
      
      if (criticalFields.includes(fieldName)) {
        const hasIndex = existingIndexes.some(idx => 
          idx.includes(fieldName.toLowerCase()) || 
          idx.includes(tableName.toLowerCase() + '_' + fieldName.toLowerCase())
        );
        
        if (!hasIndex && fieldName !== 'id') {
          this.discrepancies.push({
            type: 'missing_index',
            table: tableName,
            field: fieldName,
            message: `Критическое поле ${fieldName} не имеет индекса`,
            severity: 'medium'
          });
        }
      }
    }
  }

  /**
   * Генерирует отчет
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 ОТЧЕТ T14: АНАЛИЗ СТРУКТУРЫ БАЗЫ ДАННЫХ UniFarm');
    console.log('='.repeat(80));

    console.log(`\n📈 ОБЩАЯ СТАТИСТИКА:`);
    console.log(`  Таблиц в базе данных: ${this.dbTables.size}`);
    console.log(`  Моделей в коде: ${this.codeModels.size}`);
    console.log(`  Обнаружено расхождений: ${this.discrepancies.length}`);

    // Группируем расхождения по типам
    const groupedDiscrepancies = this.discrepancies.reduce((acc, disc) => {
      if (!acc[disc.type]) acc[disc.type] = [];
      acc[disc.type].push(disc);
      return acc;
    }, {});

    console.log(`\n🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ПО ТИПАМ:`);

    // Неиспользуемые таблицы
    if (groupedDiscrepancies.table_unused) {
      console.log(`\n❌ НЕИСПОЛЬЗУЕМЫЕ ТАБЛИЦЫ (${groupedDiscrepancies.table_unused.length}):`);
      groupedDiscrepancies.table_unused.forEach(disc => {
        console.log(`  • ${disc.table} - ${disc.message}`);
      });
    }

    // Отсутствующие таблицы
    if (groupedDiscrepancies.table_missing) {
      console.log(`\n🚨 ОТСУТСТВУЮЩИЕ ТАБЛИЦЫ (${groupedDiscrepancies.table_missing.length}):`);
      groupedDiscrepancies.table_missing.forEach(disc => {
        console.log(`  • ${disc.table} - ${disc.message}`);
      });
    }

    // Неиспользуемые поля
    if (groupedDiscrepancies.field_unused) {
      console.log(`\n⚠️  НЕИСПОЛЬЗУЕМЫЕ ПОЛЯ (${groupedDiscrepancies.field_unused.length}):`);
      const byTable = groupedDiscrepancies.field_unused.reduce((acc, disc) => {
        if (!acc[disc.table]) acc[disc.table] = [];
        acc[disc.table].push(disc.field);
        return acc;
      }, {});
      
      for (const [table, fields] of Object.entries(byTable)) {
        console.log(`  • ${table}: ${fields.join(', ')}`);
      }
    }

    // Отсутствующие поля
    if (groupedDiscrepancies.field_missing) {
      console.log(`\n🚨 ОТСУТСТВУЮЩИЕ ПОЛЯ (${groupedDiscrepancies.field_missing.length}):`);
      const byTable = groupedDiscrepancies.field_missing.reduce((acc, disc) => {
        if (!acc[disc.table]) acc[disc.table] = [];
        acc[disc.table].push(disc.field);
        return acc;
      }, {});
      
      for (const [table, fields] of Object.entries(byTable)) {
        console.log(`  • ${table}: ${fields.join(', ')}`);
      }
    }

    // Несоответствие типов
    if (groupedDiscrepancies.type_mismatch) {
      console.log(`\n⚡ НЕСООТВЕТСТВИЕ ТИПОВ (${groupedDiscrepancies.type_mismatch.length}):`);
      groupedDiscrepancies.type_mismatch.forEach(disc => {
        console.log(`  • ${disc.table}.${disc.field}: ${disc.dbType} (база) vs ${disc.codeType} (код)`);
      });
    }

    // Отсутствующие индексы
    if (groupedDiscrepancies.missing_index) {
      console.log(`\n📊 ОТСУТСТВУЮЩИЕ ИНДЕКСЫ (${groupedDiscrepancies.missing_index.length}):`);
      const byTable = groupedDiscrepancies.missing_index.reduce((acc, disc) => {
        if (!acc[disc.table]) acc[disc.table] = [];
        acc[disc.table].push(disc.field);
        return acc;
      }, {});
      
      for (const [table, fields] of Object.entries(byTable)) {
        console.log(`  • ${table}: ${fields.join(', ')}`);
      }
    }

    console.log(`\n📋 СТРУКТУРА ТАБЛИЦ В БАЗЕ:`);
    for (const [tableName, tableInfo] of this.dbTables) {
      console.log(`\n  📁 ${tableName.toUpperCase()}`);
      console.log(`     Колонки: ${tableInfo.columns.length}`);
      tableInfo.columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(not null)';
        console.log(`       • ${col.column_name}: ${col.data_type} ${nullable}`);
      });
      
      if (tableInfo.indexes.length > 0) {
        console.log(`     Индексы: ${tableInfo.indexes.length}`);
        tableInfo.indexes.forEach(idx => {
          console.log(`       • ${idx.indexname}`);
        });
      }
    }

    return {
      totalTables: this.dbTables.size,
      totalModels: this.codeModels.size,
      totalDiscrepancies: this.discrepancies.length,
      discrepancies: this.discrepancies,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Генерирует рекомендации для разработчика
   */
  generateRecommendations() {
    console.log(`\n💡 РЕКОМЕНДАЦИИ ДЛЯ РАЗРАБОТЧИКА:`);
    
    const recommendations = [];
    
    // Критические проблемы
    const critical = this.discrepancies.filter(d => d.severity === 'high');
    if (critical.length > 0) {
      console.log(`\n🚨 КРИТИЧНО (требует немедленного исправления):`);
      critical.forEach(disc => {
        console.log(`  • ${disc.message}`);
        if (disc.type === 'table_missing') {
          recommendations.push(`CREATE TABLE ${disc.table}`);
        }
        if (disc.type === 'field_missing') {
          recommendations.push(`ALTER TABLE ${disc.table} ADD COLUMN ${disc.field}`);
        }
      });
    }
    
    // Средние проблемы
    const medium = this.discrepancies.filter(d => d.severity === 'medium');
    if (medium.length > 0) {
      console.log(`\n⚠️  СРЕДНИЙ ПРИОРИТЕТ:`);
      medium.forEach(disc => {
        console.log(`  • ${disc.message}`);
        if (disc.type === 'missing_index') {
          recommendations.push(`CREATE INDEX ON ${disc.table}(${disc.field})`);
        }
        if (disc.type === 'type_mismatch') {
          recommendations.push(`ALTER TABLE ${disc.table} ALTER COLUMN ${disc.field} TYPE ${disc.codeType}`);
        }
      });
    }
    
    // Низкий приоритет
    const low = this.discrepancies.filter(d => d.severity === 'low');
    if (low.length > 0) {
      console.log(`\n📝 НИЗКИЙ ПРИОРИТЕТ (можно отложить):`);
      low.forEach(disc => {
        console.log(`  • ${disc.message}`);
        if (disc.type === 'field_unused') {
          recommendations.push(`-- Consider removing unused column: ${disc.table}.${disc.field}`);
        }
      });
    }
    
    console.log(`\n🎯 ИТОГОВЫЕ РЕКОМЕНДАЦИИ:`);
    console.log(`  1. Синхронизировать ${critical.length} критических расхождений`);
    console.log(`  2. Добавить ${this.discrepancies.filter(d => d.type === 'missing_index').length} индексов для производительности`);
    console.log(`  3. Очистить ${this.discrepancies.filter(d => d.type === 'field_unused').length} неиспользуемых полей`);
    
    return recommendations;
  }

  /**
   * Основной метод запуска анализа
   */
  async runAnalysis() {
    try {
      console.log('🚀 ЗАПУСК АНАЛИЗА СТРУКТУРЫ БАЗЫ ДАННЫХ T14');
      
      await this.analyzeDatabaseStructure();
      await this.analyzeCodeModels();
      this.compareStructures();
      
      const report = this.generateReport();
      
      // Сохраняем отчет в файл
      const reportData = {
        timestamp: new Date().toISOString(),
        summary: {
          totalTables: report.totalTables,
          totalModels: report.totalModels,
          totalDiscrepancies: report.totalDiscrepancies
        },
        database_tables: Object.fromEntries(this.dbTables),
        code_models: Object.fromEntries(this.codeModels),
        discrepancies: this.discrepancies,
        recommendations: report.recommendations
      };
      
      fs.writeFileSync('T14_DATABASE_ANALYSIS_REPORT.json', JSON.stringify(reportData, null, 2));
      
      console.log('\n✅ Анализ завершен! Отчет сохранен в T14_DATABASE_ANALYSIS_REPORT.json');
      
      return report;
    } catch (error) {
      console.error('❌ Ошибка при анализе:', error.message);
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}

// Запуск анализа
async function main() {
  const analyzer = new DatabaseSchemaAnalyzer();
  await analyzer.runAnalysis();
}

// ES module entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DatabaseSchemaAnalyzer };