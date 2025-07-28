/**
 * Ручное обновление баланса пользователя 184 прямым запросом к БД
 */

import { supabase } from '../core/supabase';

async function manualBalanceUpdate() {
  console.log('💰 РУЧНОЕ ОБНОВЛЕНИЕ БАЛАНСА ПОЛЬЗОВАТЕЛЯ 184');
  console.log('=' .repeat(50));
  
  try {
    const userId = 184;
    const addAmount = 100;
    
    // 1. Получаем текущий баланс
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_ton')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      console.error('❌ Пользователь не найден:', userError);
      return;
    }
    
    const currentBalance = parseFloat(user.balance_ton || '0');
    const newBalance = currentBalance + addAmount;
    
    console.log('📊 Текущий баланс:', currentBalance, 'TON');
    console.log('➕ Добавляем:', addAmount, 'TON');
    console.log('🎯 Новый баланс будет:', newBalance, 'TON');
    
    // 2. Обновляем баланс напрямую
    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({ 
        balance_ton: newBalance.toString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('balance_ton');
    
    if (updateError) {
      console.error('❌ Ошибка обновления:', updateError);
      return;
    }
    
    console.log('✅ Баланс обновлен в БД:', updateResult?.[0]?.balance_ton, 'TON');
    
    // 3. Создаем запись транзакции для истории
    const { data: transResult, error: transError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'FARMING_REWARD', // Используем тип который точно обновляет баланс
        amount: addAmount,
        currency: 'TON',
        status: 'completed',
        description: 'Пополнение баланса администратором (ручное)',
        metadata: {
          admin_deposit: true,
          manual_top_up: true,
          source: 'manual_balance_update'
        },
        created_at: new Date().toISOString()
      })
      .select('id, amount');
    
    if (transError) {
      console.error('⚠️ Ошибка создания транзакции:', transError);
    } else {
      console.log('✅ Транзакция создана ID:', transResult?.[0]?.id);
    }
    
    // 4. Финальная проверка
    const { data: finalUser } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', userId)
      .single();
    
    console.log('\n🔍 ФИНАЛЬНАЯ ПРОВЕРКА:');
    console.log('Баланс в БД:', finalUser?.balance_ton, 'TON');
    console.log('Изменение:', (parseFloat(finalUser?.balance_ton || '0') - currentBalance), 'TON');
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  }
}

// Запуск
manualBalanceUpdate().then(() => {
  console.log('\n✅ Операция завершена');
  process.exit(0);
}).catch(error => {
  console.error('❌ Ошибка:', error);
  process.exit(1);
});