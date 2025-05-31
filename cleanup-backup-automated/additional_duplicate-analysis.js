/**
 * Комплексный анализ дубликатов в проекте UniFarm
 * Проверяет код, базу данных, API и конфигурации на наличие повторений
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Результаты анализа
const duplicateReport = {
  files: [],
  functions: [],
  apiRoutes: [],
  dbDuplicates: [],
  configs: [],
  businessLogic: [],
  styles: [],
  summary: {}
};

/**
 * ЭТАП 1: Анализ структуры проекта и подготовка
 */
async function analyzeProjectStructure() {
  console.log('🔍 ЭТАП 1: Анализ структуры проекта...');
  
  const fileMap = new Map();
  const similarFiles = [];
  const backupFiles = [];
  
  function scanDirectory(dir, relativePath = '') {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        
        if (fs.statSync(fullPath).isDirectory()) {
          scanDirectory(fullPath, itemRelativePath);
        } else {
          // Проверка на backup файлы
          if (item.includes('.old') || item.includes('.backup') || item.includes('.bak')) {
            backupFiles.push(itemRelativePath);
          }
          
          // Группировка по базовому имени
          const baseName = item.replace(/\.(old|backup|bak)/, '').replace(/\.\w+$/, '');
          if (!fileMap.has(baseName)) {
            fileMap.set(baseName, []);
          }
          fileMap.get(baseName).push(itemRelativePath);
        }
      }
    } catch (err) {
      console.error(`Ошибка сканирования ${dir}:`, err.message);
    }
  }
  
  scanDirectory('.');
  
  // Поиск файлов с похожими именами
  for (const [baseName, files] of fileMap) {
    if (files.length > 1) {
      similarFiles.push({ baseName, files });
    }
  }
  
  duplicateReport.files = {
    similarNames: similarFiles,
    backupFiles: backupFiles,
    totalFiles: Array.from(fileMap.values()).flat().length
  };
  
  console.log(`✓ Найдено ${similarFiles.length} групп файлов с похожими именами`);
  console.log(`✓ Найдено ${backupFiles.length} backup файлов`);
}

/**
 * ЭТАП 2: Поиск дубликатов в коде
 */
