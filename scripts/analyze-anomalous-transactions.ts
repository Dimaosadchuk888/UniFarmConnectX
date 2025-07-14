import { supabase } from '../core/supabase';

async function analyzeAnomalousTransactions() {
  console.log('=== Анализ аномальных транзакций User 74 ===\n');
  
  // Получаем последние крупные транзакции User 74
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'UNI')
    .gt('amount', '2000')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Найдено ${transactions?.length || 0} аномальных транзакций (>2000 UNI):`);
  console.log('====================================================\n');
  
  for (const tx of transactions || []) {
    const amount = parseFloat(tx.amount_uni || tx.amount);
    const created = new Date(tx.created_at);
    console.log(`Transaction ID: ${tx.id}`);
    console.log(`Сумма: ${amount.toFixed(2)} UNI`);
    console.log(`Дата создания: ${created.toLocaleString()}`);
    console.log(`Описание: ${tx.description}`);
    
    // Анализ периодов накопления
    const depositAmount = 6440942; // uni_deposit_amount User 74
    const rate = 0.01; // 1% в день
    const expectedPer5min = depositAmount * rate * 5 / 1440; // депозит * rate * 5мин / 1440мин
    const periods = Math.round(amount / expectedPer5min);
    
    console.log(`\nАнализ периодов:`);
    console.log(`- Депозит: ${depositAmount} UNI`);
    console.log(`- Ставка: ${rate * 100}% в день`);
    console.log(`- Ожидаемый доход за 5 мин: ${expectedPer5min.toFixed(2)} UNI`);
    console.log(`- Количество накопленных периодов: ${periods}`);
    console.log(`- Это примерно ${periods * 5} минут (${(periods * 5 / 60).toFixed(1)} часов)`);
    
    // Проверка metadata
    if (tx.metadata) {
      console.log('\nMetadata:', JSON.stringify(tx.metadata, null, 2));
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  }
  
  // Проверим также общую статистику
  const { data: stats } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'UNI');
    
  if (stats) {
    const total = stats.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    console.log(`\nОбщая статистика:`);
    console.log(`- Всего FARMING_REWARD транзакций: ${stats.length}`);
    console.log(`- Общая сумма начислений: ${total.toFixed(2)} UNI`);
    console.log(`- Средняя сумма транзакции: ${(total / stats.length).toFixed(2)} UNI`);
  }
  
  process.exit(0);
}

analyzeAnomalousTransactions().catch(console.error);