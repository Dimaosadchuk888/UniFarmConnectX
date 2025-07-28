/**
 * Пополнение баланса пользователя 184 на 100 TON
 */

import { supabase } from '../core/supabase';

async function addBalanceUser184() {
  console.log('💰 ПОПОЛНЕНИЕ БАЛАНСА ПОЛЬЗОВАТЕЛЯ 184 НА 100 TON');
  console.log('=' .repeat(50));
  
  try {
    // 1. Получаем текущий баланс
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_ton')
      .eq('id', 184)
      .single();
    
    if (userError || !user) {
      console.error('❌ Пользователь 184 не найден:', userError);
      return;
    }
    
    const currentBalance = parseFloat(user.balance_ton || '0');
    const addAmount = 100;
    const newBalance = currentBalance + addAmount;
    
    console.log('📊 Текущий баланс:', currentBalance, 'TON');
    console.log('➕ Добавляем:', addAmount, 'TON');
    console.log('🎯 Новый баланс:', newBalance, 'TON');
    
    // 2. Обновляем баланс
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance_ton: newBalance.toString() })
      .eq('id', 184);
    
    if (updateError) {
      console.error('❌ Ошибка обновления баланса:', updateError);
      return;
    }
    
    console.log('✅ Баланс успешно обновлен!');
    
    // 3. Создаем транзакцию для прозрачности
    const { error: transError } = await supabase
      .from('transactions')
      .insert({
        user_id: 184,
        type: 'DEPOSIT',
        amount: addAmount,
        currency: 'TON',
        status: 'completed',
        description: 'Пополнение баланса администратором',
        metadata: {
          admin_deposit: true,
          original_type: 'ADMIN_DEPOSIT',
          source: 'manual_top_up'
        },
        created_at: new Date().toISOString()
      });
    
    if (transError) {
      console.error('⚠️ Ошибка создания транзакции:', transError);
      console.log('✅ Баланс обновлен, но транзакция не создана');
    } else {
      console.log('✅ Транзакция создана для прозрачности');
    }
    
    // 4. Проверяем результат
    const { data: updatedUser } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', 184)
      .single();
    
    console.log('🔍 Проверка результата:');
    console.log('Новый баланс в БД:', updatedUser?.balance_ton, 'TON');
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  }
}

// Запуск
addBalanceUser184().then(() => {
  console.log('\n✅ Операция завершена');
  process.exit(0);
}).catch(error => {
  console.error('❌ Ошибка:', error);
  process.exit(1);
});