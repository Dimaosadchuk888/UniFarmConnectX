const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkReferralsTable() {
  console.log('=== ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ REFERRALS ===\n');
  
  try {
    // Получаем одну запись чтобы увидеть структуру
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Ошибка получения данных:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Структура таблицы referrals:');
      console.log('Поля:', Object.keys(data[0]));
      console.log('Пример записи:', data[0]);
    } else {
      console.log('📊 Таблица referrals пуста');
    }
    
    // Проверяем все записи
    const { data: allData, error: allError } = await supabase
      .from('referrals')
      .select('*');
    
    if (allError) {
      console.log('❌ Ошибка получения всех записей:', allError.message);
    } else {
      console.log(`📊 Всего записей в referrals: ${allData.length}`);
      
      if (allData.length > 0) {
        console.log('Все записи:');
        allData.forEach((record, index) => {
          console.log(`${index + 1}. ${JSON.stringify(record)}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

checkReferralsTable();