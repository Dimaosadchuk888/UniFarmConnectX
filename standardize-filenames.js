/**
 * Скрипт для стандартизации имен файлов в проекте
 * 
 * Этот скрипт переименовывает файлы с учетом соглашений об именовании 
 * и обновляет все импорты в других файлах.
 * 
 * Соглашения об именовании:
 * - Файлы сервисов: camelCase + Service.ts
 * - Файлы контроллеров: camelCase + Controller.ts
 * - Файлы утилит: camelCase.ts
 * - Файлы компонентов React: PascalCase.tsx
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Настройки
const CONFIG = {
  // Список файлов для переименования в формате { oldPath: 'путь/к/старому/файлу', newPath: 'путь/к/новому/файлу' }
  renameList: [
    // Сервисы (camelCase)
    { oldPath: 'server/services/UserService.ts', newPath: 'server/services/userService.ts' },
    { oldPath: 'server/services/TransactionService.ts', newPath: 'server/services/transactionService.ts' },
    { oldPath: 'server/services/SessionService.ts', newPath: 'server/services/sessionService.ts' },
    
    // Контроллеры (camelCase)
    { oldPath: 'server/controllers/UserController.ts', newPath: 'server/controllers/userController.ts' },
    { oldPath: 'server/controllers/TransactionController.ts', newPath: 'server/controllers/transactionController.ts' },
    { oldPath: 'server/controllers/SessionController.ts', newPath: 'server/controllers/sessionController.ts' },
    
    // Другие файлы, которые нужно переименовать...
  ],
  
  // Путь к директории проекта
  projectRoot: './',
  
  // Файлы для поиска импортов
  filesToSearch: [
    './server/**/*.ts', 
    './client/src/**/*.{ts,tsx}',
    './shared/**/*.ts'
  ],
  
  // Исключения - файлы, которые не нужно обновлять
  excludedFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ]
};

// Вспомогательные функции
async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

async function createBackupOfFile(filePath) {
  const backupPath = `${filePath}.bak`;
  await fs.promises.copyFile(filePath, backupPath);
  console.log(`✅ Создана резервная копия: ${backupPath}`);
  return backupPath;
}

async function revertFromBackup(backupPath) {
  const originalPath = backupPath.replace('.bak', '');
  await fs.promises.copyFile(backupPath, originalPath);
  console.log(`✅ Восстановлен оригинальный файл из резервной копии: ${originalPath}`);
}

async function getAllFilesToUpdate() {
  let files = [];
  
  for (const pattern of CONFIG.filesToSearch) {
    const matchedFiles = await glob(pattern, { ignore: CONFIG.excludedFiles });
    files.push(...matchedFiles);
  }
  
  return files;
}

// Основные функции
async function moveFile(oldPath, newPath) {
  // Проверить существование исходного файла
  if (!(await fileExists(oldPath))) {
    console.warn(`⚠️ Исходный файл не существует: ${oldPath}`);
    return false;
  }
  
  // Проверить, не существует ли уже файл в новом месте
  if (await fileExists(newPath)) {
    // Файл может уже существовать из-за case-insensitive файловой системы
    const oldContent = await fs.promises.readFile(oldPath, 'utf8');
    const newContent = await fs.promises.readFile(newPath, 'utf8');
    
    if (oldContent === newContent) {
      console.log(`✅ Файл уже существует по новому пути: ${newPath}`);
      return true;
    } else {
      console.error(`❌ Конфликт: файл уже существует с другим содержимым: ${newPath}`);
      return false;
    }
  }
  
  // Создать директорию назначения, если она не существует
  const targetDir = path.dirname(newPath);
  try {
    await fs.promises.mkdir(targetDir, { recursive: true });
  } catch (error) {
    // Игнорируем ошибку, если директория уже существует
  }
  
  // Скопировать файл в новое место
  await fs.promises.copyFile(oldPath, newPath);
  console.log(`✅ Файл успешно скопирован: ${oldPath} -> ${newPath}`);
  
  return true;
}

