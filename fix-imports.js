#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Маппинг алиасов на их реальные пути относительно client/src
const aliasMap = {
  '@/components': '../components',
  '@/contexts': '../contexts',
  '@/hooks': '../hooks',
  '@/layouts': '../layouts',
  '@/lib': '../lib',
  '@/pages': '../pages',
  '@/services': '../services',
  '@/utils': '../utils',
  '@/types': '../types',
  '@/store': '../store',
  '@/config': '../config',
  '@/styles': '../styles'
};

// Функция для вычисления относительного пути
function calculateRelativePath(fromFile, toPath) {
  const fromDir = path.dirname(fromFile);
  const fromDepth = fromDir.split('/').filter(p => p).length;
  const srcIndex = fromDir.split('/').indexOf('src');
  const levelsUp = fromDepth - srcIndex - 1;
  
  if (levelsUp === 0) {
    // Файл находится прямо в src
    return './' + toPath.replace('../', '');
  } else if (levelsUp === 1) {
    // Файл находится в папке внутри src (components, pages, etc)
    return '../' + toPath.replace('../', '');
  } else if (levelsUp === 2) {
    // Файл находится в подпапке (components/ui, etc)
    return '../../' + toPath.replace('../', '');
  } else if (levelsUp === 3) {
    // Файл находится в под-подпапке
    return '../../../' + toPath.replace('../', '');
  }
  
  return toPath;
}

// Функция для обработки файла
function processFile(filePath) {
  console.log(`Processing: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Регулярное выражение для поиска импортов
  const importRegex = /from\s+['"](@\/[^'"]+)['"]/g;
  
  content = content.replace(importRegex, (match, importPath) => {
    // Находим соответствующий алиас
    for (const [alias, replacement] of Object.entries(aliasMap)) {
      if (importPath.startsWith(alias)) {
        const restPath = importPath.slice(alias.length);
        const calculatedPath = calculateRelativePath(filePath, replacement);
        const newPath = calculatedPath + restPath;
        
        console.log(`  Replacing: ${importPath} -> ${newPath}`);
        modified = true;
        return `from '${newPath}'`;
      }
    }
    
    // Если алиас не найден, оставляем как есть
    return match;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Updated ${filePath}`);
  }
}

// Рекурсивный поиск всех .ts и .tsx файлов
function findFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findFiles(fullPath, files);
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Главная функция
function main() {
  const srcDir = 'client/src';
  
  if (!fs.existsSync(srcDir)) {
    console.error('Error: client/src directory not found!');
    process.exit(1);
  }
  
  console.log('Finding all TypeScript files...');
  const files = findFiles(srcDir);
  
  console.log(`Found ${files.length} files to process`);
  
  for (const file of files) {
    processFile(file);
  }
  
  console.log('\nImport fixing completed!');
}

main();