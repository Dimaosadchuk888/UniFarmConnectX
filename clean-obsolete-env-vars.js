/**
 * Скрипт для очистки устаревших переменных окружения
 * Задача T8: Устранение критических проблем
 */

const obsoleteVars = [
  'DATABASE_URL',
  'PGHOST', 
  'PGUSER',
  'PGPASSWORD',
  'PGDATABASE',
  'PGPORT',
  'DATABASE_PROVIDER',
  'USE_NEON_DB'
];

const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_KEY', 
  'TELEGRAM_BOT_TOKEN',
  'JWT_SECRET',
  'SESSION_SECRET'
];

console.log('🧹 Проверка переменных окружения...\n');

// Проверка устаревших переменных
console.log('❌ Найдены устаревшие переменные:');
obsoleteVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   - ${varName}: ${process.env[varName].substring(0, 20)}...`);
  }
});

// Проверка обязательных переменных
console.log('\n✅ Проверка обязательных переменных:');
requiredVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✓ ${varName}: настроен`);
  } else {
    console.log(`   ❌ ${varName}: ОТСУТСТВУЕТ`);
  }
});

console.log('\n📝 Рекомендации:');
console.log('1. Удалите устаревшие переменные из Replit Secrets');
console.log('2. Убедитесь, что все обязательные переменные настроены');
console.log('3. Система должна использовать только Supabase API');

console.log('\n✨ После очистки system будет готов к 100% production deployment');