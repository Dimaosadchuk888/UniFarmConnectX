#!/usr/bin/env node

/**
 * Простий і стабільний запуск UniFarm
 */

console.log('🚀 [RUN] Запуск UniFarm з правильною production базою...');

// Встановлюємо змінні середовища
process.env.NODE_ENV = 'development';
process.env.PORT = '3000';
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';

console.log('✅ [RUN] Змінні середовища встановлені');
console.log('🎯 [RUN] Використовуємо правильну базу: ep-lucky-boat-a463bggt');

// Запускаємо сервер
import('./server/index.js').catch(console.error);