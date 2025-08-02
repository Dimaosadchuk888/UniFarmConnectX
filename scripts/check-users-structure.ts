import { supabase } from '../core/supabase.js';

async function checkUsersStructure() {
  console.log('🔍 ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ USERS');
  console.log('='.repeat(80));
  
  try {
    // Получаем одну запись для анализа структуры
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Ошибка:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('\nДоступные колонки в таблице users:');
      console.log('-'.repeat(40));
      
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        const value = data[0][col];
        const type = value === null ? 'null' : typeof value;
        console.log(`- ${col} (${type})`);
      });
      
      console.log('\n\nПроверка наличия ключевых колонок:');
      console.log(`- updated_at: ${columns.includes('updated_at') ? '✅ Есть' : '❌ Нет'}`);
      console.log(`- created_at: ${columns.includes('created_at') ? '✅ Есть' : '❌ Нет'}`);
      console.log(`- uni_farming_start_timestamp: ${columns.includes('uni_farming_start_timestamp') ? '✅ Есть' : '❌ Нет'}`);
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkUsersStructure();