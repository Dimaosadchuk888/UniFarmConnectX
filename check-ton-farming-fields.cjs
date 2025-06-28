const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxODE1MTAsImV4cCI6MjA0OTc1NzUxMH0.FeGLX2vWPaVY0pLKErFPhxlqI0AzPMo7IWLcMDKnCwU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTonFarmingFields() {
  console.log('=== Проверка полей TON Farming в базе данных ===\n');
  
  try {
    // Получаем первого пользователя для проверки структуры
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Ошибка при получении данных:', error);
      return;
    }
    
    if (users && users.length > 0) {
      const user = users[0];
      console.log('Найденные поля TON farming в таблице users:');
      
      const tonFields = Object.keys(user).filter(key => 
        key.includes('ton') || key.includes('TON')
      );
      
      tonFields.forEach(field => {
        console.log(`- ${field}: ${user[field]}`);
      });
      
      console.log('\nВСЕ поля пользователя:');
      Object.keys(user).sort().forEach(key => {
        console.log(`- ${key}: ${typeof user[key]}`);
      });
    }
    
    // Проверяем, есть ли поле ton_farming_balance
    console.log('\n=== Проверка конкретного поля ton_farming_balance ===');
    const { data: checkField, error: checkError } = await supabase
      .from('users')
      .select('id, telegram_id, balance_ton, ton_farming_balance')
      .limit(5);
    
    if (checkError) {
      console.log('Ошибка при запросе ton_farming_balance:', checkError.message);
      console.log('Это означает, что поля ton_farming_balance НЕ существует в базе данных.');
    } else {
      console.log('Данные с полем ton_farming_balance:', checkField);
    }
    
  } catch (error) {
    console.error('Общая ошибка:', error);
  }
}

checkTonFarmingFields();