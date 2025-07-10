
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkTableStructure() {
  // Получаем одну запись для анализа структуры
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Available columns in users table:');
    console.log(Object.keys(data));
    console.log('\nUser 74 full data:');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkTableStructure();

