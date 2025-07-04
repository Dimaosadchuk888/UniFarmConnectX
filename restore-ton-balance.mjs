/**
 * Восстановление TON баланса для пользователя 48
 * Добавляет достаточно средств для тестирования множественных покупок
 */

import { createClient } from '@supabase/supabase-js';

async function restoreTonBalance() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('💰 ВОССТАНОВЛЕНИЕ TON БАЛАНСА ПОЛЬЗОВАТЕЛЯ 48');
  console.log('='.repeat(50));
  
  const userId = 48;
  const targetBalance = 1000; // Добавляем 1000 TON для тестирования
  
  try {
    // Получаем текущий баланс
    const { data: currentUser, error: getUserError } = await supabase
      .from('users')
      .select('balance_ton, username')
      .eq('id', userId)
      .single();
    
    if (getUserError) {
      console.log('❌ Ошибка получения пользователя:', getUserError.message);
      return;
    }
    
    console.log(`👤 Пользователь: ${currentUser.username}`);
    console.log(`💰 Текущий баланс: ${currentUser.balance_ton} TON`);
    
    // Обновляем баланс
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ balance_ton: targetBalance.toString() })
      .eq('id', userId)
      .select()
      .single();
    
    if (updateError) {
      console.log('❌ Ошибка обновления баланса:', updateError.message);
      return;
    }
    
    console.log(`✅ Баланс обновлен: ${currentUser.balance_ton} → ${updatedUser.balance_ton} TON`);
    
    // Создаем транзакцию пополнения для отслеживания
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert([{
        user_id: userId,
        type: 'FARMING_REWARD',
        amount_ton: (targetBalance - parseFloat(currentUser.balance_ton)).toString(),
        description: `💳 TON Deposit для тестирования: пополнение баланса до ${targetBalance} TON`,
        status: 'completed'
      }])
      .select()
      .single();
    
    if (txError) {
      console.log('⚠️ Ошибка создания транзакции:', txError.message);
    } else {
      console.log(`📊 Транзакция создана: ID ${transaction.id}`);
      console.log(`📝 Описание: ${transaction.description}`);
    }
    
    console.log('\n🎯 РЕЗУЛЬТАТ:');
    console.log(`   • Пользователь готов к тестированию`);
    console.log(`   • Баланс: ${targetBalance} TON`);
    console.log(`   • Доступно для покупки: ${Math.floor(targetBalance / 10)} пакетов по 10 TON`);
    console.log(`   • Доступно для покупки: ${Math.floor(targetBalance / 50)} пакетов по 50 TON`);
    
  } catch (error) {
    console.log('❌ Общая ошибка:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('💰 ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО');
}

restoreTonBalance();