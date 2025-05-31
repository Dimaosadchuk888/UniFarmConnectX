
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔍 КОМПЛЕКСНЫЙ АНАЛИЗ ДУБЛИКАТОВ В UNIFARM\n');

// Функция для получения хеша файла
function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

// Функция рекурсивного сканирования директории
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
            hash: getFileHash(fullPath)
          });
        }
      }
    }
  } catch (error) {
    console.log(`⚠️  Ошибка при сканировании ${dir}: ${error.message}`);
  }
  
  return files;
}

// 1. ПОИСК ФАЙЛОВ С СУФФИКСАМИ-ДУБЛИКАТАМИ
console.log('📁 ЭТАП 1: Поиск файлов с суффиксами-дубликатами\n');

const duplicateSuffixes = [
  '.bak', '.backup', '.old', '.new', '.copy', '.tmp', '.temp',
  '_1', '_2', '_copy', '-copy', '-old', '-new', '-backup',
  '.ts.new', '.tsx.old', '.js.bak'
];

const allFiles = scanDirectory('.', ['.ts', '.tsx', '.js', '.jsx', '.sql', '.md']);

console.log(`Всего файлов найдено: ${allFiles.length}\n`);

// Поиск файлов с подозрительными суффиксами
const suspiciousFiles = allFiles.filter(file => {
  return duplicateSuffixes.some(suffix => 
    file.name.includes(suffix) || file.path.includes(suffix)
  );
});

if (suspiciousFiles.length > 0) {
  console.log('🚨 НАЙДЕНЫ ФАЙЛЫ С ПОДОЗРИТЕЛЬНЫМИ СУФФИКСАМИ:');
  suspiciousFiles.forEach(file => {
    console.log(`  ${file.path} (${file.size} bytes)`);
  });
} else {
  console.log('✅ Файлов с подозрительными суффиксами не найдено');
}

// 2. ПОИСК ФАЙЛОВ С ОДИНАКОВЫМ СОДЕРЖИМЫМ
console.log('\n📄 ПОИСК ФАЙЛОВ С ОДИНАКОВЫМ СОДЕРЖИМЫМ:\n');

const hashGroups = {};
allFiles.forEach(file => {
  if (file.hash && file.size > 100) { // Игнорируем очень маленькие файлы
    if (!hashGroups[file.hash]) {
      hashGroups[file.hash] = [];
    }
    hashGroups[file.hash].push(file);
  }
});

const duplicatesByHash = Object.values(hashGroups).filter(group => group.length > 1);

if (duplicatesByHash.length > 0) {
  console.log('🚨 НАЙДЕНЫ ФАЙЛЫ С ИДЕНТИЧНЫМ СОДЕРЖИМЫМ:');
  duplicatesByHash.forEach((group, index) => {
    console.log(`\n  Группа ${index + 1} (${group[0].size} bytes, хеш: ${group[0].hash.substring(0, 8)}...):`);
    group.forEach(file => {
      console.log(`    ${file.path}`);
    });
  });
} else {
  console.log('✅ Файлов с идентичным содержимым не найдено');
}

// 3. ПОИСК ПОХОЖИХ НАЗВАНИЙ ФАЙЛОВ
console.log('\n🔤 ПОИСК ФАЙЛОВ С ПОХОЖИМИ НАЗВАНИЯМИ:\n');

const fileNames = allFiles.map(f => ({
  name: f.name.replace(/\.(ts|tsx|js|jsx)$/, ''),
  fullPath: f.path
}));

const similarNames = [];
for (let i = 0; i < fileNames.length; i++) {
  for (let j = i + 1; j < fileNames.length; j++) {
    const name1 = fileNames[i].name.toLowerCase();
    const name2 = fileNames[j].name.toLowerCase();
    
    // Поиск различных вариантов похожих названий
    if (
      name1.includes(name2) || name2.includes(name1) ||
      name1.replace(/controller|service|instance|fixed|new|consolidated/, '') === 
      name2.replace(/controller|service|instance|fixed|new|consolidated/, '')
    ) {
      similarNames.push([fileNames[i], fileNames[j]]);
    }
  }
}

if (similarNames.length > 0) {
  console.log('🚨 НАЙДЕНЫ ФАЙЛЫ С ПОХОЖИМИ НАЗВАНИЯМИ:');
  similarNames.forEach(([file1, file2], index) => {
    console.log(`\n  ${index + 1}. Похожие файлы:`);
    console.log(`    ${file1.fullPath}`);
    console.log(`    ${file2.fullPath}`);
  });
} else {
  console.log('✅ Файлов с подозрительно похожими названиями не найдено');
}

// 4. АНАЛИЗ СПЕЦИФИЧНЫХ ДУБЛИКАТОВ UNIFARM
console.log('\n🎯 АНАЛИЗ СПЕЦИФИЧНЫХ ДУБЛИКАТОВ UNIFARM:\n');

const controllerFiles = allFiles.filter(f => f.path.includes('controller') && f.ext === '.ts');
const serviceFiles = allFiles.filter(f => f.path.includes('service') && f.ext === '.ts');
const routeFiles = allFiles.filter(f => f.path.includes('route') && f.ext === '.ts');

console.log(`Контроллеры найдено: ${controllerFiles.length}`);
controllerFiles.forEach(f => console.log(`  ${f.path}`));

console.log(`\nСервисы найдено: ${serviceFiles.length}`);
serviceFiles.forEach(f => console.log(`  ${f.path}`));

console.log(`\nФайлы маршрутов найдено: ${routeFiles.length}`);
routeFiles.forEach(f => console.log(`  ${f.path}`));

console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ ПО ЭТАПУ 1:');
console.log(`- Файлов с суффиксами: ${suspiciousFiles.length}`);
console.log(`- Групп с идентичным содержимым: ${duplicatesByHash.length}`);
console.log(`- Пар с похожими названиями: ${similarNames.length}`);
console.log(`- Контроллеров: ${controllerFiles.length}`);
console.log(`- Сервисов: ${serviceFiles.length}`);
console.log(`- Файлов маршрутов: ${routeFiles.length}`);

console.log('\n✅ ЭТАП 1 ЗАВЕРШЕН. Переходим к анализу API-маршрутов...');
