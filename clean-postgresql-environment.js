/**
 * Полная очистка окружения от PostgreSQL переменных
 * Удаляет все устаревшие переменные и оставляет только Supabase
 */

console.log('🔄 Начинаю полную очистку окружения от PostgreSQL переменных...');

// Список переменных для удаления
const variablesToRemove = [
  'DATABASE_URL',
  'PGHOST',
  'PGPORT', 
  'PGUSER',
  'PGPASSWORD',
  'PGDATABASE',
  'USE_NEON_DB',
  'DATABASE_PROVIDER'
];

// Список переменных для сохранения
const variablesToKeep = [
  'SUPABASE_URL',
  'SUPABASE_KEY'
];

console.log('❌ Удаляю устаревшие PostgreSQL переменные:');
variablesToRemove.forEach(varName => {
  if (process.env[varName]) {
    console.log(`  - ${varName}: ${process.env[varName]}`);
    delete process.env[varName];
  }
});

console.log('\n✅ Сохраняю Supabase переменные:');
variablesToKeep.forEach(varName => {
  if (process.env[varName]) {
    console.log(`  - ${varName}: ${process.env[varName]}`);
  }
});

// Проверка результата
console.log('\n🔍 Финальная проверка переменных окружения:');
const remainingDbVars = Object.keys(process.env).filter(key => 
  key.includes('DATABASE') || key.includes('PG') || key.includes('NEON')
);

if (remainingDbVars.length === 0) {
  console.log('✅ Все PostgreSQL переменные успешно удалены');
} else {
  console.log('⚠️ Найдены остаточные переменные:', remainingDbVars);
}

console.log('🎯 Очистка завершена. Система использует только Supabase API.');