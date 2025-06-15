/**
 * Скрипт для полной очистки environment от старых database переменных
 * Оставляет только необходимые для Supabase API
 */

import fs from 'fs';

// Список переменных для удаления
const variablesToRemove = [
  'DATABASE_URL',
  'PGHOST', 
  'PGUSER',
  'PGPASSWORD',
  'PGPORT',
  'PGDATABASE'
];

// Переменные для сохранения
const variablesToKeep = [
  'NODE_ENV',
  'PORT', 
  'TELEGRAM_BOT_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_KEY'
];

console.log('🧹 Очистка environment от старых database переменных...');

// Создаем чистый .env файл
const cleanEnvContent = `NODE_ENV=production
PORT=3000
TELEGRAM_BOT_TOKEN=${process.env.TELEGRAM_BOT_TOKEN || '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug'}
SUPABASE_URL=${process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co'}
SUPABASE_KEY=${process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDMwNzcsImV4cCI6MjA2NTQ3OTA3N30.4ShnO3KXxi66rEMPkmAafAfN-IFImDd1YwMnrRDPD1c'}`;

// Записываем чистый .env
fs.writeFileSync('.env', cleanEnvContent);
console.log('✅ Создан чистый .env файл с только Supabase переменными');

// Удаляем переменные из текущей сессии
variablesToRemove.forEach(varName => {
  delete process.env[varName];
  console.log(`❌ Удалена переменная: ${varName}`);
});

console.log('\n🎯 Активные переменные:');
variablesToKeep.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: ${process.env[varName].substring(0, 30)}...`);
  }
});

console.log('\n🚀 Environment очищен и готов для Supabase-only deployment');