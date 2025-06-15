/**
 * Финальная очистка переменных окружения от PostgreSQL/Neon
 */

import fs from 'fs';

const obsoleteVars = [
  'DATABASE_URL',
  'PGHOST', 
  'PGUSER',
  'PGPASSWORD',
  'PGPORT',
  'PGDATABASE',
  'DATABASE_PROVIDER',
  'USE_NEON_DB'
];

console.log('[INFO] Начинаю очистку переменных окружения...');

// Удаляем из process.env
let removedCount = 0;
for (const varName of obsoleteVars) {
  if (process.env[varName]) {
    delete process.env[varName];
    removedCount++;
    console.log(`[SUCCESS] Удалена переменная: ${varName}`);
  }
}

// Создаем чистый .env файл
const cleanEnvContent = `# UniFarm Clean Environment - Supabase Only
NODE_ENV=production
PORT=3000
TELEGRAM_BOT_TOKEN=${process.env.TELEGRAM_BOT_TOKEN || ''}
SUPABASE_URL=${process.env.SUPABASE_URL || ''}
SUPABASE_KEY=${process.env.SUPABASE_KEY || ''}
`;

fs.writeFileSync('.env', cleanEnvContent);
console.log('[SUCCESS] Создан чистый .env файл');

// Создаем инструкции для Replit Secrets
const instructions = {
  title: 'УДАЛЕНИЕ УСТАРЕВШИХ СЕКРЕТОВ ИЗ REPLIT',
  steps: [
    '1. Откройте Tools -> Secrets в Replit',
    '2. Найдите и УДАЛИТЕ эти переменные:',
    '   - DATABASE_URL',
    '   - PGHOST',
    '   - PGUSER', 
    '   - PGPASSWORD',
    '   - PGPORT',
    '   - PGDATABASE',
    '   - DATABASE_PROVIDER',
    '   - USE_NEON_DB',
    '',
    '3. ОСТАВЬТЕ только эти переменные:',
    '   - SUPABASE_URL',
    '   - SUPABASE_KEY',
    '   - TELEGRAM_BOT_TOKEN',
    '',
    '4. Перезапустите проект'
  ]
};

fs.writeFileSync('REPLIT_SECRETS_CLEANUP.json', JSON.stringify(instructions, null, 2));

// Проверяем результат
const requiredVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'TELEGRAM_BOT_TOKEN'];
const missingRequired = requiredVars.filter(v => !process.env[v]);

console.log('\n=== ОТЧЕТ ОЧИСТКИ ===');
console.log(`Удалено из process.env: ${removedCount}`);
console.log(`Чистый .env файл: СОЗДАН`);
console.log(`Инструкции: REPLIT_SECRETS_CLEANUP.json`);

if (missingRequired.length > 0) {
  console.log(`[WARNING] Отсутствуют: ${missingRequired.join(', ')}`);
} else {
  console.log('[SUCCESS] Все обязательные переменные присутствуют');
}

console.log('\n[ACTION REQUIRED] Удалите переменные из Replit Secrets вручную!');