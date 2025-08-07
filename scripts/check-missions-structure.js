import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function checkMissionsStructure() {
  console.log('🔍 Проверка структуры таблицы missions...\n');
  
  // Получить информацию о колонках таблицы
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .limit(1);
    
  if (error) {
    console.log('❌ Ошибка:', error.message);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('✅ Структура таблицы missions:');
    console.log('Колонки:', Object.keys(data[0]));
    console.log('\nПример записи:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('⚠️  Таблица missions пустая, но существует');
    
    // Попробуем получить структуру через SQL
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'missions' })
      .single();
      
    if (!schemaError && schemaData) {
      console.log('\nСтруктура таблицы из схемы:');
      console.log(schemaData);
    }
  }
}

checkMissionsStructure();