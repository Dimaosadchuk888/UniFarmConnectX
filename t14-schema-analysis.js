/**
 * T14: Анализ структуры базы данных на основе схемы
 * Сравнивает определения в shared/schema.ts с реальной структурой
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SchemaAnalyzer {
  constructor() {
    this.schemaDefinitions = new Map();
    this.discrepancies = [];
    this.recommendations = [];
  }

  /**
   * Анализирует файл shared/schema.ts
   */
  analyzeSchemaFile() {
    console.log('🔍 Анализ схемы базы данных из shared/schema.ts...');
    
    const schemaPath = path.join(__dirname, 'shared/schema.ts');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Файл shared/schema.ts не найден');
      return;
    }

    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    this.parseSchemaContent(schemaContent);
  }

  /**
   * Парсит содержимое schema.ts
   */
  parseSchemaContent(content) {
    // Разбиваем на строки для анализа
    const lines = content.split('\n');
    let currentTable = null;
    let tableDefinition = '';
    let inTableDef = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Ищем определения таблиц
      const tableMatch = line.match(/export const (\w+) = pgTable\(['"`](\w+)['"`]/);
      if (tableMatch) {
        // Сохраняем предыдущую таблицу если была
        if (currentTable && tableDefinition) {
          this.parseTableDefinition(currentTable, tableDefinition);
        }
        
        currentTable = {
          variableName: tableMatch[1],
          tableName: tableMatch[2],
          startLine: i + 1
        };
        tableDefinition = '';
        inTableDef = true;
      }
      
      if (inTableDef) {
        tableDefinition += line + '\n';
        
        // Ищем конец определения таблицы
        if (line.includes('});') && !line.includes('pgTable')) {
          inTableDef = false;
          if (currentTable) {
            this.parseTableDefinition(currentTable, tableDefinition);
            currentTable = null;
            tableDefinition = '';
          }
        }
      }
    }

    console.log(`📋 Найдено ${this.schemaDefinitions.size} таблиц в схеме`);
  }

  /**
   * Парсит определение отдельной таблицы
   */
  parseTableDefinition(tableInfo, definition) {
    const fields = [];
    const indexes = [];
    const constraints = [];

    // Парсим поля
    const fieldMatches = definition.match(/(\w+):\s*(\w+)\([^)]*\)([^,\n}]*)/g);
    
    if (fieldMatches) {
      for (const fieldMatch of fieldMatches) {
        const fieldData = this.parseFieldDefinition(fieldMatch);
        if (fieldData) {
          fields.push(fieldData);
        }
      }
    }

    // Парсим индексы
    const indexSection = definition.match(/\(table\) => \({([^}]+)\}\)/s);
    if (indexSection) {
      const indexContent = indexSection[1];
      const indexMatches = indexContent.match(/(\w+): index\(['"`]([^'"`]+)['"`]\)\.on\(([^)]+)\)/g);
      
      if (indexMatches) {
        for (const indexMatch of indexMatches) {
          const indexData = this.parseIndexDefinition(indexMatch);
          if (indexData) {
            indexes.push(indexData);
          }
        }
      }
    }

    this.schemaDefinitions.set(tableInfo.tableName, {
      variableName: tableInfo.variableName,
      tableName: tableInfo.tableName,
      fields: fields,
      indexes: indexes,
      constraints: constraints,
      sourceDefinition: definition
    });

    console.log(`  ✅ ${tableInfo.tableName}: ${fields.length} полей, ${indexes.length} индексов`);
  }

  /**
   * Парсит определение поля
   */
  parseFieldDefinition(fieldDef) {
    try {
      const match = fieldDef.match(/(\w+):\s*(\w+)\(([^)]*)\)([^,\n}]*)/);
      if (!match) return null;

      const [, fieldName, fieldType, params, modifiers] = match;

      return {
        name: fieldName,
        type: fieldType,
        params: params,
        primaryKey: modifiers.includes('.primaryKey()'),
        notNull: modifiers.includes('.notNull()'),
        unique: modifiers.includes('.unique()'),
        hasDefault: modifiers.includes('.default(') || modifiers.includes('.defaultNow()'),
        defaultValue: this.extractDefaultValue(modifiers),
        references: this.extractReferences(modifiers),
        mode: this.extractMode(params)
      };
    } catch (error) {
      console.warn(`⚠️  Не удалось распарсить поле: ${fieldDef}`);
      return null;
    }
  }

  /**
   * Парсит определение индекса
   */
  parseIndexDefinition(indexDef) {
    try {
      const match = indexDef.match(/(\w+): index\(['"`]([^'"`]+)['"`]\)\.on\(([^)]+)\)/);
      if (!match) return null;

      const [, indexVar, indexName, columns] = match;
      
      return {
        variableName: indexVar,
        indexName: indexName,
        columns: columns.split(',').map(col => col.trim().replace(/table\./, '')),
        type: 'btree' // по умолчанию для PostgreSQL
      };
    } catch (error) {
      console.warn(`⚠️  Не удалось распарсить индекс: ${indexDef}`);
      return null;
    }
  }

  /**
   * Извлекает значение по умолчанию
   */
  extractDefaultValue(modifiers) {
    const defaultMatch = modifiers.match(/\.default\(([^)]+)\)/);
    if (defaultMatch) {
      return defaultMatch[1];
    }
    
    if (modifiers.includes('.defaultNow()')) {
      return 'NOW()';
    }
    
    return null;
  }

  /**
   * Извлекает ссылки на другие таблицы
   */
  extractReferences(modifiers) {
    const refMatch = modifiers.match(/\.references\(\(\) => (\w+)\.(\w+)\)/);
    if (refMatch) {
      return {
        table: refMatch[1],
        column: refMatch[2]
      };
    }
    return null;
  }

  /**
   * Извлекает режим для поля
   */
  extractMode(params) {
    const modeMatch = params.match(/mode:\s*['"`](\w+)['"`]/);
    return modeMatch ? modeMatch[1] : null;
  }

  /**
   * Проверяет ожидаемые таблицы на основе кода
   */
  checkExpectedTables() {
    console.log('\n🔍 Проверка ожидаемых таблиц...');
    
    const expectedTables = [
      'users', 'auth_users', 'farming_deposits', 'transactions', 
      'referrals', 'missions', 'user_missions', 'user_balances',
      'uni_farming_deposits', 'boost_deposits', 'ton_boost_deposits',
      'launch_logs', 'airdrop_participants', 'referral_earnings'
    ];

    const definedTables = Array.from(this.schemaDefinitions.keys());
    
    // Таблицы, определенные в схеме, но потенциально неиспользуемые
    for (const table of definedTables) {
      if (!expectedTables.includes(table)) {
        this.discrepancies.push({
          type: 'potentially_unused_table',
          table: table,
          severity: 'low',
          message: `Таблица ${table} определена в схеме, но может не использоваться активно`
        });
      }
    }

    // Ожидаемые таблицы, которые отсутствуют в схеме
    for (const expectedTable of expectedTables) {
      if (!definedTables.includes(expectedTable)) {
        this.discrepancies.push({
          type: 'missing_table_definition',
          table: expectedTable,
          severity: 'high',
          message: `Ожидаемая таблица ${expectedTable} отсутствует в схеме`
        });
      }
    }

    console.log(`  📊 Определено таблиц: ${definedTables.length}`);
    console.log(`  📋 Ожидается таблиц: ${expectedTables.length}`);
  }

  /**
   * Анализирует критические поля и индексы
   */
  analyzeCriticalFields() {
    console.log('\n🔍 Анализ критических полей и индексов...');
    
    const criticalFieldsConfig = {
      users: ['telegram_id', 'ref_code', 'parent_ref_code'],
      transactions: ['user_id', 'transaction_type', 'source_user_id'],
      referrals: ['user_id', 'inviter_id', 'level'],
      farming_deposits: ['user_id'],
      missions: ['type'],
      user_missions: ['user_id', 'mission_id']
    };

    for (const [tableName, table] of this.schemaDefinitions) {
      const criticalFields = criticalFieldsConfig[tableName] || [];
      const definedIndexes = table.indexes.map(idx => idx.columns).flat();
      
      for (const criticalField of criticalFields) {
        const fieldExists = table.fields.some(f => f.name === criticalField);
        
        if (!fieldExists) {
          this.discrepancies.push({
            type: 'missing_critical_field',
            table: tableName,
            field: criticalField,
            severity: 'high',
            message: `Критическое поле ${criticalField} отсутствует в таблице ${tableName}`
          });
          continue;
        }

        // Проверяем индекс для критического поля
        const hasIndex = definedIndexes.includes(criticalField) || 
                        table.fields.find(f => f.name === criticalField)?.primaryKey ||
                        table.fields.find(f => f.name === criticalField)?.unique;

        if (!hasIndex) {
          this.discrepancies.push({
            type: 'missing_critical_index',
            table: tableName,
            field: criticalField,
            severity: 'medium',
            message: `Критическое поле ${tableName}.${criticalField} не имеет индекса`
          });
        }
      }
    }
  }

  /**
   * Проверяет типы данных и их совместимость
   */
  checkDataTypes() {
    console.log('\n🔍 Проверка типов данных...');
    
    const typeIssues = [];
    
    for (const [tableName, table] of this.schemaDefinitions) {
      for (const field of table.fields) {
        // Проверяем потенциальные проблемы с типами
        if (field.name.includes('_id') && field.type !== 'serial' && field.type !== 'integer' && field.type !== 'bigint') {
          typeIssues.push({
            table: tableName,
            field: field.name,
            issue: `ID поле ${field.name} имеет тип ${field.type} вместо integer/serial/bigint`
          });
        }

        if (field.name.includes('balance') && field.type !== 'numeric') {
          typeIssues.push({
            table: tableName,
            field: field.name,
            issue: `Поле баланса ${field.name} имеет тип ${field.type} вместо numeric`
          });
        }

        if (field.name.includes('amount') && field.type !== 'numeric') {
          typeIssues.push({
            table: tableName,
            field: field.name,
            issue: `Поле суммы ${field.name} имеет тип ${field.type} вместо numeric`
          });
        }

        if (field.name.endsWith('_at') && field.type !== 'timestamp') {
          typeIssues.push({
            table: tableName,
            field: field.name,
            issue: `Поле времени ${field.name} имеет тип ${field.type} вместо timestamp`
          });
        }
      }
    }

    for (const issue of typeIssues) {
      this.discrepancies.push({
        type: 'data_type_inconsistency',
        table: issue.table,
        field: issue.field,
        severity: 'medium',
        message: issue.issue
      });
    }

    console.log(`  ⚠️  Найдено потенциальных проблем с типами: ${typeIssues.length}`);
  }

  /**
   * Проверяет внешние ключи и ссылочную целостность
   */
  checkReferentialIntegrity() {
    console.log('\n🔍 Проверка ссылочной целостности...');
    
    const foreignKeyIssues = [];
    
    for (const [tableName, table] of this.schemaDefinitions) {
      for (const field of table.fields) {
        if (field.references) {
          const referencedTable = field.references.table;
          const referencedColumn = field.references.column;
          
          // Проверяем, существует ли referenced table
          if (!this.schemaDefinitions.has(referencedTable)) {
            foreignKeyIssues.push({
              table: tableName,
              field: field.name,
              issue: `Ссылается на несуществующую таблицу ${referencedTable}`
            });
            continue;
          }

          // Проверяем, существует ли referenced column
          const refTable = this.schemaDefinitions.get(referencedTable);
          const refColumnExists = refTable.fields.some(f => f.name === referencedColumn);
          
          if (!refColumnExists) {
            foreignKeyIssues.push({
              table: tableName,
              field: field.name,
              issue: `Ссылается на несуществующую колонку ${referencedTable}.${referencedColumn}`
            });
          }
        }
      }
    }

    for (const issue of foreignKeyIssues) {
      this.discrepancies.push({
        type: 'referential_integrity_issue',
        table: issue.table,
        field: issue.field,
        severity: 'high',
        message: issue.issue
      });
    }

    console.log(`  🔗 Найдено проблем со ссылочной целостностью: ${foreignKeyIssues.length}`);
  }

  /**
   * Генерирует рекомендации для T15
   */
  generateRecommendations() {
    console.log('\n💡 Генерация рекомендаций для T15...');
    
    const critical = this.discrepancies.filter(d => d.severity === 'high');
    const medium = this.discrepancies.filter(d => d.severity === 'medium');
    const low = this.discrepancies.filter(d => d.severity === 'low');

    // Критические рекомендации
    for (const disc of critical) {
      if (disc.type === 'missing_table_definition') {
        this.recommendations.push({
          priority: 'critical',
          action: 'CREATE_TABLE',
          table: disc.table,
          sql: `-- Необходимо создать таблицу ${disc.table}`,
          description: disc.message
        });
      }
      
      if (disc.type === 'missing_critical_field') {
        this.recommendations.push({
          priority: 'critical',
          action: 'ADD_COLUMN',
          table: disc.table,
          field: disc.field,
          sql: `ALTER TABLE ${disc.table} ADD COLUMN ${disc.field} -- тип требует уточнения`,
          description: disc.message
        });
      }

      if (disc.type === 'referential_integrity_issue') {
        this.recommendations.push({
          priority: 'critical',
          action: 'FIX_FOREIGN_KEY',
          table: disc.table,
          field: disc.field,
          sql: `-- Исправить внешний ключ ${disc.table}.${disc.field}`,
          description: disc.message
        });
      }
    }

    // Средний приоритет
    for (const disc of medium) {
      if (disc.type === 'missing_critical_index') {
        this.recommendations.push({
          priority: 'medium',
          action: 'CREATE_INDEX',
          table: disc.table,
          field: disc.field,
          sql: `CREATE INDEX idx_${disc.table}_${disc.field} ON ${disc.table}(${disc.field});`,
          description: disc.message
        });
      }

      if (disc.type === 'data_type_inconsistency') {
        this.recommendations.push({
          priority: 'medium',
          action: 'ALTER_COLUMN_TYPE',
          table: disc.table,
          field: disc.field,
          sql: `-- ALTER TABLE ${disc.table} ALTER COLUMN ${disc.field} TYPE recommended_type;`,
          description: disc.message
        });
      }
    }

    // Низкий приоритет
    for (const disc of low) {
      if (disc.type === 'potentially_unused_table') {
        this.recommendations.push({
          priority: 'low',
          action: 'REVIEW_TABLE_USAGE',
          table: disc.table,
          sql: `-- Проверить использование таблицы ${disc.table}`,
          description: disc.message
        });
      }
    }

    console.log(`  📋 Сгенерировано рекомендаций: ${this.recommendations.length}`);
  }

  /**
   * Генерирует полный отчет T14
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 ОТЧЕТ T14: АНАЛИЗ СХЕМЫ БАЗЫ ДАННЫХ UniFarm');
    console.log('='.repeat(80));

    const stats = {
      totalTables: this.schemaDefinitions.size,
      totalDiscrepancies: this.discrepancies.length,
      totalRecommendations: this.recommendations.length
    };

    console.log(`\n📈 ОБЩАЯ СТАТИСТИКА:`);
    console.log(`  Таблиц в схеме: ${stats.totalTables}`);
    console.log(`  Найдено проблем: ${stats.totalDiscrepancies}`);
    console.log(`  Рекомендаций для T15: ${stats.totalRecommendations}`);

    // Группируем расхождения
    const grouped = this.discrepancies.reduce((acc, disc) => {
      if (!acc[disc.severity]) acc[disc.severity] = [];
      acc[disc.severity].push(disc);
      return acc;
    }, {});

    console.log(`\n🔍 РАСХОЖДЕНИЯ ПО ПРИОРИТЕТУ:`);
    
    if (grouped.high?.length > 0) {
      console.log(`\n🚨 КРИТИЧЕСКИЙ ПРИОРИТЕТ (${grouped.high.length}):`);
      grouped.high.forEach(d => {
        const location = d.field ? `${d.table}.${d.field}` : d.table;
        console.log(`  • ${location}: ${d.message}`);
      });
    }

    if (grouped.medium?.length > 0) {
      console.log(`\n⚠️  СРЕДНИЙ ПРИОРИТЕТ (${grouped.medium.length}):`);
      grouped.medium.forEach(d => {
        const location = d.field ? `${d.table}.${d.field}` : d.table;
        console.log(`  • ${location}: ${d.message}`);
      });
    }

    if (grouped.low?.length > 0) {
      console.log(`\n📝 НИЗКИЙ ПРИОРИТЕТ (${grouped.low.length}):`);
      grouped.low.forEach(d => {
        const location = d.field ? `${d.table}.${d.field}` : d.table;
        console.log(`  • ${location}: ${d.message}`);
      });
    }

    console.log(`\n📋 СТРУКТУРА ТАБЛИЦ В СХЕМЕ:`);
    for (const [tableName, table] of this.schemaDefinitions) {
      console.log(`\n  📁 ${tableName.toUpperCase()} (${table.variableName})`);
      console.log(`     Полей: ${table.fields.length}`);
      
      table.fields.forEach(field => {
        const constraints = [];
        if (field.primaryKey) constraints.push('PK');
        if (field.unique) constraints.push('UNIQUE');
        if (field.notNull) constraints.push('NOT NULL');
        if (field.hasDefault) constraints.push('DEFAULT');
        if (field.references) constraints.push(`FK→${field.references.table}`);
        
        const constraintStr = constraints.length > 0 ? ` [${constraints.join(', ')}]` : '';
        console.log(`       • ${field.name}: ${field.type}${constraintStr}`);
      });
      
      if (table.indexes.length > 0) {
        console.log(`     Индексы: ${table.indexes.length}`);
        table.indexes.forEach(idx => {
          console.log(`       • ${idx.indexName}: ${idx.columns.join(', ')}`);
        });
      }
    }

    console.log(`\n💡 РЕКОМЕНДАЦИИ ДЛЯ T15:`);
    
    const criticalRecs = this.recommendations.filter(r => r.priority === 'critical');
    const mediumRecs = this.recommendations.filter(r => r.priority === 'medium');
    const lowRecs = this.recommendations.filter(r => r.priority === 'low');

    if (criticalRecs.length > 0) {
      console.log(`\n🚨 КРИТИЧЕСКИЕ ДЕЙСТВИЯ (${criticalRecs.length}):`);
      criticalRecs.forEach(rec => {
        console.log(`  • ${rec.action}: ${rec.description}`);
        if (rec.sql && !rec.sql.startsWith('--')) {
          console.log(`    SQL: ${rec.sql}`);
        }
      });
    }

    if (mediumRecs.length > 0) {
      console.log(`\n⚠️  СРЕДНИЙ ПРИОРИТЕТ (${mediumRecs.length}):`);
      mediumRecs.forEach(rec => {
        console.log(`  • ${rec.action}: ${rec.description}`);
      });
    }

    if (lowRecs.length > 0) {
      console.log(`\n📝 НИЗКИЙ ПРИОРИТЕТ (${lowRecs.length}):`);
      lowRecs.forEach(rec => {
        console.log(`  • ${rec.action}: ${rec.description}`);
      });
    }

    // Сохраняем отчет
    this.saveReport(stats);

    return stats;
  }

  /**
   * Сохраняет детальный отчет в файл
   */
  saveReport(stats) {
    const report = {
      timestamp: new Date().toISOString(),
      task: 'T14_SCHEMA_ANALYSIS',
      statistics: stats,
      schema_definitions: Object.fromEntries(this.schemaDefinitions),
      discrepancies: this.discrepancies,
      recommendations: this.recommendations,
      summary: {
        critical_issues: this.discrepancies.filter(d => d.severity === 'high').length,
        medium_issues: this.discrepancies.filter(d => d.severity === 'medium').length,
        low_issues: this.discrepancies.filter(d => d.severity === 'low').length,
        tables_analyzed: this.schemaDefinitions.size
      }
    };

    fs.writeFileSync('T14_SCHEMA_ANALYSIS_REPORT.json', JSON.stringify(report, null, 2));
    console.log(`\n✅ Отчет сохранен: T14_SCHEMA_ANALYSIS_REPORT.json`);
  }

  /**
   * Основной метод анализа
   */
  runAnalysis() {
    try {
      console.log('🚀 ЗАПУСК АНАЛИЗА T14: СХЕМА БАЗЫ ДАННЫХ');
      
      this.analyzeSchemaFile();
      this.checkExpectedTables();
      this.analyzeCriticalFields();
      this.checkDataTypes();
      this.checkReferentialIntegrity();
      this.generateRecommendations();
      
      const stats = this.generateReport();
      
      console.log('\n✅ АНАЛИЗ T14 ЗАВЕРШЕН УСПЕШНО');
      console.log(`📊 Итого: ${stats.totalTables} таблиц, ${stats.totalDiscrepancies} проблем, ${stats.totalRecommendations} рекомендаций`);
      
      return stats;
    } catch (error) {
      console.error('❌ Критическая ошибка T14:', error.message);
      throw error;
    }
  }
}

// Запуск анализа
async function main() {
  const analyzer = new SchemaAnalyzer();
  analyzer.runAnalysis();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { SchemaAnalyzer };