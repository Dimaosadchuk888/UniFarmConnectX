/**
 * T14: Исправленный анализ структуры базы данных
 * Полный парсинг shared/schema.ts с корректной обработкой многострочных определений
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CorrectedSchemaAnalyzer {
  constructor() {
    this.schemaDefinitions = new Map();
    this.discrepancies = [];
    this.recommendations = [];
    this.codeUsage = new Map();
  }

  /**
   * Основной анализ схемы с улучшенным парсингом
   */
  analyzeSchema() {
    console.log('🔍 Исправленный анализ схемы базы данных...');
    
    const schemaPath = path.join(__dirname, 'shared/schema.ts');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Файл shared/schema.ts не найден');
      return;
    }

    const content = fs.readFileSync(schemaPath, 'utf8');
    this.parseSchemaWithRegex(content);
    this.analyzeCodeUsage();
  }

  /**
   * Улучшенный парсер с использованием регулярных выражений
   */
  parseSchemaWithRegex(content) {
    // Убираем комментарии для чистого парсинга
    const cleanContent = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    
    // Ищем все определения таблиц с захватом полного определения
    const tableRegex = /export const (\w+) = pgTable\(\s*["'`](\w+)["'`]\s*,\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\s*(?:,\s*\([^)]*\)\s*=>\s*\(\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\))?/gs;
    
    let match;
    while ((match = tableRegex.exec(cleanContent)) !== null) {
      const [fullMatch, variableName, tableName, fieldsSection, indexesSection] = match;
      
      const fields = this.parseFieldsSection(fieldsSection);
      const indexes = this.parseIndexesSection(indexesSection || '');
      
      this.schemaDefinitions.set(tableName, {
        variableName,
        tableName,
        fields,
        indexes,
        rawDefinition: fullMatch
      });
      
      console.log(`  ✅ ${tableName} (${variableName}): ${fields.length} полей, ${indexes.length} индексов`);
    }

    console.log(`📋 Найдено ${this.schemaDefinitions.size} таблиц в схеме`);
  }

  /**
   * Парсит секцию полей таблицы
   */
  parseFieldsSection(fieldsSection) {
    const fields = [];
    
    // Разбиваем на строки и обрабатываем каждое поле
    const lines = fieldsSection.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines) {
      if (line.includes(':')) {
        const field = this.parseFieldLine(line);
        if (field) {
          fields.push(field);
        }
      }
    }
    
    return fields;
  }

  /**
   * Парсит отдельную строку поля
   */
  parseFieldLine(line) {
    try {
      // Убираем запятую в конце
      const cleanLine = line.replace(/,$/, '');
      
      // Извлекаем имя поля
      const nameMatch = cleanLine.match(/^(\w+):/);
      if (!nameMatch) return null;
      
      const fieldName = nameMatch[1];
      
      // Извлекаем тип поля
      const typeMatch = cleanLine.match(/:\s*(\w+)\(/);
      if (!typeMatch) return null;
      
      const fieldType = typeMatch[1];
      
      // Проверяем модификаторы
      const isPrimaryKey = cleanLine.includes('.primaryKey()');
      const isNotNull = cleanLine.includes('.notNull()');
      const isUnique = cleanLine.includes('.unique()');
      const hasDefault = cleanLine.includes('.default(') || cleanLine.includes('.defaultNow()');
      
      // Извлекаем ссылки
      const referencesMatch = cleanLine.match(/\.references\(\(\) => (\w+)\.(\w+)\)/);
      const references = referencesMatch ? {
        table: referencesMatch[1],
        column: referencesMatch[2]
      } : null;
      
      // Извлекаем параметры типа
      const paramsMatch = cleanLine.match(/\w+\(([^)]*)\)/);
      const params = paramsMatch ? paramsMatch[1] : '';
      
      return {
        name: fieldName,
        type: fieldType,
        params,
        primaryKey: isPrimaryKey,
        notNull: isNotNull,
        unique: isUnique,
        hasDefault,
        references,
        nullable: !isNotNull && !isPrimaryKey
      };
    } catch (error) {
      console.warn(`⚠️  Ошибка парсинга поля: ${line}`);
      return null;
    }
  }

  /**
   * Парсит секцию индексов
   */
  parseIndexesSection(indexesSection) {
    const indexes = [];
    
    if (!indexesSection) return indexes;
    
    // Ищем определения индексов
    const indexMatches = indexesSection.match(/(\w+):\s*index\(["'`]([^"'`]+)["'`]\)\.on\(([^)]+)\)/g);
    
    if (indexMatches) {
      for (const indexMatch of indexMatches) {
        const match = indexMatch.match(/(\w+):\s*index\(["'`]([^"'`]+)["'`]\)\.on\(([^)]+)\)/);
        if (match) {
          const [, varName, indexName, columns] = match;
          
          indexes.push({
            variableName: varName,
            indexName,
            columns: columns.split(',').map(col => col.trim().replace(/table\./, '')),
            type: 'btree'
          });
        }
      }
    }
    
    return indexes;
  }

  /**
   * Анализирует использование таблиц в коде
   */
  analyzeCodeUsage() {
    console.log('\n🔍 Анализ использования таблиц в коде...');
    
    // Анализируем модули
    this.analyzeModulesUsage();
    
    // Анализируем сервисы
    this.analyzeServicesUsage();
  }

  /**
   * Анализирует использование в модулях
   */
  analyzeModulesUsage() {
    const modulesPath = path.join(__dirname, 'modules');
    
    if (!fs.existsSync(modulesPath)) {
      console.log('  ⚠️  Папка modules не найдена');
      return;
    }
    
    const modules = fs.readdirSync(modulesPath);
    
    for (const module of modules) {
      const servicePath = path.join(modulesPath, module, 'service.ts');
      
      if (fs.existsSync(servicePath)) {
        const serviceContent = fs.readFileSync(servicePath, 'utf8');
        this.analyzeFileUsage(serviceContent, `modules/${module}/service.ts`);
      }
    }
  }

  /**
   * Анализирует использование в сервисах
   */
  analyzeServicesUsage() {
    const serverPath = path.join(__dirname, 'server');
    
    if (fs.existsSync(serverPath)) {
      const files = fs.readdirSync(serverPath);
      
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          const filePath = path.join(serverPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          this.analyzeFileUsage(content, `server/${file}`);
        }
      }
    }
  }

  /**
   * Анализирует использование таблиц в файле
   */
  analyzeFileUsage(content, filePath) {
    for (const [tableName] of this.schemaDefinitions) {
      // Ищем прямые упоминания таблицы
      const tableUsageRegex = new RegExp(`\\b${tableName}\\b`, 'g');
      const matches = content.match(tableUsageRegex);
      
      if (matches && matches.length > 0) {
        if (!this.codeUsage.has(tableName)) {
          this.codeUsage.set(tableName, []);
        }
        
        this.codeUsage.get(tableName).push({
          file: filePath,
          occurrences: matches.length
        });
      }
    }
  }

  /**
   * Проверяет критические поля и индексы
   */
  checkCriticalElements() {
    console.log('\n🔍 Проверка критических элементов...');
    
    const criticalFields = {
      users: ['telegram_id', 'ref_code', 'parent_ref_code'],
      transactions: ['user_id', 'transaction_type', 'source_user_id'],
      referrals: ['user_id', 'inviter_id', 'level'],
      farming_deposits: ['user_id'],
      missions: ['type'],
      user_missions: ['user_id', 'mission_id'],
      user_balances: ['user_id'],
      uni_farming_deposits: ['user_id'],
      airdrop_participants: ['telegram_id', 'user_id']
    };

    for (const [tableName, table] of this.schemaDefinitions) {
      const expectedFields = criticalFields[tableName] || [];
      const existingFields = table.fields.map(f => f.name);
      const existingIndexes = table.indexes.map(idx => idx.columns).flat();
      
      // Проверяем наличие критических полей
      for (const criticalField of expectedFields) {
        if (!existingFields.includes(criticalField)) {
          this.discrepancies.push({
            type: 'missing_critical_field',
            table: tableName,
            field: criticalField,
            severity: 'high',
            message: `Критическое поле ${criticalField} отсутствует в таблице ${tableName}`
          });
        } else {
          // Проверяем индекс для критического поля
          const field = table.fields.find(f => f.name === criticalField);
          const hasIndex = existingIndexes.includes(criticalField) || 
                          field?.primaryKey || 
                          field?.unique;
          
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
  }

  /**
   * Проверяет ссылочную целостность
   */
  checkReferentialIntegrity() {
    console.log('\n🔍 Проверка ссылочной целостности...');
    
    for (const [tableName, table] of this.schemaDefinitions) {
      for (const field of table.fields) {
        if (field.references) {
          const referencedTable = field.references.table;
          const referencedColumn = field.references.column;
          
          if (!this.schemaDefinitions.has(referencedTable)) {
            this.discrepancies.push({
              type: 'broken_foreign_key',
              table: tableName,
              field: field.name,
              severity: 'high',
              message: `Поле ${tableName}.${field.name} ссылается на несуществующую таблицу ${referencedTable}`
            });
          } else {
            const refTable = this.schemaDefinitions.get(referencedTable);
            const refColumnExists = refTable.fields.some(f => f.name === referencedColumn);
            
            if (!refColumnExists) {
              this.discrepancies.push({
                type: 'broken_foreign_key',
                table: tableName,
                field: field.name,
                severity: 'high',
                message: `Поле ${tableName}.${field.name} ссылается на несуществующую колонку ${referencedTable}.${referencedColumn}`
              });
            }
          }
        }
      }
    }
  }

  /**
   * Проверяет использование таблиц
   */
  checkTableUsage() {
    console.log('\n🔍 Проверка использования таблиц...');
    
    for (const [tableName] of this.schemaDefinitions) {
      const usage = this.codeUsage.get(tableName);
      
      if (!usage || usage.length === 0) {
        this.discrepancies.push({
          type: 'unused_table',
          table: tableName,
          severity: 'low',
          message: `Таблица ${tableName} определена в схеме, но не используется в коде`
        });
      } else {
        console.log(`  ✅ ${tableName}: используется в ${usage.length} файлах`);
      }
    }
  }

  /**
   * Проверяет соответствие типов данных
   */
  checkDataTypeConsistency() {
    console.log('\n🔍 Проверка соответствия типов данных...');
    
    for (const [tableName, table] of this.schemaDefinitions) {
      for (const field of table.fields) {
        // Проверяем ID поля
        if (field.name.endsWith('_id') && !['serial', 'integer', 'bigint'].includes(field.type)) {
          this.discrepancies.push({
            type: 'incorrect_id_type',
            table: tableName,
            field: field.name,
            severity: 'medium',
            message: `ID поле ${tableName}.${field.name} имеет тип ${field.type} вместо integer/serial/bigint`
          });
        }
        
        // Проверяем поля балансов и сумм
        if ((field.name.includes('balance') || field.name.includes('amount')) && field.type !== 'numeric') {
          this.discrepancies.push({
            type: 'incorrect_money_type',
            table: tableName,
            field: field.name,
            severity: 'medium',
            message: `Денежное поле ${tableName}.${field.name} имеет тип ${field.type} вместо numeric`
          });
        }
        
        // Проверяем временные поля
        if (field.name.endsWith('_at') && field.type !== 'timestamp') {
          this.discrepancies.push({
            type: 'incorrect_timestamp_type',
            table: tableName,
            field: field.name,
            severity: 'low',
            message: `Временное поле ${tableName}.${field.name} имеет тип ${field.type} вместо timestamp`
          });
        }
      }
    }
  }

  /**
   * Генерирует рекомендации для T15
   */
  generateRecommendations() {
    console.log('\n💡 Генерация рекомендаций для T15...');
    
    const priorityMap = { high: 'critical', medium: 'medium', low: 'low' };
    
    for (const disc of this.discrepancies) {
      const priority = priorityMap[disc.severity];
      
      switch (disc.type) {
        case 'missing_critical_field':
          this.recommendations.push({
            priority,
            action: 'ADD_COLUMN',
            table: disc.table,
            field: disc.field,
            sql: `ALTER TABLE ${disc.table} ADD COLUMN ${disc.field} INTEGER;`,
            description: disc.message
          });
          break;
          
        case 'missing_critical_index':
          this.recommendations.push({
            priority,
            action: 'CREATE_INDEX',
            table: disc.table,
            field: disc.field,
            sql: `CREATE INDEX idx_${disc.table}_${disc.field} ON ${disc.table}(${disc.field});`,
            description: disc.message
          });
          break;
          
        case 'broken_foreign_key':
          this.recommendations.push({
            priority,
            action: 'FIX_FOREIGN_KEY',
            table: disc.table,
            field: disc.field,
            sql: `-- Исправить внешний ключ ${disc.table}.${disc.field}`,
            description: disc.message
          });
          break;
          
        case 'unused_table':
          this.recommendations.push({
            priority,
            action: 'REVIEW_TABLE',
            table: disc.table,
            sql: `-- Проверить необходимость таблицы ${disc.table}`,
            description: disc.message
          });
          break;
          
        default:
          this.recommendations.push({
            priority,
            action: 'REVIEW',
            table: disc.table,
            field: disc.field,
            sql: `-- ${disc.message}`,
            description: disc.message
          });
      }
    }
    
    console.log(`  📋 Сгенерировано ${this.recommendations.length} рекомендаций`);
  }

  /**
   * Генерирует полный отчет T14
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 ОТЧЕТ T14: ПОЛНЫЙ АНАЛИЗ СТРУКТУРЫ БАЗЫ ДАННЫХ UniFarm');
    console.log('='.repeat(80));

    const stats = {
      totalTables: this.schemaDefinitions.size,
      totalDiscrepancies: this.discrepancies.length,
      totalRecommendations: this.recommendations.length,
      tablesWithIssues: new Set(this.discrepancies.map(d => d.table)).size,
      criticalIssues: this.discrepancies.filter(d => d.severity === 'high').length,
      mediumIssues: this.discrepancies.filter(d => d.severity === 'medium').length,
      lowIssues: this.discrepancies.filter(d => d.severity === 'low').length
    };

    console.log(`\n📈 СТАТИСТИКА АНАЛИЗА:`);
    console.log(`  Таблиц в схеме: ${stats.totalTables}`);
    console.log(`  Таблиц с проблемами: ${stats.tablesWithIssues}`);
    console.log(`  Критических проблем: ${stats.criticalIssues}`);
    console.log(`  Проблем среднего приоритета: ${stats.mediumIssues}`);
    console.log(`  Проблем низкого приоритета: ${stats.lowIssues}`);
    console.log(`  Всего рекомендаций: ${stats.totalRecommendations}`);

    // Выводим структуру найденных таблиц
    console.log(`\n📋 НАЙДЕННЫЕ ТАБЛИЦЫ В СХЕМЕ:`);
    const tablesList = Array.from(this.schemaDefinitions.keys()).sort();
    tablesList.forEach((tableName, index) => {
      const table = this.schemaDefinitions.get(tableName);
      const usage = this.codeUsage.get(tableName);
      const usageInfo = usage ? `(используется в ${usage.length} файлах)` : '(не используется)';
      console.log(`  ${index + 1}. ${tableName} - ${table.fields.length} полей, ${table.indexes.length} индексов ${usageInfo}`);
    });

    // Выводим проблемы по приоритетам
    this.printDiscrepanciesByPriority();
    
    // Выводим детальную структуру проблемных таблиц
    this.printProblematicTables();
    
    // Выводим рекомендации
    this.printRecommendations();

    // Сохраняем отчет
    this.saveReport(stats);

    return stats;
  }

  /**
   * Выводит проблемы по приоритетам
   */
  printDiscrepanciesByPriority() {
    console.log(`\n🔍 ПРОБЛЕМЫ ПО ПРИОРИТЕТАМ:`);
    
    const grouped = this.discrepancies.reduce((acc, disc) => {
      if (!acc[disc.severity]) acc[disc.severity] = [];
      acc[disc.severity].push(disc);
      return acc;
    }, {});

    if (grouped.high?.length > 0) {
      console.log(`\n🚨 КРИТИЧЕСКИЙ ПРИОРИТЕТ (${grouped.high.length}):`);
      grouped.high.forEach((d, index) => {
        const location = d.field ? `${d.table}.${d.field}` : d.table;
        console.log(`  ${index + 1}. ${location}: ${d.message}`);
      });
    }

    if (grouped.medium?.length > 0) {
      console.log(`\n⚠️  СРЕДНИЙ ПРИОРИТЕТ (${grouped.medium.length}):`);
      grouped.medium.forEach((d, index) => {
        const location = d.field ? `${d.table}.${d.field}` : d.table;
        console.log(`  ${index + 1}. ${location}: ${d.message}`);
      });
    }

    if (grouped.low?.length > 0) {
      console.log(`\n📝 НИЗКИЙ ПРИОРИТЕТ (${grouped.low.length}):`);
      grouped.low.forEach((d, index) => {
        const location = d.field ? `${d.table}.${d.field}` : d.table;
        console.log(`  ${index + 1}. ${location}: ${d.message}`);
      });
    }
  }

  /**
   * Выводит детальную информацию о проблемных таблицах
   */
  printProblematicTables() {
    console.log(`\n📊 ДЕТАЛЬНАЯ ИНФОРМАЦИЯ О ПРОБЛЕМНЫХ ТАБЛИЦАХ:`);
    
    const problematicTables = new Set(this.discrepancies.map(d => d.table));
    
    for (const tableName of problematicTables) {
      const table = this.schemaDefinitions.get(tableName);
      const tableIssues = this.discrepancies.filter(d => d.table === tableName);
      
      console.log(`\n  📁 ${tableName.toUpperCase()}`);
      console.log(`     Полей: ${table.fields.length}, Индексов: ${table.indexes.length}`);
      console.log(`     Проблем: ${tableIssues.length}`);
      
      tableIssues.forEach(issue => {
        const severity = issue.severity === 'high' ? '🚨' : issue.severity === 'medium' ? '⚠️' : '📝';
        console.log(`       ${severity} ${issue.message}`);
      });
    }
  }

  /**
   * Выводит рекомендации
   */
  printRecommendations() {
    console.log(`\n💡 РЕКОМЕНДАЦИИ ДЛЯ T15:`);
    
    const groupedRecs = this.recommendations.reduce((acc, rec) => {
      if (!acc[rec.priority]) acc[rec.priority] = [];
      acc[rec.priority].push(rec);
      return acc;
    }, {});

    if (groupedRecs.critical?.length > 0) {
      console.log(`\n🚨 КРИТИЧЕСКИЕ ДЕЙСТВИЯ (${groupedRecs.critical.length}):`);
      groupedRecs.critical.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.action}: ${rec.description}`);
        if (rec.sql && !rec.sql.startsWith('--')) {
          console.log(`     SQL: ${rec.sql}`);
        }
      });
    }

    if (groupedRecs.medium?.length > 0) {
      console.log(`\n⚠️  СРЕДНИЙ ПРИОРИТЕТ (${groupedRecs.medium.length}):`);
      groupedRecs.medium.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.action}: ${rec.description}`);
        if (rec.sql && !rec.sql.startsWith('--')) {
          console.log(`     SQL: ${rec.sql}`);
        }
      });
    }

    if (groupedRecs.low?.length > 0) {
      console.log(`\n📝 НИЗКИЙ ПРИОРИТЕТ (${groupedRecs.low.length}):`);
      groupedRecs.low.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.action}: ${rec.description}`);
      });
    }
  }

  /**
   * Сохраняет отчет
   */
  saveReport(stats) {
    const report = {
      timestamp: new Date().toISOString(),
      task: 'T14_CORRECTED_ANALYSIS',
      statistics: stats,
      schema_definitions: Object.fromEntries(this.schemaDefinitions),
      code_usage: Object.fromEntries(this.codeUsage),
      discrepancies: this.discrepancies,
      recommendations: this.recommendations,
      summary: {
        system_health: stats.criticalIssues === 0 ? 'GOOD' : stats.criticalIssues < 5 ? 'FAIR' : 'POOR',
        readiness_for_t15: stats.criticalIssues + stats.mediumIssues < 10 ? 'READY' : 'NEEDS_WORK',
        main_concerns: this.getMainConcerns()
      }
    };

    fs.writeFileSync('T14_CORRECTED_ANALYSIS_REPORT.json', JSON.stringify(report, null, 2));
    console.log(`\n✅ Детальный отчет сохранен: T14_CORRECTED_ANALYSIS_REPORT.json`);
  }

  /**
   * Определяет основные проблемы
   */
  getMainConcerns() {
    const concerns = [];
    
    const criticalIssues = this.discrepancies.filter(d => d.severity === 'high');
    if (criticalIssues.length > 0) {
      concerns.push(`${criticalIssues.length} критических проблем`);
    }
    
    const foreignKeyIssues = this.discrepancies.filter(d => d.type === 'broken_foreign_key');
    if (foreignKeyIssues.length > 0) {
      concerns.push(`${foreignKeyIssues.length} проблем ссылочной целостности`);
    }
    
    const missingIndexes = this.discrepancies.filter(d => d.type === 'missing_critical_index');
    if (missingIndexes.length > 0) {
      concerns.push(`${missingIndexes.length} отсутствующих индексов`);
    }
    
    const unusedTables = this.discrepancies.filter(d => d.type === 'unused_table');
    if (unusedTables.length > 0) {
      concerns.push(`${unusedTables.length} неиспользуемых таблиц`);
    }
    
    return concerns.length > 0 ? concerns : ['Структура схемы в хорошем состоянии'];
  }

  /**
   * Основной метод запуска анализа
   */
  runAnalysis() {
    try {
      console.log('🚀 ЗАПУСК ИСПРАВЛЕННОГО АНАЛИЗА T14');
      
      this.analyzeSchema();
      this.checkCriticalElements();
      this.checkReferentialIntegrity();
      this.checkTableUsage();
      this.checkDataTypeConsistency();
      this.generateRecommendations();
      
      const stats = this.generateReport();
      
      console.log('\n✅ ИСПРАВЛЕННЫЙ АНАЛИЗ T14 ЗАВЕРШЕН');
      console.log(`📊 Результат: ${stats.totalTables} таблиц, ${stats.totalDiscrepancies} проблем`);
      console.log(`🎯 Состояние системы: ${stats.criticalIssues === 0 ? 'ХОРОШЕЕ' : stats.criticalIssues < 5 ? 'УДОВЛЕТВОРИТЕЛЬНОЕ' : 'ТРЕБУЕТ ВНИМАНИЯ'}`);
      
      return stats;
    } catch (error) {
      console.error('❌ Критическая ошибка в анализе T14:', error.message);
      throw error;
    }
  }
}

// Запуск анализа
async function main() {
  const analyzer = new CorrectedSchemaAnalyzer();
  analyzer.runAnalysis();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CorrectedSchemaAnalyzer };