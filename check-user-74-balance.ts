import { supabase } from './core/supabaseClient';

async function checkUser74Balance() {
  console.log('=== Проверка текущего состояния user 74 ===\n');
  
  // 1. Проверяем баланс и данные пользователя
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();
    
  console.log('Данные пользователя 74:');
  console.log('- ID:', user?.id);
  console.log('- Telegram ID:', user?.telegram_id);
  console.log('- Username:', user?.username);
  console.log('- Balance UNI:', user?.balance_uni);
  console.log('- Balance TON:', user?.balance_ton);
  console.log('- UNI Farming Active:', user?.uni_farming_active);
  console.log('- UNI Deposit Amount:', user?.uni_deposit_amount);
  
  console.log('\n');
  
  // 2. Проверяем последние транзакции
  const { data: recentTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('Последние 5 транзакций:');
  recentTx?.forEach(tx => {
    const amount = tx.amount || tx.amount_uni || tx.amount_ton || 0;
    const currency = tx.currency || (tx.amount_uni > 0 ? 'UNI' : 'TON');
    console.log(`- [${tx.created_at}] ${tx.type}: ${amount} ${currency}`);
  });
  
  console.log('\n');
  
  // 3. Проверяем наличие транзакций миссий
  const { data: missionTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('type', 'MISSION_REWARD')
    .order('created_at', { ascending: false });
    
  console.log(`Транзакций миссий у user 74: ${missionTx?.length || 0}`);
  if (missionTx && missionTx.length > 0) {
    console.log('Миссии:');
    missionTx.forEach(tx => {
      console.log(`- ${tx.description}: ${tx.amount_uni} UNI`);
    });
  }
  
  console.log('\n');
  
  // 4. Проверяем изменение депозита
  console.log('Изменения в фарминге:');
  console.log('- Предыдущий депозит: 281767 UNI');
  console.log('- Текущий депозит:', user?.uni_deposit_amount, 'UNI');
  console.log('- Разница:', (user?.uni_deposit_amount || 0) - 281767, 'UNI');
  
  process.exit(0);
}

checkUser74Balance().catch(console.error);