async function updateImports(file, oldPath, newPath) {
  // Получить относительные пути для импортов
  const fileDir = path.dirname(file);
  const oldRelativePath = path.relative(fileDir, oldPath).replace(/\.ts$/, '');
  const newRelativePath = path.relative(fileDir, newPath).replace(/\.ts$/, '');
  
  // Преобразовать в формат импортов (с заменой обратных слешей на прямые)
  const oldImportPath = oldRelativePath.replace(/\\/g, '/');
  const newImportPath = newRelativePath.replace(/\\/g, '/');
  
  // Добавить префикс ./ для корректного импорта из текущей директории
  const oldImport = oldImportPath.startsWith('.') ? oldImportPath : `./${oldImportPath}`;
  const newImport = newImportPath.startsWith('.') ? newImportPath : `./${newImportPath}`;
  
  // Проверить, содержит ли файл импорт
  let content = await fs.promises.readFile(file, 'utf8');
  
  // Шаблоны для поиска импортов
  const importPatterns = [
    `import .*;? from ['"]${oldImport}['"]`,
    `import .*?['"]${oldImport}['"].*?`,
    `require\\(['"]${oldImport}['"]\\)`,
    `from ['"]${oldImport}['"]`
  ];
  
  let fileWasUpdated = false;
  
  for (const pattern of importPatterns) {
    const regex = new RegExp(pattern, 'g');
    if (regex.test(content)) {
      // Создать резервную копию перед изменением файла
      if (!fileWasUpdated) {
        await createBackupOfFile(file);
        fileWasUpdated = true;
      }
      
      // Заменить импорты
      content = content.replace(regex, (match) => {
        return match.replace(oldImport, newImport);
      });
    }
  }
  
  // Также обработать возможные импорты с использованием абсолютных путей
  const oldAbsoluteImport = `@server/${oldPath.replace('server/', '').replace(/\.ts$/, '')}`;
  const newAbsoluteImport = `@server/${newPath.replace('server/', '').replace(/\.ts$/, '')}`;
  
  if (content.includes(oldAbsoluteImport)) {
    // Создать резервную копию перед изменением файла
    if (!fileWasUpdated) {
      await createBackupOfFile(file);
      fileWasUpdated = true;
    }
    
    // Заменить импорты
    content = content.replace(new RegExp(oldAbsoluteImport, 'g'), newAbsoluteImport);
  }
  
  // Сохранить файл, если были сделаны изменения
  if (fileWasUpdated) {
    await fs.promises.writeFile(file, content, 'utf8');
    console.log(`✅ Обновлены импорты в файле: ${file}`);
    return true;
  }
  
  return false;
}

async function processRename(item) {
  console.log(`\n🔄 Обработка переименования: ${item.oldPath} -> ${item.newPath}`);
  
  // Полные пути к файлам
  const oldFullPath = path.join(CONFIG.projectRoot, item.oldPath);
  const newFullPath = path.join(CONFIG.projectRoot, item.newPath);
  
  // Шаг 1: Копирование файла
  const fileMoved = await moveFile(oldFullPath, newFullPath);
  if (!fileMoved) {
    console.error(`❌ Не удалось скопировать файл: ${item.oldPath}`);
    return false;
  }
  
  // Шаг 2: Обновление импортов во всех файлах
  const filesToUpdate = await getAllFilesToUpdate();
  let importUpdatesCount = 0;
  
  for (const file of filesToUpdate) {
    const updated = await updateImports(file, item.oldPath, item.newPath);
    if (updated) {
      importUpdatesCount++;
    }
  }
  
  console.log(`✅ Обновлены импорты в ${importUpdatesCount} файлах для: ${item.newPath}`);
  
  // Шаг 3: Удаление оригинального файла (если он отличается от нового)
  if (oldFullPath.toLowerCase() !== newFullPath.toLowerCase()) {
    try {
      await fs.promises.unlink(oldFullPath);
      console.log(`✅ Удален оригинальный файл: ${item.oldPath}`);
    } catch (error) {
      console.warn(`⚠️ Не удалось удалить оригинальный файл: ${item.oldPath}`);
      console.error(error);
    }
  } else {
    console.log(`ℹ️ Пропущено удаление: исходный и целевой пути совпадают в нижнем регистре`);
  }
  
  return true;
}

async function standardizeFilenames() {
  console.log('🚀 Начинаем стандартизацию имен файлов...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const item of CONFIG.renameList) {
    try {
      const success = await processRename(item);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (error) {
      console.error(`❌ Ошибка при обработке ${item.oldPath}:`);
      console.error(error);
      errorCount++;
    }
    
    // Пауза между операциями для снижения нагрузки
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Итоги стандартизации:');
  console.log(`✅ Успешно обработано: ${successCount} файлов`);
  console.log(`❌ Ошибок: ${errorCount} файлов`);
  
  if (successCount > 0) {
    console.log('\n🔄 Перезапуск сервера рекомендуется после этих изменений.');
  }
}

// Вспомогательная функция для отладки
async function testGrepImports(oldPath) {
  try {
    const { stdout, stderr } = await execPromise(`grep -r "from.*${oldPath}" --include="*.ts" --include="*.tsx" ./server`);
    console.log('Найдены импорты:');
    console.log(stdout);
    if (stderr) {
      console.error('Ошибки:');
      console.error(stderr);
    }
  } catch (error) {
    console.log('Импорты не найдены или произошла ошибка:');
    console.error(error);
  }
}

// Запуск стандартизации
standardizeFilenames();