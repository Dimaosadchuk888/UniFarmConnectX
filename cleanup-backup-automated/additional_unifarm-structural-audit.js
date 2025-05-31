/**
 * Комплексный структурный аудит проекта UniFarm
 * Анализ неиспользуемых файлов, дубликатов и проблемных импортов
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Результаты аудита
const auditResults = {
  unusedFiles: [],
  duplicateFiles: [],
  deadImports: [],
  deadRoutes: [],
  conflictingFiles: [],
  summary: {}
};

// Карта всех файлов проекта
const allFiles = new Map();
const importMap = new Map(); // файл -> список импортов
const usageMap = new Map(); // файл -> список файлов, которые его используют
const routeMap = new Map(); // роуты -> файлы где определены

/**
 * Сканирование всех файлов проекта
 */
function scanProjectFiles(dir = '.', relativePath = '') {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      if (item.startsWith('.') || 
          item === 'node_modules' || 
          item === 'dist' ||
          item === 'cleanup-backup') continue;
      
      const fullPath = path.join(dir, item);
      const itemRelativePath = path.join(relativePath, item);
      
      if (fs.statSync(fullPath).isDirectory()) {
        scanProjectFiles(fullPath, itemRelativePath);
      } else {
        allFiles.set(itemRelativePath, {
          fullPath,
          size: fs.statSync(fullPath).size,
          extension: path.extname(item),
          lastModified: fs.statSync(fullPath).mtime
        });
      }
    }
  } catch (error) {
    console.error(`Ошибка сканирования ${dir}:`, error.message);
  }
}

/**
 * Анализ импортов в файле
 */
function analyzeImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = [];
    
    // Различные паттерны импортов
    const importPatterns = [
      /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g,
      /require\s*\(\s*['"`]([^'"`]+)['"`]\)/g,
      /import\s*\(\s*['"`]([^'"`]+)['"`]\)/g,
      /export\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g
    ];
    
    importPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath && !importPath.startsWith('node_modules') && 
            !importPath.startsWith('@') && !importPath.startsWith('http')) {
          imports.push({
            path: importPath,
            line: content.substring(0, match.index).split('\n').length,
            type: match[0].includes('require') ? 'require' : 'import'
          });
        }
      }
    });
    
    return imports;
  } catch (error) {
    return [];
  }
}

/**
 * Анализ роутов в файле
 */
