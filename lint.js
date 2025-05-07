#!/usr/bin/env node

/**
 * Скрипт для запуска ESLint проверки именования файлов
 * Помогает автоматически выявлять нарушения соглашения об именовании
 * файлов в проекте
 */

import { ESLint } from 'eslint';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';

// Получаем текущую директорию
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Создаем экземпляр ESLint
const eslint = new ESLint({
  overrideConfigFile: resolve(__dirname, '.eslintrc.cjs')
});

/**
 * Рекурсивно находит все файлы в указанной директории
 */
function findFiles(dir, includePattern = /\.(js|jsx|ts|tsx)$/, excludePattern = /node_modules|\.git|dist/) {
  let results = [];
  
  try {
    const list = readdirSync(dir);
    
    for (const file of list) {
      const filePath = resolve(dir, file);
      const stat = statSync(filePath);
      
      if (excludePattern.test(filePath)) {
        continue;
      }
      
      if (stat && stat.isDirectory()) {
        results = results.concat(findFiles(filePath, includePattern, excludePattern));
      } else if (includePattern.test(file)) {
        results.push(filePath);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
  }
  
  return results;
}

/**
 * Выполняет проверку файлов на соответствие соглашению об именовании
 */
async function lintFiles() {
  try {
    console.log('Поиск файлов для проверки...');
    
    // Находим все файлы
    const serverFiles = findFiles(resolve(__dirname, 'server'));
    const sharedFiles = findFiles(resolve(__dirname, 'shared'));
    const clientFiles = findFiles(resolve(__dirname, 'client'));
    
    const allFiles = [...serverFiles, ...sharedFiles, ...clientFiles];
    
    console.log(`Найдено ${allFiles.length} файлов для проверки`);
    
    // Запускаем линтер
    console.log('Проверка соответствия соглашению об именовании файлов...');
    const results = await eslint.lintFiles(allFiles);
    
    // Отфильтровываем только ошибки именования файлов
    const filenameResults = results.filter(result => 
      result.messages.some(msg => msg.ruleId === 'filename-rules/match')
    );
    
    if (filenameResults.length === 0) {
      console.log('\x1b[32m%s\x1b[0m', '✅ Все файлы соответствуют соглашению об именовании!');
      return;
    }
    
    // Выводим результаты проверки
    console.log('\x1b[31m%s\x1b[0m', `⚠️ Найдено ${filenameResults.length} файлов с нарушением соглашения об именовании:`);
    
    filenameResults.forEach(result => {
      const filenameMessages = result.messages.filter(msg => msg.ruleId === 'filename-rules/match');
      if (filenameMessages.length > 0) {
        console.log('\x1b[31m%s\x1b[0m', `  - ${result.filePath}`);
        filenameMessages.forEach(msg => {
          console.log(`    ${msg.message}`);
        });
      }
    });
    
    console.log('\n\x1b[33m%s\x1b[0m', 'Пожалуйста, переименуйте файлы в соответствии с соглашением:');
    console.log('  * Используйте camelCase для файлов сервисов и утилит (например, userService.ts)');
    console.log('  * Используйте PascalCase для компонентов React и типов/интерфейсов');
  } catch (error) {
    console.error('Ошибка выполнения проверки:', error);
    process.exit(1);
  }
}

// Делаем скрипт исполняемым
try {
  execSync('chmod +x lint.js');
} catch (error) {
  console.error('Не удалось сделать скрипт исполняемым:', error);
}

// Запускаем проверку
lintFiles();