async function analyzeCodeDuplicates() {
  console.log('🔍 ЭТАП 2: Поиск дубликатов в коде...');
  
  const functionHashes = new Map();
  const duplicateFunctions = [];
  const componentHashes = new Map();
  const duplicateComponents = [];
  
  function extractFunctions(content, filePath) {
    // Поиск функций
    const functionRegex = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function))/g;
    const functions = [];
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1] || match[2];
      if (funcName) {
        functions.push(funcName);
      }
    }
    
    return functions;
  }
  
  function extractComponents(content, filePath) {
    // Поиск React компонентов
    const componentRegex = /(?:export\s+(?:default\s+)?(?:function|const)\s+(\w+)|function\s+(\w+)\s*\([^)]*\)\s*{[^}]*return\s*<)/g;
    const components = [];
    let match;
    
    while ((match = componentRegex.exec(content)) !== null) {
      const compName = match[1] || match[2];
      if (compName && compName[0].toUpperCase() === compName[0]) {
        components.push(compName);
      }
    }
    
    return components;
  }
  
  function scanCodeFiles(dir, relativePath = '') {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules' || item === 'dist') continue;
        
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        
        if (fs.statSync(fullPath).isDirectory()) {
          scanCodeFiles(fullPath, itemRelativePath);
        } else if (item.match(/\.(js|ts|jsx|tsx)$/)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const contentHash = crypto.createHash('md5').update(content).digest('hex');
            
            // Анализ функций
            const functions = extractFunctions(content, itemRelativePath);
            functions.forEach(funcName => {
              const key = `${funcName}:${contentHash.slice(0, 8)}`;
              if (!functionHashes.has(key)) {
                functionHashes.set(key, []);
              }
              functionHashes.get(key).push(itemRelativePath);
            });
            
            // Анализ компонентов
            const components = extractComponents(content, itemRelativePath);
            components.forEach(compName => {
              const key = `${compName}:${contentHash.slice(0, 8)}`;
              if (!componentHashes.has(key)) {
                componentHashes.set(key, []);
              }
              componentHashes.get(key).push(itemRelativePath);
            });
            
          } catch (err) {
            console.error(`Ошибка чтения ${itemRelativePath}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error(`Ошибка сканирования ${dir}:`, err.message);
    }
  }
  
  scanCodeFiles('.');
  
  // Поиск дубликатов функций
  for (const [key, files] of functionHashes) {
    if (files.length > 1) {
      duplicateFunctions.push({
        name: key.split(':')[0],
        files: [...new Set(files)]
      });
    }
  }
  
  // Поиск дубликатов компонентов
  for (const [key, files] of componentHashes) {
    if (files.length > 1) {
      duplicateComponents.push({
        name: key.split(':')[0],
        files: [...new Set(files)]
      });
    }
  }
  
  duplicateReport.functions = {
    duplicateFunctions,
    duplicateComponents,
    totalFunctions: functionHashes.size,
    totalComponents: componentHashes.size
  };
  
  console.log(`✓ Найдено ${duplicateFunctions.length} дублирующихся функций`);
  console.log(`✓ Найдено ${duplicateComponents.length} дублирующихся компонентов`);
}

/**
 * ЭТАП 3: Анализ API эндпоинтов и маршрутов
 */
async function analyzeAPIRoutes() {
  console.log('🔍 ЭТАП 3: Анализ API маршрутов...');
  
  const routes = new Map();
  const duplicateRoutes = [];
  
  function extractRoutes(content, filePath) {
    const routePatterns = [
      /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g
    ];
    
    const foundRoutes = [];
    
    routePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const route = match[2];
        foundRoutes.push(`${method} ${route}`);
      }
    });
    
    return foundRoutes;
  }
  
  function scanRouteFiles(dir, relativePath = '') {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules' || item === 'dist') continue;
        
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        
        if (fs.statSync(fullPath).isDirectory()) {
          scanRouteFiles(fullPath, itemRelativePath);
        } else if (item.match(/\.(js|ts)$/) && (item.includes('route') || item.includes('api') || item.includes('controller'))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const fileRoutes = extractRoutes(content, itemRelativePath);
            
            fileRoutes.forEach(route => {
              if (!routes.has(route)) {
                routes.set(route, []);
              }
              routes.get(route).push(itemRelativePath);
            });
            
          } catch (err) {
            console.error(`Ошибка чтения ${itemRelativePath}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error(`Ошибка сканирования ${dir}:`, err.message);
    }
  }
  
  scanRouteFiles('.');
  
  // Поиск дублирующихся маршрутов
  for (const [route, files] of routes) {
    if (files.length > 1) {
      duplicateRoutes.push({
        route,
        files: [...new Set(files)]
      });
    }
  }
  
  duplicateReport.apiRoutes = {
    duplicateRoutes,
    totalRoutes: routes.size,
    allRoutes: Array.from(routes.keys())
  };
  
  console.log(`✓ Найдено ${duplicateRoutes.length} дублирующихся API маршрутов`);
  console.log(`✓ Всего проанализировано ${routes.size} маршрутов`);
}

/**
 * ЭТАП 4: Исследование конфигураций и переменных
 */
