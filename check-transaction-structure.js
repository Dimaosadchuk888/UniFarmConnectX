// Проверка структуры транзакций в базе данных
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTransactionStructure() {
  try {
    console.log('=== АНАЛИЗ СТРУКТУРЫ ТРАНЗАКЦИЙ ===\n');
    
    // Получаем последние транзакции пользователя 48
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 48)
      .eq('type', 'MISSION_REWARD')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Ошибка получения транзакций:', error);
      return;
    }

    console.log(`Найдено ${transactions?.length || 0} транзакций MISSION_REWARD\n`);

    // Выводим структуру транзакций
    transactions?.forEach((tx, index) => {
      console.log(`Транзакция ${index + 1}:`);
      console.log(`- ID: ${tx.id}`);
      console.log(`- Type: ${tx.type}`);
      console.log(`- Status: ${tx.status}`);
      console.log(`- Amount: ${tx.amount}`);
      console.log(`- Amount UNI: ${tx.amount_uni}`);
      console.log(`- Amount TON: ${tx.amount_ton}`);
      console.log(`- Currency: ${tx.currency}`);
      console.log(`- Description: ${tx.description}`);
      console.log(`- Created: ${tx.created_at}`);
      console.log(`- Все поля:`, Object.keys(tx));
      console.log('');
    });

    // Проверяем общее количество транзакций по типам
    const { data: typeCounts, error: countError } = await supabase
      .from('transactions')
      .select('type, count')
      .eq('user_id', 48);

    if (!countError && typeCounts) {
      console.log('\nТипы транзакций пользователя:');
      const typeMap = {};
      typeCounts.forEach(tx => {
        typeMap[tx.type] = (typeMap[tx.type] || 0) + 1;
      });
      Object.entries(typeMap).forEach(([type, count]) => {
        console.log(`- ${type}: ${count}`);
      });
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkTransactionStructure();