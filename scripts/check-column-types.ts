import { supabase } from '../core/supabase.js';

async function checkColumnTypes() {
  console.log('🔍 ПРОВЕРКА ТИПОВ КОЛОНОК');
  console.log('='.repeat(80));
  
  try {
    // Получаем пример данных для анализа
    const { data } = await supabase
      .from('users')
      .select('ton_boost_package, ton_boost_package_id')
      .limit(10);

    if (data) {
      console.log('\nПримеры данных:');
      data.forEach((row, i) => {
        console.log(`Строка ${i + 1}:`);
        console.log(`  ton_boost_package: ${row.ton_boost_package} (${typeof row.ton_boost_package})`);
        console.log(`  ton_boost_package_id: ${row.ton_boost_package_id} (${typeof row.ton_boost_package_id})`);
      });
    }

    // Проверяем конкретные значения
    const { data: specificData } = await supabase
      .from('users')
      .select('ton_boost_package, ton_boost_package_id')
      .not('ton_boost_package', 'is', null)
      .limit(5);

    if (specificData && specificData.length > 0) {
      console.log('\n\nЗаписи с ton_boost_package не NULL:');
      specificData.forEach(row => {
        console.log(`- ton_boost_package: ${row.ton_boost_package}, ton_boost_package_id: ${row.ton_boost_package_id}`);
      });
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkColumnTypes();