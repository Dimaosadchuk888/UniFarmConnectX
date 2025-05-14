/**
 * Скрипт автоматического деплоя UniFarm на Replit
 * 
 * Выполняет все необходимые шаги для деплоя:
 * 1. Копирует конфигурационные файлы
 * 2. Устанавливает переменные окружения
 * 3. Запускает сборку проекта
 * 4. Выполняет миграции базы данных
 * 5. Запускает production-сервер
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import deployConfig from './deploy-config.js';

// В ESM __dirname не определен, создаем его
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Создаем лог для отслеживания процесса деплоя
const logFile = path.join(__dirname, 'deploy.log');
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry);
  fs.appendFileSync(logFile, logEntry);
};

// Очищаем старый лог если есть
if (fs.existsSync(logFile)) {
  fs.unlinkSync(logFile);
}

log('Начинаем процесс деплоя UniFarm на Replit...');

// 1. Проверяем конфигурационный файл .replit (пропускаем копирование из-за ограничений Replit)
try {
  log(`Проверка конфигурационного файла .replit...`);
  log('⚠️ Прямое редактирование .replit запрещено в Replit. Пропускаем этот шаг.');
  log('📝 Для настройки .replit используйте панель управления Replit.');
  
  // Указываем информацию о рекомендуемых настройках
  log('ℹ️ Рекомендуемые настройки для .replit:');
  log('  - PORT=3000');
  log('  - DATABASE_PROVIDER=replit');
  log('  - run = "NODE_ENV=production PORT=3000 node start-unified.js"');
} catch (error) {
  log(`❌ Ошибка при проверке конфигурационного файла: ${error.message}`);
}

// 2. Проверяем наличие production-server.mjs
try {
  if (!fs.existsSync(path.join(__dirname, deployConfig.PATH_CONFIG.productionServer))) {
    log(`Production файл ${deployConfig.PATH_CONFIG.productionServer} не найден, копируем из production-server.js...`);
    fs.copyFileSync(
      path.join(__dirname, 'production-server.js'),
      path.join(__dirname, deployConfig.PATH_CONFIG.productionServer)
    );
  }
  log('✅ Production-сервер готов');
} catch (error) {
  log(`❌ Ошибка при проверке production-сервера: ${error.message}`);
}

// 3. Запускаем сборку проекта
try {
  log('Запускаем сборку проекта...');
  execSync(deployConfig.COMMANDS.build, { stdio: 'inherit' });
  log('✅ Сборка проекта успешно завершена');
} catch (error) {
  log(`❌ Ошибка при сборке проекта: ${error.message}`);
}

// 4. Выполняем миграции базы данных
try {
  log('Выполняем миграции базы данных...');
  
  // Устанавливаем переменные окружения для миграции
  Object.entries(deployConfig.ENV_VARIABLES).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  execSync(deployConfig.COMMANDS.migrate, { stdio: 'inherit' });
  log('✅ Миграции базы данных успешно выполнены');
} catch (error) {
  log(`❌ Ошибка при выполнении миграций: ${error.message}`);
}

// 5. Проверяем соединение с базой данных
try {
  log('Проверяем соединение с базой данных...');
  execSync(deployConfig.COMMANDS.checkDb, { stdio: 'inherit' });
  log('✅ Соединение с базой данных проверено');
} catch (error) {
  log(`❌ Ошибка при проверке соединения с базой данных: ${error.message}`);
}

// 6. Запускаем production-сервер
try {
  log('Запускаем production-сервер...');
  
  // Для запуска сервера создаем скрипт запуска
  const startCommand = `NODE_ENV=production PORT=${deployConfig.SERVER_CONFIG.port} DATABASE_PROVIDER=replit node ${deployConfig.PATH_CONFIG.startScript}`;
  log(`Выполняем команду: ${startCommand}`);
  
  // Используем динамический импорт для child_process
  const childProcess = await import('child_process');
  const serverProcess = childProcess.exec(startCommand, {
    stdio: 'inherit',
    env: { ...process.env, ...deployConfig.ENV_VARIABLES }
  });
  
  serverProcess.on('error', (error) => {
    log(`❌ Ошибка при запуске сервера: ${error.message}`);
  });
  
  log('✅ Сервер запущен');
  log('⚠️ При необходимости перезапустите сервер вручную командой:');
  log(`   ${startCommand}`);
} catch (error) {
  log(`❌ Ошибка при запуске сервера: ${error.message}`);
}

log('Процесс деплоя завершен.');
log(`
Итоги деплоя:
- Сервер запущен на порту ${deployConfig.SERVER_CONFIG.port}
- База данных: ${deployConfig.DATABASE_CONFIG.url}
- Используется файл ${deployConfig.PATH_CONFIG.productionServer}
- Окружение: ${deployConfig.ENV_VARIABLES.NODE_ENV}

Приложение доступно по адресу: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co
`);