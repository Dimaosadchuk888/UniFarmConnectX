/**
 * T14: Анализ структуры базы данных через Drizzle
 * Использует существующее подключение к базе Neon
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseStructureAnalyzer {
  constructor() {
    // Используем Neon клиент как в основном проекте
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(this.pool);
    this.analysisResults = {
      tables: new Map(),
      codeModels: new Map(),
      discrepancies: [],
      recommendations: []
    };
  }

  /**
   * Анализирует структуру базы данных через SQL запросы
   */
  async analyzeDatabaseStructure() {
    console.log('🔍 Анализ структуры базы данных через Neon...');
    
    try {
      // Получаем список таблиц
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;
      
      const tablesResult = await this.pool.query(tablesQuery);
      console.log(`📋 Найдено таблиц: ${tablesResult.rows.length}`);
      
      for (const table of tablesResult.rows) {
        const tableName = table.table_name;
        await this.analyzeTable(tableName);
      }
      
      return this.analysisResults.tables;
    } catch (error) {
      console.error('❌ Ошибка подключения к базе:', error.message);
      throw error;
    }
  }

  /**
   * Анализирует конкретную таблицу
   */
  async analyzeTable(tableName) {
    try {
      // Получаем структуру колонок
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `;
      
      const columnsResult = await this.pool.query(columnsQuery, [tableName]);
      
      // Получаем индексы
      const indexesQuery = `
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = $1 AND schemaname = 'public';
      `;
      
      const indexesResult = await this.pool.query(indexesQuery, [tableName]);
      
      // Получаем внешние ключи
      const foreignKeysQuery = `
        SELECT 
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = $1;
      `;
      
      const foreignKeysResult = await this.pool.query(foreignKeysQuery, [tableName]);
      
      this.analysisResults.tables.set(tableName, {
        columns: columnsResult.rows,
        indexes: indexesResult.rows,
        foreignKeys: foreignKeysResult.rows,
        rowCount: await this.getTableRowCount(tableName)
      });
      
      console.log(`  ✅ ${tableName}: ${columnsResult.rows.length} колонок, ${indexesResult.rows.length} индексов`);
    } catch (error) {
      console.error(`❌ Ошибка анализа таблицы ${tableName}:`, error.message);
    }
  }

  /**
   * Получает количество записей в таблице
   */
  async getTableRowCount(tableName) {
    try {
      const countQuery = `SELECT COUNT(*) as count FROM "${tableName}";`;
      const result = await this.pool.query(countQuery);
      return parseInt(result.rows[0].count);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Анализирует схему в коде (shared/schema.ts)
   */
  async analyzeCodeSchema() {
    console.log('🔍 Анализ схемы в коде...');
    
    const schemaPath = path.join(__dirname, 'shared/schema.ts');
    
    try {
      if (fs.existsSync(schemaPath)) {
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        
        // Парсим Drizzle таблицы
        const tableMatches = schemaContent.match(/export const (\w+) = pgTable\(['"`](\w+)['"`][^}]+\}\)/gs);
        
        if (tableMatches) {
          for (const match of tableMatches) {
            const lines = match.split('\n');
            const tableLine = lines[0];
            const tableNameMatch = tableLine.match(/export const (\w+) = pgTable\(['"`](\w+)['"`]/);
            
            if (tableNameMatch) {
              const [, varName, tableName] = tableNameMatch;
              const fields = this.parseTableFields(match);
              
              this.analysisResults.codeModels.set(tableName, {
                variable: varName,
                fields: fields,
                source: 'shared/schema.ts'
              });
              
              console.log(`  📝 ${tableName} (${varName}): ${fields.length} полей`);
            }
          }
        }
      } else {
        console.log('  ⚠️  shared/schema.ts не найден');
      }
    } catch (error) {
      console.error('❌ Ошибка анализа схемы:', error.message);
    }
  }

  /**
   * Парсит поля таблицы из Drizzle определения
   */
  parseTableFields(tableDefinition) {
    const fields = [];
    const lines = tableDefinition.split('\n');
    
    for (const line of lines) {
      const fieldMatch = line.trim().match(/(\w+):\s*(\w+)\(([^)]*)\)/);
      if (fieldMatch) {
        const [, fieldName, fieldType, params] = fieldMatch;
        
        fields.push({
          name: fieldName,
          type: fieldType,
          params: params,
          nullable: !line.includes('.notNull()'),
          primaryKey: line.includes('.primaryKey()'),
          unique: line.includes('.unique()'),
          default: line.includes('.default(') ? this.extractDefault(line) : null
        });
      }
    }
    
    return fields;
  }

  /**
   * Извлекает значение по умолчанию
   */
  extractDefault(line) {
    const defaultMatch = line.match(/\.default\(([^)]+)\)/);
    return defaultMatch ? defaultMatch[1] : null;
  }

  /**
   * Сравнивает структуру базы данных с кодом
   */
  compareStructures() {
    console.log('\n🔍 Сравнение структур базы и кода...');
    
    const dbTables = new Set(this.analysisResults.tables.keys());
    const codeTables = new Set(this.analysisResults.codeModels.keys());
    
    // Таблицы только в базе
    const dbOnlyTables = [...dbTables].filter(table => !codeTables.has(table));
    
    // Таблицы только в коде
    const codeOnlyTables = [...codeTables].filter(table => !dbTables.has(table));
    
    // Общие таблицы
    const commonTables = [...dbTables].filter(table => codeTables.has(table));
    
    // Анализируем расхождения
    this.analyzeTableDiscrepancies(dbOnlyTables, codeOnlyTables, commonTables);
    
    console.log(`  📊 Общих таблиц: ${commonTables.length}`);
    console.log(`  📋 Только в базе: ${dbOnlyTables.length}`);
    console.log(`  📝 Только в коде: ${codeOnlyTables.length}`);
  }

  /**
   * Анализирует расхождения в таблицах
   */
  analyzeTableDiscrepancies(dbOnlyTables, codeOnlyTables, commonTables) {
    // Таблицы только в базе
    for (const table of dbOnlyTables) {
      const tableInfo = this.analysisResults.tables.get(table);
      this.analysisResults.discrepancies.push({
        type: 'table_unused',
        table: table,
        severity: tableInfo.rowCount > 0 ? 'medium' : 'low',
        message: `Таблица ${table} существует в базе, но не используется в коде`,
        details: { rowCount: tableInfo.rowCount }
      });
    }
    
    // Таблицы только в коде
    for (const table of codeOnlyTables) {
      this.analysisResults.discrepancies.push({
        type: 'table_missing',
        table: table,
        severity: 'high',
        message: `Таблица ${table} определена в коде, но отсутствует в базе`
      });
    }
    
    // Сравниваем поля в общих таблицах
    for (const table of commonTables) {
      this.compareTableFields(table);
    }
  }

  /**
   * Сравнивает поля в таблице
   */
  compareTableFields(tableName) {
    const dbTable = this.analysisResults.tables.get(tableName);
    const codeTable = this.analysisResults.codeModels.get(tableName);
    
    const dbFields = new Map(dbTable.columns.map(col => [col.column_name, col]));
    const codeFields = new Map(codeTable.fields.map(field => [field.name, field]));
    
    // Поля только в базе
    for (const [fieldName, fieldInfo] of dbFields) {
      if (!codeFields.has(fieldName)) {
        this.analysisResults.discrepancies.push({
          type: 'field_unused',
          table: tableName,
          field: fieldName,
          severity: 'low',
          message: `Поле ${tableName}.${fieldName} существует в базе, но не используется в коде`,
          details: { dbType: fieldInfo.data_type, nullable: fieldInfo.is_nullable }
        });
      }
    }
    
    // Поля только в коде
    for (const [fieldName, fieldInfo] of codeFields) {
      if (!dbFields.has(fieldName)) {
        this.analysisResults.discrepancies.push({
          type: 'field_missing',
          table: tableName,
          field: fieldName,
          severity: 'high',
          message: `Поле ${tableName}.${fieldName} определено в коде, но отсутствует в базе`,
          details: { codeType: fieldInfo.type, nullable: fieldInfo.nullable }
        });
      }
    }
    
    // Сравниваем типы существующих полей
    for (const [fieldName, codeField] of codeFields) {
      const dbField = dbFields.get(fieldName);
      if (dbField) {
        this.compareFieldTypes(tableName, fieldName, dbField, codeField);
      }
    }
  }

  /**
   * Сравнивает типы полей
   */
  compareFieldTypes(tableName, fieldName, dbField, codeField) {
    const dbType = dbField.data_type.toLowerCase();
    const codeType = codeField.type.toLowerCase();
    
    // Мапинг типов Drizzle -> PostgreSQL
    const typeMapping = {
      'text': ['text', 'varchar', 'character varying'],
      'varchar': ['varchar', 'character varying', 'text'],
      'integer': ['integer', 'int4'],
      'bigint': ['bigint', 'int8'],
      'serial': ['integer', 'int4'],
      'bigserial': ['bigint', 'int8'],
      'boolean': ['boolean', 'bool'],
      'timestamp': ['timestamp without time zone', 'timestamp with time zone'],
      'uuid': ['uuid'],
      'decimal': ['numeric', 'decimal'],
      'real': ['real', 'float4'],
      'jsonb': ['jsonb'],
      'json': ['json']
    };
    
    let isCompatible = false;
    for (const [drizzleType, pgTypes] of Object.entries(typeMapping)) {
      if (codeType === drizzleType && pgTypes.includes(dbType)) {
        isCompatible = true;
        break;
      }
    }
    
    if (!isCompatible && dbType !== codeType) {
      this.analysisResults.discrepancies.push({
        type: 'type_mismatch',
        table: tableName,
        field: fieldName,
        severity: 'medium',
        message: `Несоответствие типов в ${tableName}.${fieldName}`,
        details: { dbType: dbType, codeType: codeType }
      });
    }
    
    // Проверяем nullable
    const dbNullable = dbField.is_nullable === 'YES';
    const codeNullable = codeField.nullable;
    
    if (dbNullable !== codeNullable) {
      this.analysisResults.discrepancies.push({
        type: 'nullable_mismatch',
        table: tableName,
        field: fieldName,
        severity: 'low',
        message: `Несоответствие nullable в ${tableName}.${fieldName}`,
        details: { dbNullable: dbNullable, codeNullable: codeNullable }
      });
    }
  }

  /**
   * Проверяет индексы на критических полях
   */
  checkCriticalIndexes() {
    console.log('\n🔍 Проверка критических индексов...');
    
    const criticalFields = ['telegram_id', 'user_id', 'ref_code', 'mission_id', 'type', 'parent_ref_code'];
    
    for (const [tableName, tableInfo] of this.analysisResults.tables) {
      const existingIndexes = tableInfo.indexes.map(idx => idx.indexname.toLowerCase());
      
      for (const column of tableInfo.columns) {
        const fieldName = column.column_name;
        
        if (criticalFields.includes(fieldName)) {
          const hasIndex = existingIndexes.some(idx => 
            idx.includes(fieldName) || 
            idx.includes(`${tableName}_${fieldName}`)
          );
          
          if (!hasIndex && fieldName !== 'id') {
            this.analysisResults.discrepancies.push({
              type: 'missing_index',
              table: tableName,
              field: fieldName,
              severity: 'medium',
              message: `Критическое поле ${tableName}.${fieldName} не имеет индекса`
            });
          }
        }
      }
    }
  }

  /**
   * Генерирует отчет T14
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 ОТЧЕТ T14: АНАЛИЗ СТРУКТУРЫ БАЗЫ ДАННЫХ UniFarm');
    console.log('='.repeat(80));

    const stats = {
      tablesInDb: this.analysisResults.tables.size,
      tablesInCode: this.analysisResults.codeModels.size,
      totalDiscrepancies: this.analysisResults.discrepancies.length
    };

    console.log(`\n📈 ОБЩАЯ СТАТИСТИКА:`);
    console.log(`  Таблиц в базе данных: ${stats.tablesInDb}`);
    console.log(`  Таблиц в коде: ${stats.tablesInCode}`);
    console.log(`  Найдено расхождений: ${stats.totalDiscrepancies}`);

    // Группируем расхождения
    const grouped = this.groupDiscrepancies();
    
    this.printDiscrepanciesByType(grouped);
    this.printTableStructures();
    this.generateRecommendations();

    // Сохраняем детальный отчет
    this.saveDetailedReport(stats);

    return stats;
  }

  /**
   * Группирует расхождения по типам
   */
  groupDiscrepancies() {
    return this.analysisResults.discrepancies.reduce((acc, disc) => {
      if (!acc[disc.type]) acc[disc.type] = [];
      acc[disc.type].push(disc);
      return acc;
    }, {});
  }

  /**
   * Выводит расхождения по типам
   */
  printDiscrepanciesByType(grouped) {
    console.log(`\n🔍 РАСХОЖДЕНИЯ ПО ТИПАМ:`);

    if (grouped.table_missing?.length > 0) {
      console.log(`\n🚨 ОТСУТСТВУЮЩИЕ ТАБЛИЦЫ (${grouped.table_missing.length}):`);
      grouped.table_missing.forEach(d => console.log(`  • ${d.table}`));
    }

    if (grouped.table_unused?.length > 0) {
      console.log(`\n❌ НЕИСПОЛЬЗУЕМЫЕ ТАБЛИЦЫ (${grouped.table_unused.length}):`);
      grouped.table_unused.forEach(d => {
        const rowInfo = d.details?.rowCount > 0 ? ` (${d.details.rowCount} записей)` : ' (пустая)';
        console.log(`  • ${d.table}${rowInfo}`);
      });
    }

    if (grouped.field_missing?.length > 0) {
      console.log(`\n🚨 ОТСУТСТВУЮЩИЕ ПОЛЯ (${grouped.field_missing.length}):`);
      const byTable = grouped.field_missing.reduce((acc, d) => {
        if (!acc[d.table]) acc[d.table] = [];
        acc[d.table].push(`${d.field} (${d.details?.codeType})`);
        return acc;
      }, {});
      Object.entries(byTable).forEach(([table, fields]) => {
        console.log(`  • ${table}: ${fields.join(', ')}`);
      });
    }

    if (grouped.field_unused?.length > 0) {
      console.log(`\n⚠️  НЕИСПОЛЬЗУЕМЫЕ ПОЛЯ (${grouped.field_unused.length}):`);
      const byTable = grouped.field_unused.reduce((acc, d) => {
        if (!acc[d.table]) acc[d.table] = [];
        acc[d.table].push(`${d.field} (${d.details?.dbType})`);
        return acc;
      }, {});
      Object.entries(byTable).forEach(([table, fields]) => {
        console.log(`  • ${table}: ${fields.join(', ')}`);
      });
    }

    if (grouped.type_mismatch?.length > 0) {
      console.log(`\n⚡ НЕСООТВЕТСТВИЕ ТИПОВ (${grouped.type_mismatch.length}):`);
      grouped.type_mismatch.forEach(d => {
        console.log(`  • ${d.table}.${d.field}: ${d.details.dbType} (база) ≠ ${d.details.codeType} (код)`);
      });
    }

    if (grouped.missing_index?.length > 0) {
      console.log(`\n📊 ОТСУТСТВУЮЩИЕ ИНДЕКСЫ (${grouped.missing_index.length}):`);
      const byTable = grouped.missing_index.reduce((acc, d) => {
        if (!acc[d.table]) acc[d.table] = [];
        acc[d.table].push(d.field);
        return acc;
      }, {});
      Object.entries(byTable).forEach(([table, fields]) => {
        console.log(`  • ${table}: ${fields.join(', ')}`);
      });
    }
  }

  /**
   * Выводит структуры таблиц
   */
  printTableStructures() {
    console.log(`\n📋 СТРУКТУРА ТАБЛИЦ В БАЗЕ:`);
    
    for (const [tableName, tableInfo] of this.analysisResults.tables) {
      console.log(`\n  📁 ${tableName.toUpperCase()} (${tableInfo.rowCount} записей)`);
      
      tableInfo.columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`    • ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
      });
      
      if (tableInfo.indexes.length > 0) {
        console.log(`    Индексы (${tableInfo.indexes.length}):`);
        tableInfo.indexes.forEach(idx => {
          console.log(`      • ${idx.indexname}`);
        });
      }
      
      if (tableInfo.foreignKeys.length > 0) {
        console.log(`    Внешние ключи (${tableInfo.foreignKeys.length}):`);
        tableInfo.foreignKeys.forEach(fk => {
          console.log(`      • ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
      }
    }
  }

  /**
   * Генерирует рекомендации
   */
  generateRecommendations() {
    console.log(`\n💡 РЕКОМЕНДАЦИИ ДЛЯ T15:`);
    
    const critical = this.analysisResults.discrepancies.filter(d => d.severity === 'high');
    const medium = this.analysisResults.discrepancies.filter(d => d.severity === 'medium');
    const low = this.analysisResults.discrepancies.filter(d => d.severity === 'low');
    
    if (critical.length > 0) {
      console.log(`\n🚨 КРИТИЧЕСКИЙ ПРИОРИТЕТ (${critical.length}):`);
      critical.forEach(d => {
        if (d.type === 'table_missing') {
          console.log(`  • Создать таблицу: ${d.table}`);
          this.analysisResults.recommendations.push(`CREATE TABLE ${d.table}`);
        }
        if (d.type === 'field_missing') {
          console.log(`  • Добавить поле: ${d.table}.${d.field} (${d.details?.codeType})`);
          this.analysisResults.recommendations.push(`ALTER TABLE ${d.table} ADD COLUMN ${d.field}`);
        }
      });
    }
    
    if (medium.length > 0) {
      console.log(`\n⚠️  СРЕДНИЙ ПРИОРИТЕТ (${medium.length}):`);
      medium.forEach(d => {
        if (d.type === 'missing_index') {
          console.log(`  • Добавить индекс: ${d.table}.${d.field}`);
          this.analysisResults.recommendations.push(`CREATE INDEX idx_${d.table}_${d.field} ON ${d.table}(${d.field})`);
        }
        if (d.type === 'type_mismatch') {
          console.log(`  • Исправить тип: ${d.table}.${d.field} (${d.details.dbType} → ${d.details.codeType})`);
        }
      });
    }
    
    if (low.length > 0) {
      console.log(`\n📝 НИЗКИЙ ПРИОРИТЕТ (${low.length}):`);
      console.log(`  • Очистить ${low.filter(d => d.type === 'field_unused').length} неиспользуемых полей`);
      console.log(`  • Проверить ${low.filter(d => d.type === 'table_unused').length} неиспользуемых таблиц`);
    }

    console.log(`\n🎯 ИТОГО:`);
    console.log(`  • Критических проблем: ${critical.length}`);
    console.log(`  • Проблем среднего приоритета: ${medium.length}`);
    console.log(`  • Проблем низкого приоритета: ${low.length}`);
  }

  /**
   * Сохраняет детальный отчет
   */
  saveDetailedReport(stats) {
    const report = {
      timestamp: new Date().toISOString(),
      statistics: stats,
      database_tables: Object.fromEntries(this.analysisResults.tables),
      code_models: Object.fromEntries(this.analysisResults.codeModels),
      discrepancies: this.analysisResults.discrepancies,
      recommendations: this.analysisResults.recommendations
    };
    
    fs.writeFileSync('T14_DATABASE_ANALYSIS_REPORT.json', JSON.stringify(report, null, 2));
    console.log(`\n✅ Детальный отчет сохранен: T14_DATABASE_ANALYSIS_REPORT.json`);
  }

  /**
   * Основной метод анализа
   */
  async runAnalysis() {
    try {
      console.log('🚀 ЗАПУСК АНАЛИЗА T14: СТРУКТУРА БАЗЫ ДАННЫХ');
      
      await this.analyzeDatabaseStructure();
      await this.analyzeCodeSchema();
      this.compareStructures();
      this.checkCriticalIndexes();
      
      const stats = this.generateReport();
      
      console.log('\n✅ АНАЛИЗ T14 ЗАВЕРШЕН УСПЕШНО');
      return stats;
    } catch (error) {
      console.error('❌ Критическая ошибка T14:', error.message);
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}

// Запуск анализа
async function main() {
  const analyzer = new DatabaseStructureAnalyzer();
  await analyzer.runAnalysis();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DatabaseStructureAnalyzer };