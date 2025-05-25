/**
 * СКРИПТ ДЛЯ ЗАМЕНЫ ВСЕХ СТАРЫХ DEV ССЫЛОК НА ПРОДАКШН URL
 * 
 * Этот скрипт автоматически находит и заменяет все временные Replit URL
 * на правильный продакшн адрес во всех файлах проекта
 */

import fs from 'fs';
import path from 'path';

// Продакшн URL
const PRODUCTION_URL = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app';

// Паттерны старых временных URL для замены
const DEV_URL_PATTERNS = [
  /https:\/\/[a-f0-9-]+\.pike\.replit\.dev/g,
  /https:\/\/[a-f0-9-]+\.replit\.dev/g,
  /http:\/\/localhost:3000/g,
  /http:\/\/127\.0\.0\.1:3000/g,
  /https:\/\/8ac7b219-438d-4a0b-ab0e-d8b58de37c6d-00-8ncu[^'"\\s]*/g
];

// Расширения файлов для обработки
const FILE_EXTENSIONS = ['.js', '.mjs', '.ts', '.tsx', '.json', '.md', '.txt'];

// Папки для исключения из поиска
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', 'logs'];

/**
 * Получает все файлы в директории рекурсивно
 */
function getAllFiles(dir, allFiles = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Пропускаем исключенные директории
      if (!EXCLUDE_DIRS.includes(file)) {
        getAllFiles(fullPath, allFiles);
      }
    } else {
      // Добавляем файлы с нужными расширениями
      const ext = path.extname(file);
      if (FILE_EXTENSIONS.includes(ext)) {
        allFiles.push(fullPath);
      }
    }
  }
  
  return allFiles;
}

/**
 * Заменяет URL в содержимом файла
 */
function replaceUrlsInContent(content) {
  let updatedContent = content;
  let hasChanges = false;
  
  for (const pattern of DEV_URL_PATTERNS) {
    const matches = updatedContent.match(pattern);
    if (matches && matches.length > 0) {
      console.log(`  🔧 Найдено ${matches.length} совпадений для паттерна: ${pattern}`);
      updatedContent = updatedContent.replace(pattern, PRODUCTION_URL);
      hasChanges = true;
    }
  }
  
  return { content: updatedContent, hasChanges };
}

/**
 * Обрабатывает один файл
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, hasChanges } = replaceUrlsInContent(content);
    
    if (hasChanges) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Обновлен: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`❌ Ошибка обработки ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Основная функция
 */
async function fixAllDevUrls() {
  console.log('🔧 ИСПРАВЛЕНИЕ ВСЕХ DEV ССЫЛОК В ПРОЕКТЕ');
  console.log('==========================================');
  console.log(`📍 Заменяем все временные URL на: ${PRODUCTION_URL}`);
  console.log('');
  
  // Получаем все файлы
  const allFiles = getAllFiles('.');
  console.log(`📁 Найдено ${allFiles.length} файлов для проверки`);
  console.log('');
  
  let updatedFilesCount = 0;
  
  // Обрабатываем каждый файл
  for (const filePath of allFiles) {
    // Показываем только файлы с изменениями
    if (processFile(filePath)) {
      updatedFilesCount++;
    }
  }
  
  console.log('');
  console.log('🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!');
  console.log('==========================================');
  console.log(`✅ Обновлено файлов: ${updatedFilesCount}`);
  console.log(`📁 Проверено файлов: ${allFiles.length}`);
  console.log(`🔗 Новый URL: ${PRODUCTION_URL}`);
  console.log('');
  console.log('💡 Все старые временные ссылки заменены на продакшн URL!');
}

// Запускаем скрипт
fixAllDevUrls().catch(console.error);