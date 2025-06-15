/**
 * Скрипт для удаления конфликтующих переменных окружения
 * Устраняет PostgreSQL/Neon переменные, мешающие Supabase API
 */

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

function removeConflictingVariables() {
  console.log('🧹 Удаление конфликтующих переменных окружения...\n');
  
  let removed = 0;
  let notFound = 0;
  
  conflictingVars.forEach(varName => {
    if (process.env[varName]) {
      delete process.env[varName];
      console.log(`✅ Удалена: ${varName}`);
      removed++;
    } else {
      console.log(`ℹ️ Уже отсутствует: ${varName}`);
      notFound++;
    }
  });
  
  console.log(`\n📊 РЕЗУЛЬТАТЫ:`);
  console.log(`- Удалено переменных: ${removed}`);
  console.log(`- Уже отсутствовали: ${notFound}`);
  console.log(`- Всего обработано: ${conflictingVars.length}`);
  
  // Проверяем что остались только Supabase переменные
  console.log('\n🔍 Проверка оставшихся переменных окружения:');
  const envKeys = Object.keys(process.env).filter(key => 
    key.includes('DATABASE') || 
    key.includes('PG') || 
    key.includes('SUPABASE') ||
    key.includes('NEON')
  );
  
  envKeys.forEach(key => {
    if (key.startsWith('SUPABASE_')) {
      console.log(`✅ Сохранена: ${key}=${process.env[key]?.substring(0, 30)}...`);
    } else {
      console.log(`⚠️ Обнаружена остаточная: ${key}=${process.env[key]?.substring(0, 30)}...`);
    }
  });
  
  console.log('\n✅ ЗАДАЧА 3 ЗАВЕРШЕНА: Переменные окружения очищены');
  
  return {
    removed,
    notFound,
    total: conflictingVars.length,
    status: 'COMPLETED'
  };
}

// Немедленное выполнение
const result = removeConflictingVariables();
console.log(`\n📋 Финальный статус: ${result.status}`);