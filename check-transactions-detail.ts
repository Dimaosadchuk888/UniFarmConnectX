import { supabase } from './core/supabaseClient';

async function checkTransactionsDetail() {
  console.log('=== Детальная проверка транзакций MISSION_REWARD ===\n');
  
  // 1. Найдем транзакцию миссии ID 592867 которая показывается в UI
  const { data: tx592867 } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', 592867)
    .single();
    
  if (tx592867) {
    console.log('Транзакция 592867 (которая показывается в UI):');
    console.log('- User ID:', tx592867.user_id);
    console.log('- Type:', tx592867.type);
    console.log('- Amount:', tx592867.amount);
    console.log('- Amount UNI:', tx592867.amount_uni);
    console.log('- Currency:', tx592867.currency);
    console.log('- Description:', tx592867.description);
    console.log('- Created:', tx592867.created_at);
  }
  
  console.log('\n');
  
  // 2. Проверим баланс пользователя 76
  const { data: user76 } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton')
    .eq('id', 76)
    .single();
    
  console.log('Пользователь 76:');
  console.log('- ID:', user76?.id);
  console.log('- Telegram ID:', user76?.telegram_id);
  console.log('- Username:', user76?.username);
  console.log('- Balance UNI:', user76?.balance_uni);
  console.log('- Balance TON:', user76?.balance_ton);
  
  console.log('\n');
  
  // 3. Проверим транзакции юзера 74 за последний час
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentTx74 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false });
    
  console.log('Недавние транзакции user 74:');
  if (recentTx74 && recentTx74.length > 0) {
    recentTx74.forEach(tx => {
      console.log(`- ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount} ${tx.currency}, Time: ${tx.created_at}`);
    });
  } else {
    console.log('Нет транзакций за последний час');
  }
  
  console.log('\n');
  
  // 4. Проверим недавние миссии всех пользователей
  const { data: recentMissions } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'MISSION_REWARD')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false });
    
  console.log('Все недавние MISSION_REWARD транзакции:');
  recentMissions?.forEach(tx => {
    console.log(`- User: ${tx.user_id}, Amount: ${tx.amount} ${tx.currency}, Desc: ${tx.description}, Time: ${tx.created_at}`);
  });
  
  console.log('\n');
  
  // 5. Проверим обновление баланса user 76
  console.log('Проверка обновления баланса после транзакции 592867:');
  console.log('- Транзакция создана:', tx592867?.created_at);
  console.log('- Текущий баланс user 76:', user76?.balance_uni, 'UNI');
  console.log('- Amount в транзакции:', tx592867?.amount || 0);
  console.log('- Amount_uni в транзакции:', tx592867?.amount_uni || 0);
  
  process.exit(0);
}

checkTransactionsDetail().catch(console.error);