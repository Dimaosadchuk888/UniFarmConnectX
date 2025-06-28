import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkwMzA3NywiZXhwIjoyMDY1NDc5MDc3fQ.pjlz8qlmQLUa9BZb12pt9QZU5Fk9YvqxpSZGA84oqog';

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Проверка структуры базы данных Supabase...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Проверка структуры таблицы users
    console.log('\n📊 Проверка таблицы users...');
    const { data: userSample, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (userError) {
      console.error('❌ Users table error:', userError);
    } else if (userSample.length > 0) {
      console.log('✅ Поля таблицы users:');
      Object.keys(userSample[0]).forEach(field => {
        console.log(`  - ${field}: ${typeof userSample[0][field]} = "${userSample[0][field]}"`);
      });
    }
    
    // Проверка структуры таблицы transactions
    console.log('\n💰 Проверка таблицы transactions...');
    const { data: txSample, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);
    
    if (txError) {
      console.error('❌ Transactions table error:', txError);
    } else if (txSample.length > 0) {
      console.log('✅ Поля таблицы transactions:');
      Object.keys(txSample[0]).forEach(field => {
        console.log(`  - ${field}: ${typeof txSample[0][field]} = "${txSample[0][field]}"`);
      });
    }
    
    // Анализ последних транзакций
    console.log('\n📈 Последние транзакции для анализа роста:');
    const { data: recentTx, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentError) {
      console.error('❌ Recent transactions error:', recentError);
    } else {
      console.log(`✅ Найдено ${recentTx.length} последних транзакций:`);
      recentTx.forEach(tx => {
        const date = new Date(tx.created_at).toISOString().split('T')[0];
        console.log(`  - User ${tx.user_id}: ${tx.amount_uni || tx.amount_ton || 'N/A'} ${tx.amount_uni ? 'UNI' : 'TON'} (${date})`);
      });
    }
    
    console.log('\n✅ Проверка структуры базы данных завершена');
    
  } catch (error) {
    console.error('❌ Database structure check failed:', error);
  }
}

checkDatabaseStructure();