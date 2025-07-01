// Тест создания транзакции миссии с новой структурой полей
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMissionTransaction() {
  try {
    console.log('=== ТЕСТ ТРАНЗАКЦИИ МИССИИ ===\n');
    
    // Создаём тестовую транзакцию миссии с правильной структурой полей
    const { data: newTx, error } = await supabase
      .from('transactions')
      .insert({
        user_id: 48,
        type: 'MISSION_REWARD',
        amount_uni: '500',  // Используем amount_uni
        amount_ton: '0',    // Используем amount_ton
        currency: 'UNI',    // Указываем валюту
        description: 'TEST: Mission 3 reward claimed',
        status: 'completed',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка создания транзакции:', error);
      return;
    }

    console.log('Транзакция создана успешно:');
    console.log(`- ID: ${newTx.id}`);
    console.log(`- amount_uni: ${newTx.amount_uni}`);
    console.log(`- amount_ton: ${newTx.amount_ton}`);
    console.log(`- currency: ${newTx.currency}`);
    console.log(`- status: ${newTx.status}`);
    console.log('');

    // Проверяем баланс пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton')
      .eq('id', 48)
      .single();

    if (!userError && user) {
      console.log('Текущий баланс пользователя:');
      console.log(`- UNI: ${user.balance_uni}`);
      console.log(`- TON: ${user.balance_ton}`);
    }

    // Удаляем тестовую транзакцию
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', newTx.id);

    if (!deleteError) {
      console.log('\n✓ Тестовая транзакция удалена');
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

testMissionTransaction();