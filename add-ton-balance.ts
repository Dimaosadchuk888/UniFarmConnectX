import { supabase } from './core/supabaseClient';

async function addTonBalance() {
  console.log('=== ПОПОЛНЕНИЕ БАЛАНСА TON ДЛЯ ТЕСТОВ ===\n');
  
  const userId = '184';
  const addAmount = 100;
  
  try {
    // 1. Получаем текущий баланс
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', userId)
      .single();
      
    if (fetchError) throw fetchError;
    
    const currentBalance = currentUser?.balance_ton || 0;
    const newBalance = currentBalance + addAmount;
    
    console.log(`Текущий баланс TON: ${currentBalance}`);
    console.log(`Добавляем: ${addAmount} TON`);
    console.log(`Новый баланс будет: ${newBalance} TON\n`);
    
    // 2. Обновляем баланс
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance_ton: newBalance })
      .eq('id', userId);
      
    if (updateError) throw updateError;
    
    console.log('✅ Баланс успешно обновлен!\n');
    
    // 3. Создаем запись транзакции
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: parseInt(userId),
        amount: addAmount.toString(),
        currency: 'TON',
        type: 'TON_DEPOSIT',
        status: 'COMPLETED',
        description: 'Test deposit for development',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (txError) {
      console.log('⚠️ Предупреждение: не удалось создать запись транзакции:', txError.message);
    } else {
      console.log('✅ Запись транзакции создана!');
    }
    
    // 4. Проверяем результат
    const { data: updatedUser } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', userId)
      .single();
      
    console.log(`\nОкончательный баланс TON: ${updatedUser?.balance_ton}`);
    console.log('\n🎉 Пополнение завершено! Обновите страницу, чтобы увидеть новый баланс.');
    
  } catch (error) {
    console.error('❌ Ошибка при пополнении баланса:', error);
  }
}

addTonBalance();