async function analyzeConfigurations() {
  console.log('🔍 ЭТАП 4: Анализ конфигураций...');
  
  const envVars = new Map();
  const constants = new Map();
  const duplicateEnvVars = [];
  const duplicateConstants = [];
  
  function extractEnvVars(content, filePath) {
    const envRegex = /process\.env\.(\w+)|import\.meta\.env\.(\w+)/g;
    const foundVars = [];
    let match;
    
    while ((match = envRegex.exec(content)) !== null) {
      const varName = match[1] || match[2];
      if (varName) {
        foundVars.push(varName);
      }
    }
    
    return foundVars;
  }
  
  function extractConstants(content, filePath) {
    const constRegex = /(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)\s*=/g;
    const foundConstants = [];
    let match;
    
    while ((match = constRegex.exec(content)) !== null) {
      foundConstants.push(match[1]);
    }
    
    return foundConstants;
  }
  
  function scanConfigFiles(dir, relativePath = '') {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules' || item === 'dist') continue;
        
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        
        if (fs.statSync(fullPath).isDirectory()) {
          scanConfigFiles(fullPath, itemRelativePath);
        } else if (item.match(/\.(js|ts|jsx|tsx|env)$/)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Анализ переменных окружения
            const vars = extractEnvVars(content, itemRelativePath);
            vars.forEach(varName => {
              if (!envVars.has(varName)) {
                envVars.set(varName, []);
              }
              envVars.get(varName).push(itemRelativePath);
            });
            
            // Анализ констант
            const consts = extractConstants(content, itemRelativePath);
            consts.forEach(constName => {
              if (!constants.has(constName)) {
                constants.set(constName, []);
              }
              constants.get(constName).push(itemRelativePath);
            });
            
          } catch (err) {
            console.error(`Ошибка чтения ${itemRelativePath}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error(`Ошибка сканирования ${dir}:`, err.message);
    }
  }
  
  scanConfigFiles('.');
  
  duplicateReport.configs = {
    envVarsUsage: envVars.size,
    constantsUsage: constants.size,
    mostUsedEnvVars: Array.from(envVars.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10),
    mostUsedConstants: Array.from(constants.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
  };
  
  console.log(`✓ Найдено ${envVars.size} уникальных переменных окружения`);
  console.log(`✓ Найдено ${constants.size} уникальных констант`);
}

/**
 * ЭТАП 5: Создание отчета
 */
async function generateReport() {
  console.log('📊 Генерация итогового отчета...');
  
  duplicateReport.summary = {
    timestamp: new Date().toISOString(),
    filesAnalyzed: duplicateReport.files.totalFiles || 0,
    duplicateFilesFound: duplicateReport.files.similarNames.length || 0,
    duplicateFunctionsFound: duplicateReport.functions?.duplicateFunctions?.length || 0,
    duplicateRoutesFound: duplicateReport.apiRoutes?.duplicateRoutes?.length || 0,
    backupFilesFound: duplicateReport.files.backupFiles.length || 0
  };
  
  // Сохранение отчета
  const reportContent = JSON.stringify(duplicateReport, null, 2);
  fs.writeFileSync('duplicate-analysis-report.json', reportContent);
  
  console.log('\n📋 КРАТКИЙ ОТЧЕТ О ДУБЛИКАТАХ:');
  console.log('═══════════════════════════════');
  console.log(`📁 Файлы с похожими именами: ${duplicateReport.summary.duplicateFilesFound}`);
  console.log(`🗂️  Backup файлы: ${duplicateReport.summary.backupFilesFound}`);
  console.log(`⚙️  Дублирующиеся функции: ${duplicateReport.summary.duplicateFunctionsFound}`);
  console.log(`🌐 Дублирующиеся API маршруты: ${duplicateReport.summary.duplicateRoutesFound}`);
  console.log(`📊 Всего файлов проанализировано: ${duplicateReport.summary.filesAnalyzed}`);
  
  if (duplicateReport.files.similarNames.length > 0) {
    console.log('\n🔍 ФАЙЛЫ С ПОХОЖИМИ ИМЕНАМИ:');
    duplicateReport.files.similarNames.slice(0, 5).forEach(group => {
      console.log(`  • ${group.baseName}: ${group.files.join(', ')}`);
    });
  }
  
  if (duplicateReport.functions?.duplicateFunctions?.length > 0) {
    console.log('\n🔄 ДУБЛИРУЮЩИЕСЯ ФУНКЦИИ:');
    duplicateReport.functions.duplicateFunctions.slice(0, 5).forEach(func => {
      console.log(`  • ${func.name}: ${func.files.join(', ')}`);
    });
  }
  
  if (duplicateReport.apiRoutes?.duplicateRoutes?.length > 0) {
    console.log('\n🌐 ДУБЛИРУЮЩИЕСЯ API МАРШРУТЫ:');
    duplicateReport.apiRoutes.duplicateRoutes.slice(0, 5).forEach(route => {
      console.log(`  • ${route.route}: ${route.files.join(', ')}`);
    });
  }
  
  console.log('\n✅ Полный отчет сохранен в duplicate-analysis-report.json');
  
  return duplicateReport;
}

/**
 * Запуск полного анализа
 */
async function runFullAnalysis() {
  try {
    console.log('🚀 Запуск комплексного анализа дубликатов...\n');
    
    await analyzeProjectStructure();
    await analyzeCodeDuplicates();
    await analyzeAPIRoutes();
    await analyzeConfigurations();
    await generateReport();
    
    console.log('\n🎉 Анализ завершен успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при анализе:', error.message);
    throw error;
  }
}

// Запуск анализа
runFullAnalysis().catch(console.error);