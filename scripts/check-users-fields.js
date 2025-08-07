import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserFields() {
  try {
    // Получаем одного пользователя для проверки полей
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Ошибка:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('Доступные поля в таблице users:');
      console.log(Object.keys(data[0]));
    } else {
      console.log('Таблица users пуста');
    }
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkUserFields();