import { supabase } from './core/supabase';

async function checkAndFixBalance() {
  console.log('Проверяем текущий баланс пользователя 74...');
  
  // Получаем текущий баланс
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, balance_uni, balance_ton, uni_farming_active, uni_deposit_amount')
    .eq('id', 74)
    .single();
    
  if (userError) {
    console.error('Ошибка получения пользователя:', userError);
    return;
  }
  
  console.log('Текущее состояние:');
  console.log(`  Баланс UNI: ${user.balance_uni}`);
  console.log(`  Баланс TON: ${user.balance_ton}`);
  console.log(`  Фарминг активен: ${user.uni_farming_active ? 'ДА' : 'НЕТ'}`);
  console.log(`  Депозит: ${user.uni_deposit_amount} UNI`);
  
  // Получаем сумму всех FARMING_REWARD транзакций
  const { data: rewardSum, error: sumError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .eq('status', 'completed');
    
  if (sumError) {
    console.error('Ошибка получения суммы транзакций:', sumError);
    return;
  }
  
  const totalRewards = rewardSum?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;
  console.log(`\nСумма всех FARMING_REWARD транзакций: ${totalRewards} UNI`);
  
  // Получаем сумму всех депозитов (отрицательные FARMING_REWARD)
  const { data: depositSum, error: depositError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', 74)
    .in('type', ['FARMING_REWARD', 'FARMING_DEPOSIT'])
    .eq('status', 'completed')
    .lt('amount', 0);
    
  const totalDeposits = Math.abs(depositSum?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0);
  console.log(`Сумма всех депозитов: ${totalDeposits} UNI`);
  
  // Вычисляем ожидаемый баланс (предполагаем начальный баланс 1000000)
  const initialBalance = 1000000;
  const expectedBalance = initialBalance - totalDeposits + totalRewards;
  
  console.log(`\nРасчёт баланса:`);
  console.log(`  Начальный баланс: ${initialBalance} UNI`);
  console.log(`  Минус депозиты: -${totalDeposits} UNI`);
  console.log(`  Плюс награды: +${totalRewards} UNI`);
  console.log(`  Ожидаемый баланс: ${expectedBalance} UNI`);
  console.log(`  Текущий баланс в БД: ${user.balance_uni} UNI`);
  console.log(`  Разница: ${parseFloat(user.balance_uni) - expectedBalance} UNI`);
  
  // Проверяем последнюю транзакцию, которая не была применена к балансу
  const { data: lastTx, error: lastTxError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    
  if (lastTx) {
    console.log(`\nПоследняя транзакция:`);
    console.log(`  ID: ${lastTx.id}`);
    console.log(`  Сумма: ${lastTx.amount} UNI`);
    console.log(`  Время: ${lastTx.created_at}`);
    
    // Проверяем, нужно ли добавить эту сумму к балансу
    const shouldBeBalance = parseFloat(user.balance_uni) + parseFloat(lastTx.amount);
    console.log(`\nЕсли добавить последнюю транзакцию:`);
    console.log(`  ${user.balance_uni} + ${lastTx.amount} = ${shouldBeBalance} UNI`);
  }
}

checkAndFixBalance()
  .then(() => process.exit(0))
  .catch(console.error);