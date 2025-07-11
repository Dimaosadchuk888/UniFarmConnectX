import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function testDirectTransaction() {
  console.log('\n=== ПРЯМОЙ ТЕСТ СОЗДАНИЯ ТРАНЗАКЦИИ ===\n');
  
  try {
    // Создаем транзакцию напрямую
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        user_id: 74,
        type: 'FARMING_DEPOSIT',
        amount: '999.999',
        amount_uni: '999.999',
        amount_ton: '0',
        currency: 'UNI',
        status: 'confirmed',
        description: 'ПРЯМОЙ ТЕСТ: Создание транзакции без API'
      }])
      .select()
      .single();
      
    if (error) {
      console.error('❌ Ошибка создания транзакции:', error);
      console.error('Детали:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      console.log('✅ Транзакция успешно создана!');
      console.log('ID:', data.id);
      console.log('Type:', data.type);
      console.log('Amount:', data.amount);
      console.log('Currency:', data.currency);
    }
    
    // Проверяем список транзакций
    const { data: allTx } = await supabase
      .from('transactions')
      .select('id, type, amount, currency, created_at')
      .eq('user_id', 74)
      .eq('type', 'FARMING_DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(5);
      
    console.log('\nВсе FARMING_DEPOSIT транзакции user 74:');
    allTx?.forEach(tx => {
      console.log(`  ID ${tx.id} | ${tx.amount} ${tx.currency} | ${tx.created_at}`);
    });
    
  } catch (err) {
    console.error('Критическая ошибка:', err);
  }
}

testDirectTransaction();