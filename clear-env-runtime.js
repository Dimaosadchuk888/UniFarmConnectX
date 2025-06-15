#!/usr/bin/env node

/**
 * Runtime очистка конфликтующих переменных окружения
 * Задача 3: Устранение PostgreSQL переменных
 */

// Список переменных для принудительного удаления
const conflictingVars = [
  'DATABASE_URL',
  'PGHOST',
  'PGPORT', 
  'PGUSER',
  'PGPASSWORD',
  'PGDATABASE',
  'DATABASE_PROVIDER',
  'USE_NEON_DB'
];

console.log('🧹 Runtime очистка конфликтующих переменных...');

// Принудительно удаляем переменные
conflictingVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`❌ Удаляю: ${varName}`);
    delete process.env[varName];
  }
});

// Проверяем результат
const remaining = Object.keys(process.env).filter(key => 
  key.includes('DATABASE') || key.startsWith('PG') || key.includes('NEON')
);

console.log(`✅ Очистка завершена. Осталось DB переменных: ${remaining.length}`);

if (remaining.length > 0) {
  console.log('⚠️ Найдены оставшиеся переменные:');
  remaining.forEach(key => console.log(`  - ${key}`));
}

// Проверяем наличие Supabase переменных
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  console.log('✅ Supabase переменные на месте');
} else {
  console.log('❌ Отсутствуют Supabase переменные');
}

console.log('🎯 Runtime очистка завершена');