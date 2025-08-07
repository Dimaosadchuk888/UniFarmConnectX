import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function checkMissionsColumns() {
  console.log('🔍 Получаем точную структуру колонок таблицы missions...\n');
  
  // Используем системную таблицу для получения информации о колонках
  const { data, error } = await supabase
    .rpc('get_raw_sql', { 
      query: `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'missions' 
        ORDER BY ordinal_position
      ` 
    });
    
  if (error) {
    // Если RPC не работает, попробуем другой способ
    console.log('⚠️  RPC метод недоступен, пробуем альтернативный способ...');
    
    // Пробуем вставить тестовую запись и посмотреть на ошибку
    const { error: insertError } = await supabase
      .from('missions')
      .insert({
        id: 999,
        title: 'TEST',
        description: 'TEST'
      });
      
    if (insertError) {
      console.log('\n❌ Ошибка при вставке (это нормально, мы анализируем ошибку):');
      console.log(insertError.message);
      console.log('\nИз ошибки видно, какие поля обязательные.');
    }
    
    // Удаляем тестовую запись если она создалась
    await supabase.from('missions').delete().eq('id', 999);
  } else if (data) {
    console.log('✅ Структура колонок таблицы missions:');
    console.log('----------------------------------------');
    data.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
  }
}

checkMissionsColumns();