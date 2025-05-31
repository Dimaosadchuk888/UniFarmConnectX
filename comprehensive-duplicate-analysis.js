
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔍 КОМПЛЕКСНЫЙ АНАЛИЗ ДУБЛИКАТОВ UNIFARM\n');
console.log('='.repeat(80));

// ЭТАП 1: АНАЛИЗ ФАЙЛОВЫХ ДУБЛИКАТОВ
console.log('\n📁 ЭТАП 1: АНАЛИЗ ФАЙЛОВЫХ ДУБЛИКАТОВ');
console.log('-'.repeat(50));

function scanDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx'], maxDepth = 10, currentDepth = 0) {
  const files = [];
  if (currentDepth >= maxDepth) return files;
  
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...scanDirectory(fullPath, extensions, maxDepth, currentDepth + 1));
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push({
            path: fullPath,
            name: item,
            dir: dir,
            ext: ext,
            size: stat.size,
            content: fs.readFileSync(fullPath, 'utf8')
          });
        }
      }
    }
  } catch (error) {
    console.log(`⚠️  Ошибка при сканировании ${dir}: ${error.message}`);
  }
  return files;
}

const allFiles = scanDirectory('.', ['.ts', '.tsx', '.js', '.jsx']);

// 1.1 Поиск файлов с суффиксами-дубликатами
const duplicateSuffixes = [
  '.bak', '.backup', '.old', '.new', '.copy', '.tmp', '.temp',
  '_1', '_2', '_copy', '-copy', '-old', '-new', '-backup',
  'Fixed', 'Consolidated', 'Instance', 'Fallback', 'Original'
];

const suspiciousFiles = allFiles.filter(file => {
  return duplicateSuffixes.some(suffix => 
    file.name.includes(suffix) || file.path.includes(suffix)
  );
});

console.log(`\n🚨 НАЙДЕНО ${suspiciousFiles.length} ФАЙЛОВ С ПОДОЗРИТЕЛЬНЫМИ СУФФИКСАМИ:`);
suspiciousFiles.forEach(file => {
  console.log(`  ${file.path}`);
});

// 1.2 Поиск идентичного содержимого
const hashGroups = {};
allFiles.forEach(file => {
  if (file.size > 100) {
    const hash = crypto.createHash('md5').update(file.content).digest('hex');
    if (!hashGroups[hash]) hashGroups[hash] = [];
    hashGroups[hash].push(file);
  }
});

const duplicatesByHash = Object.values(hashGroups).filter(group => group.length > 1);
console.log(`\n🚨 НАЙДЕНО ${duplicatesByHash.length} ГРУПП С ИДЕНТИЧНЫМ СОДЕРЖИМЫМ:`);
duplicatesByHash.forEach((group, index) => {
  console.log(`\n  Группа ${index + 1}:`);
  group.forEach(file => console.log(`    ${file.path}`));
});

// ЭТАП 2: АНАЛИЗ КОДА НА ДУБЛИКАТЫ ФУНКЦИЙ
console.log('\n\n🔧 ЭТАП 2: АНАЛИЗ ДУБЛИКАТОВ КОДА');
console.log('-'.repeat(50));

const functionPatterns = [
  /function\s+(\w+)\s*\(/g,
  /const\s+(\w+)\s*=\s*\(/g,
  /(\w+)\s*:\s*function/g,
  /async\s+function\s+(\w+)/g
];

const allFunctions = {};
allFiles.forEach(file => {
  functionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(file.content)) !== null) {
      const funcName = match[1];
      if (!allFunctions[funcName]) allFunctions[funcName] = [];
      allFunctions[funcName].push({
        file: file.path,
        name: funcName
      });
    }
  });
});

const duplicateFunctions = Object.entries(allFunctions)
  .filter(([name, locations]) => locations.length > 1)
  .filter(([name]) => !['test', 'describe', 'it', 'expect'].includes(name));

console.log(`\n🚨 НАЙДЕНО ${duplicateFunctions.length} ДУБЛИРУЮЩИХСЯ ФУНКЦИЙ:`);
duplicateFunctions.slice(0, 20).forEach(([name, locations]) => {
  console.log(`\n  Функция "${name}" (${locations.length} раз):`);
  locations.forEach(loc => console.log(`    ${loc.file}`));
});

