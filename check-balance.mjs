import { supabase } from './core/supabase.js';

async function checkUserBalance() {
  // Проверяем пользователя с telegram_id 43 (демо пользователь)
  const { data: user, error } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton')
    .eq('telegram_id', 43)
    .single();
    
  console.log('=== ПОЛЬЗОВАТЕЛЬ ===');
  console.log('User:', user);
  
  if (user) {
    // Проверяем транзакции для этого пользователя
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, type, amount_uni, amount_ton, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    console.log('\n=== ТРАНЗАКЦИИ ===');
    console.log(`Найдено транзакций: ${transactions?.length || 0}`);
    
    if (transactions && transactions.length > 0) {
      let totalUni = 0;
      let totalTon = 0;
      
      transactions.forEach(tx => {
        console.log(`- ${tx.type}: ${tx.amount_uni} UNI, ${tx.amount_ton} TON (${tx.created_at})`);
        if (tx.status === 'confirmed') {
          totalUni += parseFloat(tx.amount_uni || 0);
          totalTon += parseFloat(tx.amount_ton || 0);
        }
      });
      
      console.log(`\n=== ИТОГИ ===`);
      console.log(`Сумма всех транзакций: ${totalUni} UNI, ${totalTon} TON`);
      console.log(`Баланс в БД: ${user.balance_uni} UNI, ${user.balance_ton} TON`);
      console.log(`Разница: ${user.balance_uni - totalUni} UNI`);
    }
  }
}

checkUserBalance();
