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

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = require('./deploy-config');

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

// 1. Копируем конфигурационный файл .replit
try {
  log(`Копируем конфигурационный файл ${config.PATH_CONFIG.replit.source} в ${config.PATH_CONFIG.replit.target}...`);
  fs.copyFileSync(
    path.join(__dirname, config.PATH_CONFIG.replit.source),
    path.join(__dirname, config.PATH_CONFIG.replit.target)
  );
  log('✅ Конфигурационный файл успешно скопирован');
} catch (error) {
  log(`❌ Ошибка при копировании конфигурационного файла: ${error.message}`);
}

// 2. Проверяем наличие production-server.mjs
try {
  if (!fs.existsSync(path.join(__dirname, config.PATH_CONFIG.productionServer))) {
    log(`Production файл ${config.PATH_CONFIG.productionServer} не найден, копируем из production-server.js...`);
    fs.copyFileSync(
      path.join(__dirname, 'production-server.js'),
      path.join(__dirname, config.PATH_CONFIG.productionServer)
    );
  }
  log('✅ Production-сервер готов');
} catch (error) {
  log(`❌ Ошибка при проверке production-сервера: ${error.message}`);
}

// 3. Запускаем сборку проекта
try {
  log('Запускаем сборку проекта...');
  execSync(config.COMMANDS.build, { stdio: 'inherit' });
  log('✅ Сборка проекта успешно завершена');
} catch (error) {
  log(`❌ Ошибка при сборке проекта: ${error.message}`);
}

// 4. Выполняем миграции базы данных
try {
  log('Выполняем миграции базы данных...');
  
  // Устанавливаем переменные окружения для миграции
  Object.entries(config.ENV_VARIABLES).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  execSync(config.COMMANDS.migrate, { stdio: 'inherit' });
  log('✅ Миграции базы данных успешно выполнены');
} catch (error) {
  log(`❌ Ошибка при выполнении миграций: ${error.message}`);
}

// 5. Проверяем соединение с базой данных
try {
  log('Проверяем соединение с базой данных...');
  execSync(config.COMMANDS.checkDb, { stdio: 'inherit' });
  log('✅ Соединение с базой данных проверено');
} catch (error) {
  log(`❌ Ошибка при проверке соединения с базой данных: ${error.message}`);
}

// 6. Запускаем production-сервер
try {
  log('Запускаем production-сервер...');
  log(`Выполняем команду: ${config.COMMANDS.start}`);
  
  // Запускаем сервер в отдельном процессе
  const { spawn } = require('child_process');
  const [command, ...args] = config.COMMANDS.start.split(' ');
  
  const serverProcess = spawn(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...config.ENV_VARIABLES }
  });
  
  serverProcess.on('error', (error) => {
    log(`❌ Ошибка при запуске сервера: ${error.message}`);
  });
  
  log('✅ Сервер запущен');
} catch (error) {
  log(`❌ Ошибка при запуске сервера: ${error.message}`);
}

log('Процесс деплоя завершен.');
log(`
Итоги деплоя:
- Сервер запущен на порту ${config.SERVER_CONFIG.port}
- База данных: ${config.DATABASE_CONFIG.url}
- Используется файл ${config.PATH_CONFIG.productionServer}
- Окружение: ${config.ENV_VARIABLES.NODE_ENV}

Приложение доступно по адресу: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co
`);