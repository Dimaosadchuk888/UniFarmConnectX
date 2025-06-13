/**
 * Script to remove all console statements from frontend React code
 * Task T9: Clean frontend console.log statements for production
 */

import fs from 'fs';
import path from 'path';

const clientSrcPath = 'client/src';

// Console patterns to remove
const consolePatterns = [
  /\s*console\.log\([^)]*\);\s*\n?/g,
  /\s*console\.error\([^)]*\);\s*\n?/g,
  /\s*console\.warn\([^)]*\);\s*\n?/g,
  /\s*console\.debug\([^)]*\);\s*\n?/g,
  /\s*console\.info\([^)]*\);\s*\n?/g,
  /\s*console\.trace\([^)]*\);\s*\n?/g
];

// Advanced patterns for multiline console statements
const multilineConsolePatterns = [
  /\s*console\.[a-z]+\(\s*[^)]*?\s*\);\s*\n?/gs,
  /\s*console\.[a-z]+\(\s*[\s\S]*?\);\s*\n?/gs
];

function findAllFiles(dir, extension = ['.tsx', '.ts', '.jsx', '.js']) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(findAllFiles(filePath, extension));
    } else if (extension.some(ext => file.endsWith(ext))) {
      results.push(filePath);
    }
  });
  
  return results;
}

function cleanConsoleFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let removedCount = 0;
    
    // Remove simple console statements
    consolePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        removedCount += matches.length;
        content = content.replace(pattern, '');
      }
    });
    
    // Remove multiline console statements
    multilineConsolePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        removedCount += matches.length;
        content = content.replace(pattern, '');
      }
    });
    
    // Clean up multiple empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath}: удалено ${removedCount} console statements`);
      return removedCount;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Ошибка обработки ${filePath}:`, error.message);
    return 0;
  }
}

function cleanAllFiles() {
  console.log('🧹 ЗАДАЧА T9: Удаление console statements с фронтенда');
  console.log('📍 Сканирование директории:', clientSrcPath);
  
  const files = findAllFiles(clientSrcPath);
  console.log(`📋 Найдено ${files.length} файлов для обработки`);
  
  let totalRemoved = 0;
  let processedFiles = 0;
  
  files.forEach(file => {
    const removed = cleanConsoleFromFile(file);
    if (removed > 0) {
      processedFiles++;
    }
    totalRemoved += removed;
  });
  
  console.log('\n📊 РЕЗУЛЬТАТЫ:');
  console.log(`✅ Обработано файлов: ${processedFiles}`);
  console.log(`✅ Удалено console statements: ${totalRemoved}`);
  
  // Verify cleanup
  const remainingConsoles = countRemainingConsoles();
  console.log(`✅ Осталось console statements: ${remainingConsoles}`);
  
  if (remainingConsoles === 0) {
    console.log('\n🎉 ЗАДАЧА T9 ВЫПОЛНЕНА УСПЕШНО!');
    console.log('✅ Все console statements удалены с фронтенда');
    console.log('✅ Код готов к production сборке');
  } else {
    console.log('\n⚠️ Требуется дополнительная очистка');
  }
}

function countRemainingConsoles() {
  const files = findAllFiles(clientSrcPath);
  let count = 0;
  
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(/console\./g);
      if (matches) {
        count += matches.length;
      }
    } catch (error) {
      // Ignore file read errors
    }
  });
  
  return count;
}

cleanAllFiles();