// ЭТАП 3: АНАЛИЗ API МАРШРУТОВ
console.log('\n\n🌐 ЭТАП 3: АНАЛИЗ ДУБЛИКАТОВ API');
console.log('-'.repeat(50));

const routeFiles = allFiles.filter(f => 
  f.path.includes('route') || f.path.includes('controller') || f.content.includes('app.') || f.content.includes('router.')
);

const routes = [];
const routePatterns = [
  /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
  /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
  /\.route\s*\(\s*['"`]([^'"`]+)['"`]/g
];

routeFiles.forEach(file => {
  routePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(file.content)) !== null) {
      const method = match[1] || 'unknown';
      const route = match[2] || match[1];
      routes.push({
        method: method.toUpperCase(),
        path: route,
        file: file.path
      });
    }
  });
});

const routeGroups = {};
routes.forEach(route => {
  const key = `${route.method}:${route.path}`;
  if (!routeGroups[key]) routeGroups[key] = [];
  routeGroups[key].push(route);
});

const duplicateRoutes = Object.entries(routeGroups)
  .filter(([key, routes]) => routes.length > 1);

console.log(`\n🚨 НАЙДЕНО ${duplicateRoutes.length} ДУБЛИРУЮЩИХСЯ МАРШРУТОВ:`);
duplicateRoutes.forEach(([key, routes]) => {
  console.log(`\n  ${key}:`);
  routes.forEach(route => console.log(`    ${route.file}`));
});

// ЭТАП 4: АНАЛИЗ ПЕРЕМЕННЫХ И КОНСТАНТ
console.log('\n\n📝 ЭТАП 4: АНАЛИЗ ПЕРЕМЕННЫХ И КОНСТАНТ');
console.log('-'.repeat(50));

const variablePatterns = [
  /const\s+(\w+)\s*=/g,
  /let\s+(\w+)\s*=/g,
  /var\s+(\w+)\s*=/g
];

const allVariables = {};
allFiles.forEach(file => {
  variablePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(file.content)) !== null) {
      const varName = match[1];
      if (varName.length > 3 && varName !== 'exports' && varName !== 'module') {
        if (!allVariables[varName]) allVariables[varName] = [];
        allVariables[varName].push(file.path);
      }
    }
  });
});

const duplicateVariables = Object.entries(allVariables)
  .filter(([name, files]) => files.length > 3)
  .sort((a, b) => b[1].length - a[1].length);

console.log(`\n🚨 НАЙДЕНО ${duplicateVariables.length} ЧАСТО ПОВТОРЯЮЩИХСЯ ПЕРЕМЕННЫХ:`);
duplicateVariables.slice(0, 15).forEach(([name, files]) => {
  console.log(`  "${name}" в ${files.length} файлах`);
});

// ЭТАП 5: АНАЛИЗ ХАРДКОДА
console.log('\n\n💾 ЭТАП 5: АНАЛИЗ ХАРДКОДА');
console.log('-'.repeat(50));

const hardcodePatterns = [
  /'([^']{10,})'/g,  // Строки длиннее 10 символов
  /"([^"]{10,})"/g,  // Строки в двойных кавычках
  /\b(\d{4,})\b/g    // Числа больше 1000
];

const hardcodeValues = {};
allFiles.forEach(file => {
  hardcodePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(file.content)) !== null) {
      const value = match[1];
      if (value && !value.includes('\\') && value.length > 5) {
        if (!hardcodeValues[value]) hardcodeValues[value] = [];
        hardcodeValues[value].push(file.path);
      }
    }
  });
});

const duplicateHardcode = Object.entries(hardcodeValues)
  .filter(([value, files]) => files.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

console.log(`\n🚨 НАЙДЕНО ${duplicateHardcode.length} ДУБЛИРУЮЩИХСЯ ХАРДКОД ЗНАЧЕНИЙ:`);
duplicateHardcode.slice(0, 10).forEach(([value, files]) => {
  console.log(`  "${value}" в ${files.length} файлах`);
});

// ЭТАП 6: АНАЛИЗ СПЕЦИФИЧНЫХ ДУБЛИКАТОВ UNIFARM
console.log('\n\n🎯 ЭТАП 6: UNIFARM СПЕЦИФИЧНЫЕ ДУБЛИКАТЫ');
console.log('-'.repeat(50));

// Контроллеры
const controllers = allFiles.filter(f => f.path.includes('controller') && f.ext === '.ts');
const services = allFiles.filter(f => f.path.includes('service') && f.ext === '.ts');

console.log(`\n📊 СТАТИСТИКА ФАЙЛОВ:`);
console.log(`  Контроллеры: ${controllers.length}`);
console.log(`  Сервисы: ${services.length}`);

// Поиск похожих контроллеров
const controllerGroups = {};
controllers.forEach(controller => {
  const baseName = controller.name
    .replace(/Controller|Fixed|Consolidated|Instance|Fallback/gi, '')
    .replace(/\.ts$/, '');
  
  if (!controllerGroups[baseName]) controllerGroups[baseName] = [];
  controllerGroups[baseName].push(controller);
});

const duplicateControllers = Object.entries(controllerGroups)
  .filter(([name, controllers]) => controllers.length > 1);

console.log(`\n🚨 НАЙДЕНО ${duplicateControllers.length} ГРУПП ПОХОЖИХ КОНТРОЛЛЕРОВ:`);
duplicateControllers.forEach(([name, controllers]) => {
  console.log(`\n  Группа "${name}":`);
  controllers.forEach(c => console.log(`    ${c.path}`));
});

// Поиск похожих сервисов
const serviceGroups = {};
services.forEach(service => {
  const baseName = service.name
    .replace(/Service|Instance|Fixed|Consolidated/gi, '')
    .replace(/\.ts$/, '');
  
  if (!serviceGroups[baseName]) serviceGroups[baseName] = [];
  serviceGroups[baseName].push(service);
});

const duplicateServices = Object.entries(serviceGroups)
  .filter(([name, services]) => services.length > 1);

console.log(`\n🚨 НАЙДЕНО ${duplicateServices.length} ГРУПП ПОХОЖИХ СЕРВИСОВ:`);
duplicateServices.forEach(([name, services]) => {
  console.log(`\n  Группа "${name}":`);
  services.forEach(s => console.log(`    ${s.path}`));
});

// ИТОГОВЫЙ ОТЧЕТ
console.log('\n\n📋 ИТОГОВЫЙ ОТЧЕТ ПО ДУБЛИКАТАМ');
console.log('='.repeat(80));
console.log(`📁 Файлы с суффиксами: ${suspiciousFiles.length}`);
console.log(`📄 Группы с идентичным содержимым: ${duplicatesByHash.length}`);
console.log(`🔧 Дублирующиеся функции: ${duplicateFunctions.length}`);
console.log(`🌐 Дублирующиеся API маршруты: ${duplicateRoutes.length}`);
console.log(`📝 Часто повторяющиеся переменные: ${duplicateVariables.length}`);
console.log(`💾 Дублирующиеся хардкод значения: ${duplicateHardcode.length}`);
console.log(`🎯 Группы похожих контроллеров: ${duplicateControllers.length}`);
console.log(`🎯 Группы похожих сервисов: ${duplicateServices.length}`);

console.log('\n🎯 КРИТИЧЕСКИЕ ПРОБЛЕМЫ:');
if (duplicatesByHash.length > 0) {
  console.log(`❌ ${duplicatesByHash.length} групп с полностью идентичным кодом`);
}
if (duplicateRoutes.length > 0) {
  console.log(`❌ ${duplicateRoutes.length} конфликтующих API маршрутов`);
}
if (duplicateControllers.length > 5) {
  console.log(`❌ Слишком много дублирующихся контроллеров (${duplicateControllers.length})`);
}
if (duplicateServices.length > 5) {
  console.log(`❌ Слишком много дублирующихся сервисов (${duplicateServices.length})`);
}

console.log('\n✅ АНАЛИЗ ЗАВЕРШЕН');
