/**
 * ЗАДАЧА 3: Очистка конфликтующих переменных окружения
 * Устраняет остатки PostgreSQL/Neon переменных
 */

const conflictingVars = [
  'DATABASE_URL',
  'PGHOST',
  'PGPORT', 
  'PGUSER',
  'PGPASSWORD',
  'PGDATABASE',
  'DATABASE_PROVIDER',
  'USE_NEON_DB',
  'FORCE_NEON_DB',
  'DISABLE_REPLIT_DB',
  'NEON_DATABASE_URL'
];

function checkEnvironmentConflicts() {
  console.log('🔍 Проверка конфликтующих переменных окружения...\n');
  
  const found = [];
  const clean = [];
  
  conflictingVars.forEach(varName => {
    if (process.env[varName]) {
      found.push(`❌ ${varName}=${process.env[varName].substring(0, 50)}...`);
    } else {
      clean.push(`✅ ${varName} - отсутствует`);
    }
  });
  
  console.log('📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ:');
  console.log(`Найдено конфликтующих переменных: ${found.length}`);
  console.log(`Чистых переменных: ${clean.length}`);
  
  if (found.length > 0) {
    console.log('\n⚠️ ОБНАРУЖЕНЫ КОНФЛИКТУЮЩИЕ ПЕРЕМЕННЫЕ:');
    found.forEach(line => console.log(line));
    
    console.log('\n📝 НЕОБХОДИМО УДАЛИТЬ:');
    found.forEach(line => {
      const varName = line.split('=')[0].replace('❌ ', '');
      console.log(`unset ${varName}`);
    });
  }
  
  console.log('\n✅ ЧИСТЫЕ ПЕРЕМЕННЫЕ:');
  clean.forEach(line => console.log(line));
  
  // Суммарный статус
  const status = found.length === 0 ? 'ГОТОВО' : 'ТРЕБУЕТ_ОЧИСТКИ';
  console.log(`\n🎯 СТАТУС ЗАДАЧИ 3: ${status}`);
  
  return {
    status,
    conflictsFound: found.length,
    cleanVars: clean.length,
    conflictingVariables: found
  };
}

// Проверка требуемых Supabase переменных
function checkRequiredSupabaseVars() {
  console.log('\n🔧 Проверка обязательных Supabase переменных...');
  
  const required = ['SUPABASE_URL', 'SUPABASE_KEY'];
  const missing = [];
  const present = [];
  
  required.forEach(varName => {
    if (process.env[varName] && process.env[varName].length > 0) {
      present.push(`✅ ${varName} - установлена`);
    } else {
      missing.push(`❌ ${varName} - отсутствует`);
    }
  });
  
  present.forEach(line => console.log(line));
  missing.forEach(line => console.log(line));
  
  return missing.length === 0;
}

async function main() {
  console.log('🚀 ЗАДАЧА 3: Очистка переменных окружения\n');
  
  const conflictCheck = checkEnvironmentConflicts();
  const supabaseCheck = checkRequiredSupabaseVars();
  
  console.log('\n📋 ФИНАЛЬНЫЙ ОТЧЕТ:');
  console.log(`- Конфликтующие переменные: ${conflictCheck.conflictsFound}`);
  console.log(`- Чистые переменные: ${conflictCheck.cleanVars}`); 
  console.log(`- Supabase переменные: ${supabaseCheck ? 'OK' : 'MISSING'}`);
  console.log(`- Общий статус: ${conflictCheck.status}`);
  
  if (conflictCheck.status === 'ГОТОВО' && supabaseCheck) {
    console.log('\n✅ ЗАДАЧА 3 ЗАВЕРШЕНА УСПЕШНО');
    console.log('Переменные окружения очищены от конфликтов');
  } else {
    console.log('\n⚠️ ЗАДАЧА 3 ТРЕБУЕТ ДОПОЛНИТЕЛЬНОЙ РАБОТЫ');
  }
}

main().catch(console.error);