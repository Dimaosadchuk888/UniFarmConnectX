/**
 * Углубленный анализ соответствия БД и кода с учетом реальной структуры
 * Анализирует фактическое использование полей в контексте таблиц
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Инициализация Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_KEY не найден в переменных окружения');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Детальный отчет
const detailedReport = {
  timestamp: new Date().toISOString(),
  database: {
    tables: {}
  },
  codeAnalysis: {
    modules: {},
    fieldUsage: {}
  },
  comparison: {},
  summary: {
    perfectMatches: [],
    partialMatches: [],
    criticalIssues: [],
    recommendations: []
  }
};

// Получение реальной структуры таблицы из БД
async function getActualTableSchema(tableName) {
  try {
    // Получаем все записи для анализа полной структуры
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*')
      .limit(5); // Берем несколько записей для более точного анализа

    if (error) {
      return { exists: false, error: error.message };
    }

    const schema = {
      exists: true,
      recordCount: count || 0,
      fields: {}
    };

    // Анализируем структуру по нескольким записям
    if (data && data.length > 0) {
      // Собираем все поля из всех записей
      const allFields = new Set();
      data.forEach(record => {
        Object.keys(record).forEach(field => allFields.add(field));
      });

      // Анализируем типы и значения
      allFields.forEach(field => {
        const values = data.map(record => record[field]).filter(v => v !== null);
        schema.fields[field] = {
          exists: true,
          nullable: data.some(record => record[field] === null),
          types: [...new Set(values.map(v => typeof v))],
          samples: values.slice(0, 3)
        };
      });
    }

    return schema;
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

// Анализ использования полей в конкретном файле
function analyzeFieldUsageInFile(filePath, tableName) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const usage = {
    fields: new Set(),
    operations: [],
    context: []
  };

  // Паттерны для поиска использования таблицы
  const patterns = [
    // Supabase queries
    {
      regex: new RegExp(`supabase\\s*\\.\\s*from\\s*\\(\\s*['"\`]${tableName}['"\`]\\s*\\)([^;]+);`, 'gis'),
      type: 'supabase_query'
    },
    // Direct table references
    {
      regex: new RegExp(`['"\`]${tableName}['"\`]\\s*\\.\\s*(\\w+)`, 'g'),
      type: 'direct_reference'
    },
    // SQL queries
    {
      regex: new RegExp(`(SELECT|INSERT|UPDATE|DELETE)[^;]*\\b${tableName}\\b[^;]*;`, 'gis'),
      type: 'sql_query'
    }
  ];

  patterns.forEach(({ regex, type }) => {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const queryContext = match[0];
      usage.operations.push({ type, context: queryContext.substring(0, 200) });

      // Извлекаем поля из контекста запроса
      if (type === 'supabase_query') {
        // Поиск select полей
        const selectMatch = queryContext.match(/\.select\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (selectMatch) {
          const fields = selectMatch[1].split(',').map(f => f.trim());
          fields.forEach(field => {
            if (field && field !== '*') {
              usage.fields.add(field);
            }
          });
        }

        // Поиск insert/update полей
        const insertMatch = queryContext.match(/\.(insert|update)\s*\(\s*\{([^}]+)\}/);
        if (insertMatch) {
          const fieldsContent = insertMatch[2];
          const fieldMatches = fieldsContent.match(/(\w+)\s*:/g);
          if (fieldMatches) {
            fieldMatches.forEach(fm => {
              const fieldName = fm.replace(':', '').trim();
              usage.fields.add(fieldName);
            });
          }
        }

        // Поиск eq/filter полей
        const filterMatches = queryContext.matchAll(/\.(eq|neq|gt|gte|lt|lte|like|ilike|in|contains)\s*\(\s*['"`](\w+)['"`]/g);
        for (const fm of filterMatches) {
          usage.fields.add(fm[2]);
        }
      }
    }
  });

  return usage;
}

// Анализ модуля для конкретной таблицы
function analyzeModuleForTable(modulePath, moduleName, tableName) {
  const analysis = {
    module: moduleName,
    files: {},
    totalFields: new Set(),
    operations: []
  };

  if (!fs.existsSync(modulePath)) return analysis;

  const files = fs.readdirSync(modulePath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  
  files.forEach(file => {
    const filePath = path.join(modulePath, file);
    const usage = analyzeFieldUsageInFile(filePath, tableName);
    
    if (usage.fields.size > 0 || usage.operations.length > 0) {
      analysis.files[file] = usage;
      usage.fields.forEach(field => analysis.totalFields.add(field));
      analysis.operations.push(...usage.operations);
    }
  });

  return analysis;
}

// Основная функция глубокого анализа
async function runDeepAnalysis() {
  console.log('🔬 Начинаем углубленный анализ БД и кода UniFarm...\n');

  const tables = [
    'users',
    'transactions', 
    'referrals',
    'farming_sessions',
    'user_sessions',
    'boost_purchases',
    'missions',
    'user_missions',
    'airdrops',
    'daily_bonus_logs',
    'withdraw_requests'
  ];

  // Этап 1: Получение реальной структуры БД
  console.log('📊 ЭТАП 1: Анализ реальной структуры базы данных');
  console.log('=' .repeat(60));

  for (const table of tables) {
    process.stdout.write(`Анализируем структуру ${table}... `);
    const schema = await getActualTableSchema(table);
    detailedReport.database.tables[table] = schema;
    
    if (schema.exists) {
      const fieldCount = Object.keys(schema.fields).length;
      console.log(`✅ ${fieldCount} полей, ${schema.recordCount} записей`);
    } else {
      console.log('❌ не найдена');
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Этап 2: Анализ использования в коде
  console.log('\n📝 ЭТАП 2: Анализ использования таблиц в коде');
  console.log('=' .repeat(60));

  const modulesPath = path.join(__dirname, '..', 'modules');
  const modules = fs.readdirSync(modulesPath).filter(m => 
    fs.statSync(path.join(modulesPath, m)).isDirectory()
  );

  for (const table of tables) {
    console.log(`\nАнализируем использование таблицы "${table}":`);
    detailedReport.codeAnalysis.fieldUsage[table] = {
      modules: {},
      allFields: new Set(),
      totalOperations: 0
    };

    for (const module of modules) {
      const modulePath = path.join(modulesPath, module);
      const moduleAnalysis = analyzeModuleForTable(modulePath, module, table);
      
      if (moduleAnalysis.totalFields.size > 0) {
        detailedReport.codeAnalysis.fieldUsage[table].modules[module] = moduleAnalysis;
        moduleAnalysis.totalFields.forEach(field => 
          detailedReport.codeAnalysis.fieldUsage[table].allFields.add(field)
        );
        detailedReport.codeAnalysis.fieldUsage[table].totalOperations += moduleAnalysis.operations.length;
        
        console.log(`  ✓ ${module}: ${moduleAnalysis.totalFields.size} полей, ${moduleAnalysis.operations.length} операций`);
      }
    }
  }

  // Этап 3: Сравнение и анализ
  console.log('\n🔎 ЭТАП 3: Детальное сравнение структур');
  console.log('=' .repeat(60));

  for (const table of tables) {
    const dbSchema = detailedReport.database.tables[table];
    const codeUsage = detailedReport.codeAnalysis.fieldUsage[table];
    
    const comparison = {
      table,
      status: 'unknown',
      dbFields: dbSchema.exists ? Object.keys(dbSchema.fields) : [],
      codeFields: Array.from(codeUsage.allFields),
      analysis: {
        inDbOnly: [],
        inCodeOnly: [],
        inBoth: [],
        issues: [],
        warnings: []
      }
    };

    if (!dbSchema.exists) {
      comparison.status = 'table_missing';
      comparison.analysis.issues.push({
        severity: 'CRITICAL',
        message: `Таблица ${table} отсутствует в БД, но используется в ${Object.keys(codeUsage.modules).length} модулях`
      });
    } else if (codeUsage.allFields.size === 0) {
      comparison.status = 'unused';
      comparison.analysis.warnings.push({
        severity: 'LOW',
        message: `Таблица ${table} существует в БД, но не используется в коде`
      });
    } else {
      // Детальное сравнение полей
      comparison.dbFields.forEach(field => {
        if (codeUsage.allFields.has(field)) {
          comparison.analysis.inBoth.push(field);
        } else {
          // Исключаем системные поля
          if (!['id', 'created_at', 'updated_at'].includes(field)) {
            comparison.analysis.inDbOnly.push(field);
          }
        }
      });

      codeUsage.allFields.forEach(field => {
        if (!comparison.dbFields.includes(field)) {
          comparison.analysis.inCodeOnly.push(field);
        }
      });

      // Определение статуса
      if (comparison.analysis.inCodeOnly.length > 0) {
        comparison.status = 'mismatch';
        comparison.analysis.issues.push({
          severity: 'HIGH',
          message: `${comparison.analysis.inCodeOnly.length} полей используются в коде, но отсутствуют в БД`,
          fields: comparison.analysis.inCodeOnly
        });
      } else if (comparison.analysis.inDbOnly.length > 0) {
        comparison.status = 'has_warnings';
        comparison.analysis.warnings.push({
          severity: 'MEDIUM',
          message: `${comparison.analysis.inDbOnly.length} полей существуют в БД, но не используются`,
          fields: comparison.analysis.inDbOnly
        });
      } else {
        comparison.status = 'perfect_match';
      }
    }

    detailedReport.comparison[table] = comparison;

    // Вывод результата для таблицы
    const statusEmoji = {
      'perfect_match': '✅',
      'has_warnings': '⚠️',
      'mismatch': '❌',
      'table_missing': '🚫',
      'unused': '💤'
    };

    console.log(`\n${statusEmoji[comparison.status]} ${table}:`);
    if (comparison.status === 'perfect_match') {
      console.log('  Полное соответствие всех полей');
    } else {
      comparison.analysis.issues.forEach(issue => {
        console.log(`  [${issue.severity}] ${issue.message}`);
        if (issue.fields && issue.fields.length <= 5) {
          console.log(`    Поля: ${issue.fields.join(', ')}`);
        } else if (issue.fields) {
          console.log(`    Поля (${issue.fields.length}): ${issue.fields.slice(0, 5).join(', ')}...`);
        }
      });
      comparison.analysis.warnings.forEach(warning => {
        console.log(`  [${warning.severity}] ${warning.message}`);
      });
    }
  }

  // Генерация итогового отчета
  generateSummary();
  saveDetailedReport();
}

// Генерация итогового резюме
function generateSummary() {
  Object.entries(detailedReport.comparison).forEach(([table, comparison]) => {
    if (comparison.status === 'perfect_match') {
      detailedReport.summary.perfectMatches.push(table);
    } else if (comparison.status === 'has_warnings') {
      detailedReport.summary.partialMatches.push({
        table,
        warnings: comparison.analysis.warnings.length
      });
    } else if (comparison.status === 'mismatch' || comparison.status === 'table_missing') {
      detailedReport.summary.criticalIssues.push({
        table,
        issues: comparison.analysis.issues
      });
    }
  });

  // Генерация рекомендаций
  detailedReport.summary.criticalIssues.forEach(({ table, issues }) => {
    issues.forEach(issue => {
      if (issue.fields && issue.fields.length > 0) {
        detailedReport.summary.recommendations.push({
          priority: 'HIGH',
          table,
          action: 'ADD_MISSING_FIELDS',
          fields: issue.fields,
          sql: generateAddFieldsSQL(table, issue.fields)
        });
      }
    });
  });
}

// Генерация SQL для добавления полей
function generateAddFieldsSQL(table, fields) {
  const fieldDefinitions = fields.map(field => {
    // Определяем тип по имени поля
    let sqlType = 'TEXT';
    if (field.includes('_id') || field === 'id') sqlType = 'INTEGER';
    else if (field.includes('amount') || field.includes('balance')) sqlType = 'DECIMAL(20,9)';
    else if (field.includes('_at') || field.includes('timestamp')) sqlType = 'TIMESTAMP';
    else if (field.includes('is_') || field.includes('_active')) sqlType = 'BOOLEAN DEFAULT FALSE';
    
    return `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${field} ${sqlType};`;
  });

  return fieldDefinitions.join('\n');
}

// Сохранение детального отчета
function saveDetailedReport() {
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
  console.log('='.repeat(60));

  const totalTables = Object.keys(detailedReport.database.tables).length;
  const existingTables = Object.values(detailedReport.database.tables).filter(t => t.exists).length;
  const perfectMatches = detailedReport.summary.perfectMatches.length;
  const criticalIssues = detailedReport.summary.criticalIssues.length;

  console.log(`Проанализировано таблиц: ${totalTables}`);
  console.log(`Существует в БД: ${existingTables}`);
  console.log(`Полных соответствий: ${perfectMatches}`);
  console.log(`Критических проблем: ${criticalIssues}`);
  console.log(`Уровень соответствия: ${Math.round((perfectMatches / existingTables) * 100)}%`);

  // Сохранение JSON отчета
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(__dirname, '..', 'docs', `DEEP_DB_ANALYSIS_${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(detailedReport, null, 2));
  console.log(`\n📄 Детальный JSON отчет: ${jsonPath}`);

  // Создание финального Markdown отчета
  const mdReport = generateFinalMarkdownReport();
  const mdPath = path.join(__dirname, '..', 'docs', `DATABASE_CODE_SYNC_REPORT.md`);
  fs.writeFileSync(mdPath, mdReport);
  console.log(`📄 Финальный отчет: ${mdPath}`);
}

// Генерация финального Markdown отчета
function generateFinalMarkdownReport() {
  let md = `# 🧩 Отчет полной сверки структуры БД и кода UniFarm\n\n`;
  md += `**Дата проверки:** ${detailedReport.timestamp}\n\n`;
  
  md += `## 📊 Сводная статистика\n\n`;
  const totalTables = Object.keys(detailedReport.database.tables).length;
  const existingTables = Object.values(detailedReport.database.tables).filter(t => t.exists).length;
  const perfectMatches = detailedReport.summary.perfectMatches.length;
  const partialMatches = detailedReport.summary.partialMatches.length;
  const criticalIssues = detailedReport.summary.criticalIssues.length;
  
  md += `| Показатель | Значение |\n`;
  md += `|------------|----------|\n`;
  md += `| Всего таблиц для проверки | ${totalTables} |\n`;
  md += `| Существует в БД | ${existingTables} |\n`;
  md += `| Полных соответствий | ${perfectMatches} |\n`;
  md += `| Частичных соответствий | ${partialMatches} |\n`;
  md += `| Критических проблем | ${criticalIssues} |\n`;
  md += `| **Уровень соответствия** | **${Math.round((perfectMatches / existingTables) * 100)}%** |\n\n`;

  // Детальный анализ по таблицам
  md += `## 📋 Детальный анализ по сущностям\n\n`;

  // Полные соответствия
  if (detailedReport.summary.perfectMatches.length > 0) {
    md += `### ✅ Сущности с полным соответствием\n\n`;
    detailedReport.summary.perfectMatches.forEach(table => {
      const comp = detailedReport.comparison[table];
      md += `#### ${table}\n`;
      md += `- ✅ Все поля соответствуют\n`;
      md += `- Полей в БД: ${comp.dbFields.length}\n`;
      md += `- Используется в модулях: ${Object.keys(detailedReport.codeAnalysis.fieldUsage[table].modules).join(', ') || 'не используется'}\n\n`;
    });
  }

  // Критические проблемы
  if (detailedReport.summary.criticalIssues.length > 0) {
    md += `### ❌ Критические несоответствия\n\n`;
    detailedReport.summary.criticalIssues.forEach(({ table, issues }) => {
      const comp = detailedReport.comparison[table];
      md += `#### ${table}\n`;
      issues.forEach(issue => {
        md += `- **[${issue.severity}]** ${issue.message}\n`;
        if (issue.fields && issue.fields.length > 0) {
          md += `  - Поля: \`${issue.fields.join('`, `')}\`\n`;
        }
      });
      const modules = Object.keys(detailedReport.codeAnalysis.fieldUsage[table].modules);
      if (modules.length > 0) {
        md += `  - Используется в модулях: ${modules.join(', ')}\n`;
      }
      md += '\n';
    });
  }

  // Предупреждения
  if (detailedReport.summary.partialMatches.length > 0) {
    md += `### ⚠️ Частичные соответствия\n\n`;
    detailedReport.summary.partialMatches.forEach(({ table, warnings }) => {
      const comp = detailedReport.comparison[table];
      md += `#### ${table}\n`;
      comp.analysis.warnings.forEach(warning => {
        md += `- **[${warning.severity}]** ${warning.message}\n`;
        if (warning.fields && warning.fields.length > 0) {
          md += `  - Поля: \`${warning.fields.join('`, `')}\`\n`;
        }
      });
      md += '\n';
    });
  }

  // Рекомендации
  if (detailedReport.summary.recommendations.length > 0) {
    md += `## 🔧 Рекомендации по исправлению\n\n`;
    
    // Группируем по таблицам
    const recByTable = {};
    detailedReport.summary.recommendations.forEach(rec => {
      if (!recByTable[rec.table]) recByTable[rec.table] = [];
      recByTable[rec.table].push(rec);
    });

    Object.entries(recByTable).forEach(([table, recs]) => {
      md += `### Таблица: ${table}\n\n`;
      recs.forEach(rec => {
        md += `**${rec.action}** (Приоритет: ${rec.priority})\n\n`;
        md += `Добавить поля:\n`;
        md += `\`\`\`sql\n${rec.sql}\n\`\`\`\n\n`;
      });
    });
  }

  // Заключение
  md += `## 📌 Заключение\n\n`;
  if (perfectMatches === existingTables) {
    md += `✅ **Структура БД и код полностью синхронизированы!**\n\n`;
  } else {
    md += `⚠️ **Требуется синхронизация структуры БД с кодом.**\n\n`;
    md += `Необходимо:\n`;
    md += `1. Выполнить SQL скрипты для добавления недостающих полей\n`;
    md += `2. Проверить неиспользуемые поля и при необходимости удалить их\n`;
    md += `3. Обновить код для корректной работы с существующей структурой БД\n`;
  }

  return md;
}

// Запуск анализа
runDeepAnalysis()
  .then(() => {
    console.log('\n✅ Углубленный анализ завершен успешно!');
  })
  .catch(error => {
    console.error('\n❌ Ошибка при выполнении анализа:', error);
    console.error(error.stack);
    process.exit(1);
  });