import { supabase } from './core/supabase';

async function manualBalanceSync() {
  console.log('=== Ручная синхронизация баланса ===\n');
  
  const userId = 74;
  
  // Получаем текущее состояние
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (userError) {
    console.error('Ошибка получения пользователя:', userError);
    return;
  }
  
  console.log('Текущее состояние пользователя:');
  console.log(`  ID: ${user.id}`);
  console.log(`  Баланс UNI: ${user.balance_uni}`);
  console.log(`  Баланс TON: ${user.balance_ton}`);
  console.log(`  Депозит: ${user.uni_deposit_amount} UNI`);
  console.log(`  Фарминг активен: ${user.uni_farming_active ? 'ДА' : 'НЕТ'}`);
  
  // Получаем последнюю не примененную транзакцию
  const { data: lastTx, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'FARMING_REWARD')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    
  if (txError) {
    console.error('Ошибка получения транзакции:', txError);
    return;
  }
  
  console.log('\nПоследняя транзакция FARMING_REWARD:');
  console.log(`  ID: ${lastTx.id}`);
  console.log(`  Сумма: ${lastTx.amount} UNI`);
  console.log(`  Время: ${lastTx.created_at}`);
  
  // Обновляем баланс
  const newBalance = parseFloat(user.balance_uni) + parseFloat(lastTx.amount);
  
  console.log('\nПрименяем транзакцию к балансу:');
  console.log(`  Текущий баланс: ${user.balance_uni} UNI`);
  console.log(`  + Транзакция: ${lastTx.amount} UNI`);
  console.log(`  = Новый баланс: ${newBalance} UNI`);
  
  const { error: updateError } = await supabase
    .from('users')
    .update({ 
      balance_uni: newBalance,
      uni_farming_last_update: new Date().toISOString()
    })
    .eq('id', userId);
    
  if (updateError) {
    console.error('Ошибка обновления баланса:', updateError);
    return;
  }
  
  console.log('\n✅ Баланс успешно обновлен!');
  
  // Отправляем WebSocket уведомление
  try {
    const { BalanceNotificationService } = await import('./core/balanceNotificationService.js');
    const notificationService = BalanceNotificationService.getInstance();
    
    notificationService.notifyBalanceUpdate({
      userId: userId,
      balanceUni: newBalance,
      balanceTon: parseFloat(user.balance_ton),
      changeAmount: parseFloat(lastTx.amount),
      currency: 'UNI',
      source: 'manual_sync',
      timestamp: new Date().toISOString()
    });
    
    console.log('\n✅ WebSocket уведомление отправлено!');
  } catch (error) {
    console.error('Ошибка отправки уведомления:', error);
  }
}

manualBalanceSync()
  .then(() => {
    console.log('\nСинхронизация завершена');
    process.exit(0);
  })
  .catch(console.error);