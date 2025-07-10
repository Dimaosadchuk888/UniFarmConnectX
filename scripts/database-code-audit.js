/**
 * Полная сверка структуры базы данных и кода системы UniFarm
 * Сравнивает фактическую структуру БД с использованием в коде
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

// Структура отчета
const auditReport = {
  timestamp: new Date().toISOString(),
  database: {
    tables: {},
    missingTables: [],
    totalTables: 0
  },
  codebase: {
    entities: {},
    unmappedFields: [],
    totalEntities: 0
  },
  comparison: {
    matches: [],
    mismatches: [],
    warnings: []
  },
  criticalIssues: [],
  recommendations: []
};

// Ожидаемые таблицы согласно документации
const expectedTables = [
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

// Маппинг типов PostgreSQL -> JavaScript
const typeMapping = {
  'integer': ['number', 'int', 'integer'],
  'bigint': ['number', 'bigint'],
  'numeric': ['number', 'decimal', 'float'],
  'text': ['string', 'text'],
  'character varying': ['string', 'varchar'],
  'timestamp': ['Date', 'string', 'timestamp'],
  'timestamp with time zone': ['Date', 'string', 'timestamp'],
  'boolean': ['boolean', 'bool'],
  'json': ['object', 'any', 'json'],
  'jsonb': ['object', 'any', 'jsonb'],
  'uuid': ['string', 'uuid']
};

// Получение структуры таблицы через Supabase
async function getTableStructure(tableName) {
  try {
    // Пробуем получить одну запись для анализа структуры
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ Таблица ${tableName} не найдена или недоступна`);
      return null;
    }

    // Если есть данные, анализируем структуру
    if (data && data.length > 0) {
      const fields = Object.keys(data[0]);
      const structure = {};
      
      fields.forEach(field => {
        const value = data[0][field];
        structure[field] = {
          type: typeof value,
          nullable: value === null,
          sample: value
        };
      });
      
      return {
        exists: true,
        fields: structure,
        recordCount: data.length
      };
    }

    // Таблица существует, но пустая
    return {
      exists: true,
      fields: {},
      recordCount: 0,
      empty: true
    };

  } catch (error) {
    console.error(`Ошибка при получении структуры ${tableName}:`, error.message);
    return null;
  }
}

// Анализ кода для поиска использования полей
function analyzeCodebaseForEntity(entityName) {
  const codeUsage = {
    files: [],
    fields: new Set(),
    types: {},
    services: [],
    controllers: []
  };

  const modulesPath = path.join(__dirname, '..', 'modules');
  const modules = fs.readdirSync(modulesPath);

  modules.forEach(module => {
    const modulePath = path.join(modulesPath, module);
    if (!fs.statSync(modulePath).isDirectory()) return;

    const files = fs.readdirSync(modulePath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    
    files.forEach(file => {
      const filePath = path.join(modulePath, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Поиск упоминаний таблицы
      const tableRegex = new RegExp(`['"\`]${entityName}['"\`]`, 'gi');
      if (tableRegex.test(content)) {
        codeUsage.files.push(`modules/${module}/${file}`);

        // Анализ сервисов
        if (file.includes('service')) {
          codeUsage.services.push(`${module}/service`);
          
          // Поиск полей в SQL запросах и объектах
          const fieldPatterns = [
            // Supabase select patterns
            /\.select\(['"`]([^'"`]+)['"`]\)/g,
            /\.select\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
            // Object field access
            new RegExp(`${entityName}\\.(\\w+)`, 'g'),
            // Insert/Update patterns
            /\.insert\(\{([^}]+)\}\)/g,
            /\.update\(\{([^}]+)\}\)/g
          ];

          fieldPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
              const fields = match[1].split(',').map(f => f.trim());
              fields.forEach(field => {
                // Очистка от кавычек и пробелов
                const cleanField = field.replace(/['"`\s]/g, '').split(':')[0];
                if (cleanField && !cleanField.includes('*')) {
                  codeUsage.fields.add(cleanField);
                }
              });
            }
          });
        }

        // Анализ контроллеров
        if (file.includes('controller')) {
          codeUsage.controllers.push(`${module}/controller`);
        }

        // Анализ типов
        if (file.includes('type') || file.includes('model')) {
          const interfaceRegex = new RegExp(`interface\\s+\\w*${entityName}\\w*\\s*\\{([^}]+)\\}`, 'gis');
          const typeRegex = new RegExp(`type\\s+\\w*${entityName}\\w*\\s*=\\s*\\{([^}]+)\\}`, 'gis');
          
          [interfaceRegex, typeRegex].forEach(regex => {
            let match;
            while ((match = regex.exec(content)) !== null) {
              const typeContent = match[1];
              const fieldMatches = typeContent.match(/(\w+)\s*[?:]?\s*([^;,\n]+)/g);
              
              if (fieldMatches) {
                fieldMatches.forEach(fieldMatch => {
                  const [fieldName, fieldType] = fieldMatch.split(/[?:]/).map(s => s.trim());
                  if (fieldName && fieldType) {
                    codeUsage.fields.add(fieldName);
                    codeUsage.types[fieldName] = fieldType;
                  }
                });
              }
            }
          });
        }
      }
    });
  });

  return codeUsage;
}

// Сравнение структур
function compareStructures(dbStructure, codeUsage, tableName) {
  const comparison = {
    entity: tableName,
    status: 'unknown',
    issues: [],
    warnings: []
  };

  if (!dbStructure || !dbStructure.exists) {
    comparison.status = 'missing_in_db';
    comparison.issues.push({
      type: 'ERROR',
      message: `Таблица ${tableName} отсутствует в БД, но используется в коде`,
      files: codeUsage.files
    });
    return comparison;
  }

  if (codeUsage.files.length === 0) {
    comparison.status = 'unused';
    comparison.warnings.push({
      type: 'WARN',
      message: `Таблица ${tableName} существует в БД, но не используется в коде`
    });
    return comparison;
  }

  // Сравнение полей
  const dbFields = Object.keys(dbStructure.fields);
  const codeFields = Array.from(codeUsage.fields);

  // Поля в коде, но не в БД
  const missingInDb = codeFields.filter(field => !dbFields.includes(field));
  if (missingInDb.length > 0) {
    comparison.issues.push({
      type: 'ERROR',
      message: `Поля используются в коде, но отсутствуют в БД`,
      fields: missingInDb,
      files: codeUsage.files
    });
  }

  // Поля в БД, но не в коде
  const unusedInCode = dbFields.filter(field => !codeFields.includes(field) && !['id', 'created_at', 'updated_at'].includes(field));
  if (unusedInCode.length > 0) {
    comparison.warnings.push({
      type: 'WARN',
      message: `Поля существуют в БД, но не используются в коде`,
      fields: unusedInCode
    });
  }

  // Проверка типов (если есть информация)
  Object.entries(codeUsage.types).forEach(([field, codeType]) => {
    if (dbStructure.fields[field]) {
      const dbType = dbStructure.fields[field].type;
      const mappedTypes = typeMapping[dbType] || [dbType];
      
      if (!mappedTypes.some(t => codeType.toLowerCase().includes(t))) {
        comparison.warnings.push({
          type: 'WARN',
          message: `Несоответствие типов для поля ${field}`,
          dbType,
          codeType
        });
      }
    }
  });

  comparison.status = comparison.issues.length > 0 ? 'has_errors' : 'ok';
  return comparison;
}

// Основная функция аудита
async function runDatabaseCodeAudit() {
  console.log('🔍 Начинаем полную сверку структуры БД и кода...\n');

  // Этап 1: Анализ базы данных
  console.log('📊 ЭТАП 1: Анализ структуры базы данных');
  console.log('=' .repeat(50));

  for (const tableName of expectedTables) {
    process.stdout.write(`Проверяем таблицу ${tableName}... `);
    const structure = await getTableStructure(tableName);
    
    if (structure) {
      auditReport.database.tables[tableName] = structure;
      auditReport.database.totalTables++;
      console.log('✅');
    } else {
      auditReport.database.missingTables.push(tableName);
      console.log('❌');
    }
    
    // Небольшая пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Этап 2: Анализ кода
  console.log('\n📝 ЭТАП 2: Анализ использования в коде');
  console.log('=' .repeat(50));

  for (const tableName of expectedTables) {
    process.stdout.write(`Анализируем код для ${tableName}... `);
    const codeUsage = analyzeCodebaseForEntity(tableName);
    auditReport.codebase.entities[tableName] = codeUsage;
    if (codeUsage.files.length > 0) {
      auditReport.codebase.totalEntities++;
    }
    console.log(`найдено ${codeUsage.files.length} файлов`);
  }

  // Этап 3: Сравнение
  console.log('\n🔎 ЭТАП 3: Сравнение структур');
  console.log('=' .repeat(50));

  for (const tableName of expectedTables) {
    const dbStructure = auditReport.database.tables[tableName];
    const codeUsage = auditReport.codebase.entities[tableName];
    const comparison = compareStructures(dbStructure, codeUsage, tableName);
    
    if (comparison.status === 'ok') {
      auditReport.comparison.matches.push(comparison);
      console.log(`✅ ${tableName}: Полное соответствие`);
    } else if (comparison.issues.length > 0) {
      auditReport.comparison.mismatches.push(comparison);
      auditReport.criticalIssues.push(...comparison.issues);
      console.log(`❌ ${tableName}: ${comparison.issues.length} критических проблем`);
    } else if (comparison.warnings.length > 0) {
      auditReport.comparison.warnings.push(comparison);
      console.log(`⚠️  ${tableName}: ${comparison.warnings.length} предупреждений`);
    }
  }

  // Генерация рекомендаций
  generateRecommendations();

  // Вывод результатов
  printResults();

  // Сохранение отчета
  saveReport();
}

// Генерация рекомендаций
function generateRecommendations() {
  if (auditReport.database.missingTables.length > 0) {
    auditReport.recommendations.push({
      priority: 'CRITICAL',
      action: 'CREATE_MISSING_TABLES',
      description: 'Создать отсутствующие таблицы в базе данных',
      tables: auditReport.database.missingTables,
      sqlScript: 'scripts/supabase-create-remaining-tables.sql'
    });
  }

  auditReport.comparison.mismatches.forEach(mismatch => {
    mismatch.issues.forEach(issue => {
      if (issue.type === 'ERROR' && issue.fields) {
        auditReport.recommendations.push({
          priority: 'HIGH',
          action: 'ADD_MISSING_FIELDS',
          description: `Добавить отсутствующие поля в таблицу ${mismatch.entity}`,
          table: mismatch.entity,
          fields: issue.fields
        });
      }
    });
  });

  const unusedTables = auditReport.comparison.warnings
    .filter(w => w.status === 'unused')
    .map(w => w.entity);
    
  if (unusedTables.length > 0) {
    auditReport.recommendations.push({
      priority: 'LOW',
      action: 'REVIEW_UNUSED_TABLES',
      description: 'Проверить необходимость неиспользуемых таблиц',
      tables: unusedTables
    });
  }
}

// Вывод результатов
function printResults() {
  console.log('\n\n' + '='.repeat(60));
  console.log('📋 ИТОГОВЫЙ ОТЧЕТ СВЕРКИ БД И КОДА');
  console.log('='.repeat(60));

  auditReport.comparison.matches.forEach(match => {
    console.log(`\n✅ Сущность: ${match.entity}`);
    console.log('  - [OK] Все поля соответствуют');
  });

  auditReport.comparison.mismatches.forEach(mismatch => {
    console.log(`\n⚠️ Сущность: ${mismatch.entity}`);
    mismatch.issues.forEach(issue => {
      console.log(`  - [ERROR] ${issue.message}`);
      if (issue.fields) {
        console.log(`    Поля: ${issue.fields.join(', ')}`);
      }
    });
    mismatch.warnings.forEach(warning => {
      console.log(`  - [WARN] ${warning.message}`);
      if (warning.fields) {
        console.log(`    Поля: ${warning.fields.join(', ')}`);
      }
    });
  });

  auditReport.comparison.warnings.forEach(warning => {
    if (warning.status !== 'unused') {
      console.log(`\n⚠️ Сущность: ${warning.entity}`);
      warning.warnings.forEach(w => {
        console.log(`  - [WARN] ${w.message}`);
        if (w.fields) {
          console.log(`    Поля: ${w.fields.join(', ')}`);
        }
      });
    }
  });

  console.log('\n\n📊 СТАТИСТИКА:');
  console.log(`Таблиц в БД: ${auditReport.database.totalTables}/${expectedTables.length}`);
  console.log(`Используется в коде: ${auditReport.codebase.totalEntities}/${expectedTables.length}`);
  console.log(`Полных соответствий: ${auditReport.comparison.matches.length}`);
  console.log(`Критических проблем: ${auditReport.criticalIssues.length}`);
  console.log(`Предупреждений: ${auditReport.comparison.warnings.length}`);

  const completeness = Math.round((auditReport.comparison.matches.length / expectedTables.length) * 100);
  console.log(`\n🎯 Уровень соответствия: ${completeness}%`);
}

// Сохранение отчета
function saveReport() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, '..', 'docs', `DATABASE_CODE_AUDIT_${timestamp}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2));
  console.log(`\n📄 Детальный отчет сохранен: ${reportPath}`);

  // Создание markdown версии
  const markdownReport = generateMarkdownReport();
  const mdPath = path.join(__dirname, '..', 'docs', `DATABASE_CODE_AUDIT_${timestamp}.md`);
  fs.writeFileSync(mdPath, markdownReport);
  console.log(`📄 Markdown отчет сохранен: ${mdPath}`);
}

// Генерация Markdown отчета
function generateMarkdownReport() {
  let md = `# Отчет полной сверки структуры БД и кода UniFarm\n\n`;
  md += `**Дата:** ${auditReport.timestamp}\n\n`;
  
  md += `## 📊 Общая статистика\n\n`;
  md += `- **Таблиц в БД:** ${auditReport.database.totalTables}/${expectedTables.length}\n`;
  md += `- **Используется в коде:** ${auditReport.codebase.totalEntities}/${expectedTables.length}\n`;
  md += `- **Полных соответствий:** ${auditReport.comparison.matches.length}\n`;
  md += `- **Критических проблем:** ${auditReport.criticalIssues.length}\n`;
  md += `- **Предупреждений:** ${auditReport.comparison.warnings.length}\n\n`;

  md += `## ✅ Сущности с полным соответствием\n\n`;
  auditReport.comparison.matches.forEach(match => {
    md += `- **${match.entity}** - все поля соответствуют\n`;
  });

  if (auditReport.comparison.mismatches.length > 0) {
    md += `\n## ❌ Критические несоответствия\n\n`;
    auditReport.comparison.mismatches.forEach(mismatch => {
      md += `### ${mismatch.entity}\n\n`;
      mismatch.issues.forEach(issue => {
        md += `- **[ERROR]** ${issue.message}\n`;
        if (issue.fields) {
          md += `  - Поля: \`${issue.fields.join('`, `')}\`\n`;
        }
        if (issue.files) {
          md += `  - Файлы: ${issue.files.join(', ')}\n`;
        }
      });
      md += '\n';
    });
  }

  if (auditReport.recommendations.length > 0) {
    md += `## 🔧 Рекомендации\n\n`;
    auditReport.recommendations.forEach(rec => {
      md += `### ${rec.priority}: ${rec.action}\n`;
      md += `${rec.description}\n\n`;
      if (rec.tables) {
        md += `Таблицы: \`${rec.tables.join('`, `')}\`\n\n`;
      }
      if (rec.fields) {
        md += `Поля: \`${rec.fields.join('`, `')}\`\n\n`;
      }
    });
  }

  return md;
}

// Запуск аудита
runDatabaseCodeAudit()
  .then(() => {
    console.log('\n✅ Аудит завершен успешно!');
  })
  .catch(error => {
    console.error('\n❌ Ошибка при выполнении аудита:', error.message);
    process.exit(1);
  });