function analyzeRoutes(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const routes = [];
    
    const routePatterns = [
      /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /\.route\s*\(\s*['"`]([^'"`]+)['"`]\)/g
    ];
    
    routePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1] || 'route';
        const route = match[2] || match[1];
        routes.push({
          method: method.toUpperCase(),
          path: route,
          line: content.substring(0, match.index).split('\n').length
        });
      }
    });
    
    return routes;
  } catch (error) {
    return [];
  }
}

/**
 * Построение карты зависимостей
 */
function buildDependencyMap() {
  console.log('🔍 Построение карты зависимостей...');
  
  for (const [filePath, fileInfo] of allFiles) {
    if (!filePath.match(/\.(js|ts|jsx|tsx|mjs|cjs)$/)) continue;
    
    const imports = analyzeImports(fileInfo.fullPath);
    importMap.set(filePath, imports);
    
    // Анализируем роуты для API файлов
    if (filePath.includes('route') || filePath.includes('api') || filePath.includes('controller')) {
      const routes = analyzeRoutes(fileInfo.fullPath);
      if (routes.length > 0) {
        routeMap.set(filePath, routes);
      }
    }
    
    // Строим обратную карту использования
    imports.forEach(imp => {
      let resolvedPath = imp.path;
      
      // Попытка разрешить относительные пути
      if (imp.path.startsWith('./') || imp.path.startsWith('../')) {
        const dir = path.dirname(filePath);
        resolvedPath = path.resolve(dir, imp.path);
        resolvedPath = path.relative('.', resolvedPath);
      }
      
      // Проверяем различные расширения
      const possiblePaths = [
        resolvedPath,
        resolvedPath + '.js',
        resolvedPath + '.ts',
        resolvedPath + '.jsx',
        resolvedPath + '.tsx',
        resolvedPath + '/index.js',
        resolvedPath + '/index.ts'
      ];
      
      for (const possiblePath of possiblePaths) {
        if (allFiles.has(possiblePath)) {
          if (!usageMap.has(possiblePath)) {
            usageMap.set(possiblePath, []);
          }
          usageMap.get(possiblePath).push(filePath);
          break;
        }
      }
    });
  }
}

/**
 * Поиск неиспользуемых файлов
 */
function findUnusedFiles() {
  console.log('🔍 Поиск неиспользуемых файлов...');
  
  // Entry points - файлы, которые точно используются
  const entryPoints = new Set([
    'package.json',
    'server/index.ts',
    'client/src/main.tsx',
    'vite.config.ts',
    'tailwind.config.ts',
    'drizzle.config.ts'
  ]);
  
  // Файлы конфигурации и документации
  const configFiles = new Set();
  const documentationFiles = new Set();
  
  for (const [filePath] of allFiles) {
    const fileName = path.basename(filePath);
    
    // Конфигурационные файлы
    if (fileName.includes('config') || 
        fileName.includes('.env') ||
        fileName.endsWith('.json') ||
        fileName.startsWith('.')) {
      configFiles.add(filePath);
    }
    
    // Документация
    if (fileName.endsWith('.md') || 
        fileName.endsWith('.txt') ||
        filePath.includes('docs/')) {
      documentationFiles.add(filePath);
    }
    
    // Проверяем неиспользуемые файлы
    if (!entryPoints.has(filePath) && 
        !usageMap.has(filePath) && 
        !configFiles.has(filePath) &&
        filePath.match(/\.(js|ts|jsx|tsx)$/)) {
      
      auditResults.unusedFiles.push({
        path: filePath,
        type: 'неиспользуется',
        comment: 'Файл не импортируется ни в одном месте проекта',
        size: allFiles.get(filePath).size
      });
    }
  }
}

/**
 * Поиск дублирующихся файлов
 */
function findDuplicateFiles() {
  console.log('🔍 Поиск дублирующихся файлов...');
  
  const fileGroups = new Map();
  
  // Группируем файлы по базовому имени
  for (const [filePath] of allFiles) {
    const baseName = path.basename(filePath, path.extname(filePath));
    
    if (!fileGroups.has(baseName)) {
      fileGroups.set(baseName, []);
    }
    fileGroups.get(baseName).push(filePath);
  }
  
  // Ищем группы с несколькими файлами
  for (const [baseName, files] of fileGroups) {
    if (files.length > 1) {
      // Проверяем содержимое файлов
      const contents = new Map();
      
      files.forEach(file => {
        try {
          if (allFiles.get(file).extension.match(/\.(js|ts|jsx|tsx|md|txt)$/)) {
            const content = fs.readFileSync(file, 'utf8');
            const hash = require('crypto').createHash('md5').update(content).digest('hex');
            
            if (!contents.has(hash)) {
              contents.set(hash, []);
            }
            contents.get(hash).push(file);
          }
        } catch (error) {
          // Игнорируем ошибки чтения
        }
      });
      
      // Если есть файлы с одинаковым содержимым
      for (const [hash, duplicateFiles] of contents) {
        if (duplicateFiles.length > 1) {
          auditResults.duplicateFiles.push({
            path: duplicateFiles.join(', '),
            type: 'дубликат',
            comment: `Файлы с одинаковым содержимым: ${baseName}`,
            files: duplicateFiles
          });
        }
      }
    }
  }
}

/**
 * Поиск мертвых импортов
 */
function findDeadImports() {
  console.log('🔍 Поиск мертвых импортов...');
  
  for (const [filePath, imports] of importMap) {
    imports.forEach(imp => {
      let found = false;
      const possiblePaths = [
        imp.path,
        imp.path + '.js',
        imp.path + '.ts',
        imp.path + '.jsx',
        imp.path + '.tsx'
      ];
      
      // Проверяем относительные пути
      if (imp.path.startsWith('./') || imp.path.startsWith('../')) {
        const dir = path.dirname(filePath);
        possiblePaths.forEach((p, index) => {
          const resolved = path.resolve(dir, p);
          possiblePaths[index] = path.relative('.', resolved);
        });
      }
      
      for (const possiblePath of possiblePaths) {
        if (allFiles.has(possiblePath)) {
          found = true;
          break;
        }
      }
      
      if (!found && !imp.path.startsWith('node_modules')) {
        auditResults.deadImports.push({
          path: filePath,
          type: 'мёртвый импорт',
          comment: `Не найден импорт: ${imp.path} (строка ${imp.line})`,
          importPath: imp.path,
          line: imp.line
        });
      }
    });
  }
}

/**
 * Поиск мертвых роутов
 */
function findDeadRoutes() {
  console.log('🔍 Анализ API роутов...');
  
  // Собираем все определенные роуты
  const allRoutes = new Map();
  
  for (const [filePath, routes] of routeMap) {
    routes.forEach(route => {
      const routeKey = `${route.method} ${route.path}`;
      if (!allRoutes.has(routeKey)) {
        allRoutes.set(routeKey, []);
      }
      allRoutes.get(routeKey).push({
        file: filePath,
        line: route.line
      });
    });
  }
  
  // Ищем дублирующиеся роуты
  for (const [routeKey, definitions] of allRoutes) {
    if (definitions.length > 1) {
      auditResults.deadRoutes.push({
        path: definitions.map(d => d.file).join(', '),
        type: 'дублирующий роут',
        comment: `Роут ${routeKey} определен в ${definitions.length} файлах`,
        route: routeKey,
        definitions
      });
    }
  }
}

/**
 * Генерация отчета
 */
function generateAuditReport() {
  console.log('📊 Генерация отчета аудита...');
  
  auditResults.summary = {
    timestamp: new Date().toISOString(),
    totalFiles: allFiles.size,
    unusedFilesCount: auditResults.unusedFiles.length,
    duplicateGroupsCount: auditResults.duplicateFiles.length,
    deadImportsCount: auditResults.deadImports.length,
    deadRoutesCount: auditResults.deadRoutes.length
  };
  
  // Сохраняем подробный отчет
  fs.writeFileSync('unifarm-structural-audit-report.json', JSON.stringify(auditResults, null, 2));
  
  console.log('\n📋 ОТЧЕТ СТРУКТУРНОГО АУДИТА UNIFARM');
  console.log('════════════════════════════════════════');
  console.log(`📁 Всего файлов проанализировано: ${auditResults.summary.totalFiles}`);
  console.log(`🗑️  Неиспользуемых файлов: ${auditResults.summary.unusedFilesCount}`);
  console.log(`📋 Групп дубликатов: ${auditResults.summary.duplicateGroupsCount}`);
  console.log(`❌ Мертвых импортов: ${auditResults.summary.deadImportsCount}`);
  console.log(`🔄 Дублирующихся роутов: ${auditResults.summary.deadRoutesCount}`);
  
  // Показываем критичные проблемы
  if (auditResults.unusedFiles.length > 0) {
    console.log('\n🗑️  НЕИСПОЛЬЗУЕМЫЕ ФАЙЛЫ (первые 10):');
    auditResults.unusedFiles.slice(0, 10).forEach(file => {
      console.log(`  📁 ${file.path}`);
      console.log(`     🗂 ${file.type} - ${file.comment}`);
    });
  }
  
  if (auditResults.duplicateFiles.length > 0) {
    console.log('\n📋 ДУБЛИРУЮЩИЕСЯ ФАЙЛЫ:');
    auditResults.duplicateFiles.forEach(dup => {
      console.log(`  📁 ${dup.path}`);
      console.log(`     🗂 ${dup.type} - ${dup.comment}`);
    });
  }
  
  if (auditResults.deadImports.length > 0) {
    console.log('\n❌ МЕРТВЫЕ ИМПОРТЫ (первые 10):');
    auditResults.deadImports.slice(0, 10).forEach(imp => {
      console.log(`  📁 ${imp.path}`);
      console.log(`     🗂 ${imp.type} - ${imp.comment}`);
    });
  }
  
  if (auditResults.deadRoutes.length > 0) {
    console.log('\n🔄 ДУБЛИРУЮЩИЕСЯ РОУТЫ:');
    auditResults.deadRoutes.forEach(route => {
      console.log(`  📁 ${route.path}`);
      console.log(`     🗂 ${route.type} - ${route.comment}`);
    });
  }
  
  console.log('\n✅ Полный отчет сохранен в unifarm-structural-audit-report.json');
}

/**
 * Основная функция аудита
 */
async function runStructuralAudit() {
  console.log('🔍 Запуск структурного аудита проекта UniFarm...\n');
  
  try {
    scanProjectFiles();
    console.log(`✅ Проанализировано ${allFiles.size} файлов`);
    
    buildDependencyMap();
    console.log(`✅ Построена карта зависимостей`);
    
    findUnusedFiles();
    findDuplicateFiles();
    findDeadImports();
    findDeadRoutes();
    
    generateAuditReport();
    
    console.log('\n🎉 Структурный аудит завершен успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при проведении аудита:', error.message);
    throw error;
  }
}

// Запуск аудита
runStructuralAudit().catch(console.error);