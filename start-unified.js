#!/usr/bin/env node

/**
 * Unified entry point for production deployment
 * Запускає сервер з підключенням до вашої production бази ep-lucky-boat-a463bggt
 */

console.log('🚀 [UNIFIED START] Запуск UniFarm production сервера...');

// Встановлюємо production змінні середовища
process.env.NODE_ENV = 'production';
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';

// Переконуємось що порт встановлений
if (!process.env.PORT) {
  process.env.PORT = '3000';
}

console.log('✅ [UNIFIED START] Production змінні встановлені');
console.log('🎯 [UNIFIED START] Використовуємо Neon DB:', process.env.FORCE_NEON_DB);
console.log('📡 [UNIFIED START] Порт:', process.env.PORT);

// Запускаємо основний сервер з dist/ після збірки
const fs = require('fs');

if (fs.existsSync('./dist/index.js')) {
  console.log('🎯 [UNIFIED START] Запуск зібраної версії з dist/');
  require('./dist/index.js');
} else {
  console.log('🔄 [UNIFIED START] Запуск development версії');
  require('./server/index.js');
}