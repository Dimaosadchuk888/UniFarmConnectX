/**
 * Безопасный анализ дубликатов для определения активно используемых файлов
 */

import fs from 'fs';
import path from 'path';

const activeFiles = new Set();
const importedFiles = new Map();
const referencedFiles = new Set();

/**
 * Анализируем импорты и зависимости
 */
function analyzeImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Ищем import/require statements
    const importRegex = /(?:import.*from\s+['"`]([^'"`]+)['"`]|require\s*\(\s*['"`]([^'"`]+)['"`]\))/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      if (importPath && !importPath.startsWith('node_modules') && !importPath.startsWith('@')) {
        if (!importedFiles.has(filePath)) {
          importedFiles.set(filePath, []);
        }
        importedFiles.get(filePath).push(importPath);
        
        // Попытаемся найти реальный файл
        let realPath = importPath;
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          const dir = path.dirname(filePath);
          realPath = path.resolve(dir, importPath);
        }
        
        // Проверяем разные расширения
        const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '.mjs'];
        for (const ext of extensions) {
          const fullPath = realPath + ext;
          if (fs.existsSync(fullPath)) {
            referencedFiles.add(path.relative('.', fullPath));
            break;
          }
        }
      }
    }
  } catch (error) {
    // Игнорируем ошибки чтения файлов
  }
}

/**
 * Находим entry points - файлы, которые точно используются
 */
function findEntryPoints() {
  const entryPoints = [
    'server/index.ts',
    'client/src/main.tsx',
    'package.json',
    'vite.config.ts',
    'tailwind.config.ts',
    'drizzle.config.ts'
  ];
  
  entryPoints.forEach(file => {
    if (fs.existsSync(file)) {
      activeFiles.add(file);
    }
  });
}

/**
 * Рекурсивно находим все зависимости
 */
function traceDependendencies() {
  let foundNew = true;
  let iterations = 0;
  
  while (foundNew && iterations < 50) {
    foundNew = false;
    iterations++;
    
    for (const file of activeFiles) {
      if (importedFiles.has(file)) {
        for (const imported of importedFiles.get(file)) {
          if (!referencedFiles.has(imported)) {
            foundNew = true;
            referencedFiles.add(imported);
          }
        }
      }
    }
    
    for (const ref of referencedFiles) {
      if (!activeFiles.has(ref)) {
        activeFiles.add(ref);
        foundNew = true;
      }
    }
  }
}

/**
 * Сканируем все файлы проекта
 */
function scanAllFiles(dir = '.', relativePath = '') {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      if (item.startsWith('.') || item === 'node_modules' || item === 'dist') continue;
      
      const fullPath = path.join(dir, item);
      const itemRelativePath = path.join(relativePath, item);
      
      if (fs.statSync(fullPath).isDirectory()) {
        scanAllFiles(fullPath, itemRelativePath);
      } else if (item.match(/\.(js|ts|jsx|tsx|mjs|json)$/)) {
        analyzeImports(itemRelativePath);
      }
    }
  } catch (error) {
    console.error(`Ошибка сканирования ${dir}:`, error.message);
  }
}

/**
 * Анализируем дубликаты из предыдущего отчета
 */
function analyzeDuplicatesFromReport() {
  try {
    const reportContent = fs.readFileSync('duplicate-analysis-report.json', 'utf8');
    const report = JSON.parse(reportContent);
    
    console.log('🔍 Анализ безопасности удаления дубликатов...\n');
    
    // Анализируем файлы с похожими именами
    console.log('📁 ФАЙЛЫ С ПОХОЖИМИ ИМЕНАМИ - РЕКОМЕНДАЦИИ:');
    console.log('═══════════════════════════════════════════════');
    
    report.files.similarNames.forEach(group => {
      console.log(`\n📂 Группа: ${group.baseName}`);
      
      group.files.forEach(file => {
        const isActive = activeFiles.has(file) || referencedFiles.has(file);
        const isBackup = file.includes('backup') || file.includes('archive') || file.includes('.old');
        
        if (isBackup && !isActive) {
          console.log(`  ❌ МОЖНО УДАЛИТЬ: ${file} (backup/archive, не используется)`);
        } else if (isActive) {
          console.log(`  ✅ ОСТАВИТЬ: ${file} (активно используется)`);
        } else {
          console.log(`  ⚠️  ПРОВЕРИТЬ: ${file} (статус неясен)`);
        }
      });
    });
    
    // Анализируем backup файлы
    console.log('\n\n🗂️  BACKUP ФАЙЛЫ:');
    console.log('══════════════════');
    
    report.files.backupFiles.forEach(file => {
      const isActive = activeFiles.has(file) || referencedFiles.has(file);
      if (!isActive) {
        console.log(`❌ МОЖНО УДАЛИТЬ: ${file}`);
      } else {
        console.log(`⚠️  ВНИМАНИЕ: ${file} (может использоваться)`);
      }
    });
    
    // Создаем списки для безопасного удаления
    const safeToDelete = [];
    const needsReview = [];
    
    report.files.similarNames.forEach(group => {
      group.files.forEach(file => {
        const isActive = activeFiles.has(file) || referencedFiles.has(file);
        const isBackup = file.includes('backup') || file.includes('archive') || file.includes('.old');
        
        if (isBackup && !isActive) {
          safeToDelete.push(file);
        } else if (!isActive && !isBackup) {
          needsReview.push(file);
        }
      });
    });
    
    report.files.backupFiles.forEach(file => {
      const isActive = activeFiles.has(file) || referencedFiles.has(file);
      if (!isActive) {
        safeToDelete.push(file);
      }
    });
    
    console.log(`\n\n📊 ИТОГО:`);
    console.log(`✅ Активных файлов найдено: ${activeFiles.size}`);
    console.log(`❌ Файлов безопасно удалить: ${safeToDelete.length}`);
    console.log(`⚠️  Файлов требует проверки: ${needsReview.length}`);
    
    // Сохраняем списки
    const cleanupPlan = {
      safeToDelete,
      needsReview,
      activeFiles: Array.from(activeFiles),
      referencedFiles: Array.from(referencedFiles)
    };
    
    fs.writeFileSync('safe-cleanup-plan.json', JSON.stringify(cleanupPlan, null, 2));
    console.log('\n✅ План безопасной очистки сохранен в safe-cleanup-plan.json');
    
  } catch (error) {
    console.error('Ошибка анализа отчета:', error.message);
  }
}

/**
 * Основная функция
 */
async function runSafeAnalysis() {
  console.log('🔍 Анализ активных файлов и зависимостей...\n');
  
  findEntryPoints();
  console.log(`✅ Найдено ${activeFiles.size} entry points`);
  
  scanAllFiles();
  console.log(`✅ Проанализированы импорты в проекте`);
  
  traceDependendencies();
  console.log(`✅ Найдено ${activeFiles.size} активных файлов`);
  console.log(`✅ Найдено ${referencedFiles.size} связанных файлов\n`);
  
  analyzeDuplicatesFromReport();
}

runSafeAnalysis().catch(console.error);