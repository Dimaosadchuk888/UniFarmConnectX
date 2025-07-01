import { supabase } from './core/supabase.js';

async function testCorrectAPI() {
  try {
    // Создаём новую транзакцию для проверки
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        user_id: 48,
        type: 'FARMING_REWARD',
        amount_uni: '50',
        amount_ton: '0',
        status: 'confirmed',
        description: 'Test with correct demo user'
      })
      .select()
      .single();
      
    console.log('✓ Создана транзакция:', transaction);
    
    // Проверяем баланс пользователя
    const { data: user } = await supabase
      .from('users')
      .select('id, telegram_id, balance_uni, balance_ton')
      .eq('id', 48)
      .single();
      
    console.log('✓ Баланс пользователя:', user);
    
    // Подсчитаем все транзакции пользователя
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('type, amount_uni')
      .eq('user_id', 48)
      .eq('status', 'confirmed');
      
    const totalUni = allTransactions?.reduce((sum, tx) => sum + parseFloat(tx.amount_uni || 0), 0) || 0;
    console.log(`✓ Всего транзакций: ${allTransactions?.length}`);
    console.log(`✓ Сумма UNI по транзакциям: ${totalUni}`);
    console.log(`✗ Разница с балансом: ${totalUni - parseFloat(user.balance_uni)} UNI`);
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

testCorrectAPI();
