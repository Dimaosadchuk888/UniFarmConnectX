#!/usr/bin/env node

/**
 * Unified entry point for production deployment
 * Запускає сервер з підключенням до вашої production бази ep-lucky-boat-a463bggt
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 [UNIFIED START] Запуск UniFarm production сервера...');

// СИСТЕМНОЕ ПЕРЕНАПРАВЛЕНИЕ НА ПРАВИЛЬНУЮ БАЗУ
process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
process.env.PGHOST = 'ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech';
process.env.PGUSER = 'neondb_owner';
process.env.PGPASSWORD = 'npg_SpgdNBV70WKl';
process.env.PGDATABASE = 'neondb';
process.env.PGPORT = '5432';
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';
process.env.SKIP_PARTITION_CREATION = 'true';

// Переконуємось що порт встановлений
if (!process.env.PORT) {
  process.env.PORT = '3000';
}

console.log('✅ [UNIFIED START] Production змінні встановлені');
console.log('🎯 [UNIFIED START] Використовуємо Neon DB:', process.env.FORCE_NEON_DB);
console.log('📡 [UNIFIED START] Порт:', process.env.PORT);

// Определяем режим работы
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;

console.log(`🚀 Запуск UniFarm в ${isProduction ? 'production' : 'development'} режиме на порту ${port}`);

let startCommand, startArgs;

if (isProduction) {
  // Проверяем наличие собранного файла
  const distIndexPath = path.join(__dirname, 'dist', 'index.js');

  if (fs.existsSync(distIndexPath)) {
    console.log('✅ [UNIFIED START] Найден собранный файл, запускаем production версию');
    startCommand = 'node';
    startArgs = ['dist/index.js'];
  } else {
    console.log('⚠️ [UNIFIED START] Собранный файл не найден, компилируем и запускаем через tsx');
    startCommand = 'tsx';
    startArgs = ['server/index.ts'];
  }
} else {
  console.log('🔧 [UNIFIED START] Development режим, запускаем через tsx');
  startCommand = 'tsx';
  startArgs = ['server/index.ts'];
}

// Запускаем приложение
console.log(`🔥 [UNIFIED START] Выполняю команду: ${startCommand} ${startArgs.join(' ')}`);

const child = spawn(startCommand, startArgs, {
  stdio: 'inherit',
  env: process.env
});

child.on('error', (error) => {
  console.error('❌ [UNIFIED START] Ошибка запуска:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`📛 [UNIFIED START] Процесс завершен с кодом ${code}`);
  process.exit(code);
});

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('🛑 [UNIFIED START] Получен сигнал SIGINT, завершаем приложение...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('🛑 [UNIFIED START] Получен сигнал SIGTERM, завершаем приложение...');
  child.kill('SIGTERM');
});