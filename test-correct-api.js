const { supabase } = require('./core/supabase');

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
      
    console.log('Создана транзакция:', transaction);
    
    // Проверяем баланс пользователя
    const { data: user } = await supabase
      .from('users')
      .select('id, telegram_id, balance_uni, balance_ton')
      .eq('id', 48)
      .single();
      
    console.log('Баланс пользователя:', user);
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

testCorrectAPI();
