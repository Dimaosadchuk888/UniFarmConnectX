import { supabase } from '../core/supabase';

async function analyzeNullDeposits() {
  console.log('=== Анализ пользователей с uni_deposit_amount IS NULL ===\n');
  
  // Получаем всех пользователей с NULL депозитом
  const { data: nullDepositUsers, error } = await supabase
    .from('users')
    .select('id, telegram_id, username, uni_farming_active, balance_uni, created_at')
    .is('uni_deposit_amount', null)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Найдено ${nullDepositUsers?.length || 0} пользователей с uni_deposit_amount = NULL:`);
  console.log('====================================================\n');
  
  // Анализируем каждого пользователя
  for (const user of nullDepositUsers || []) {
    console.log(`User ID: ${user.id} (telegram_id: ${user.telegram_id})`);
    console.log(`Username: ${user.username || 'не указан'}`);
    console.log(`UNI Farming активен: ${user.uni_farming_active ? 'ДА' : 'НЕТ'}`);
    console.log(`Баланс UNI: ${user.balance_uni || 0}`);
    console.log(`Дата регистрации: ${new Date(user.created_at).toLocaleString()}`);
    
    // Проверяем транзакции этого пользователя
    const { data: transactions } = await supabase
      .from('transactions')
      .select('type, amount, created_at')
      .eq('user_id', user.id)
      .eq('currency', 'UNI')
      .in('type', ['FARMING_DEPOSIT', 'FARMING_REWARD'])
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (transactions && transactions.length > 0) {
      console.log('\nПоследние транзакции:');
      for (const tx of transactions) {
        console.log(`  - ${tx.type}: ${tx.amount} UNI (${new Date(tx.created_at).toLocaleDateString()})`);
      }
    } else {
      console.log('\nТранзакций не найдено');
    }
    
    // Проверяем, получает ли пользователь доход при NULL депозите
    if (user.uni_farming_active && !user.uni_deposit_amount) {
      console.log('\n⚠️  ПРОБЛЕМА: Farming активен, но депозит NULL!');
      
      // Проверяем последние FARMING_REWARD
      const { data: rewards } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('user_id', user.id)
        .eq('type', 'FARMING_REWARD')
        .eq('currency', 'UNI')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (rewards && rewards.length > 0) {
        console.log(`   Последний доход: ${rewards[0].amount} UNI (${new Date(rewards[0].created_at).toLocaleDateString()})`);
        console.log('   Доход рассчитывается от balance_uni через fallback!');
      }
    }
    
    console.log('\n' + '-'.repeat(50) + '\n');
  }
  
  // Статистика
  const activeWithNull = nullDepositUsers?.filter(u => u.uni_farming_active) || [];
  console.log('ИТОГОВАЯ СТАТИСТИКА:');
  console.log(`- Всего пользователей с NULL депозитом: ${nullDepositUsers?.length || 0}`);
  console.log(`- Из них с активным farming: ${activeWithNull.length}`);
  console.log(`- Потенциально получают доход от баланса: ${activeWithNull.length}`);
  
  process.exit(0);
}

analyzeNullDeposits().catch(console.error);