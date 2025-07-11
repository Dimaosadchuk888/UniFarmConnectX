import { supabase } from './core/supabaseClient';

async function checkTransactionsAfterFix() {
  console.log('=== Проверка транзакций после исправления конфликтов ===\n');
  
  // 1. Проверяем пользователя 74
  const { data: user74 } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();
    
  console.log('Пользователь 74:');
  console.log('- ID:', user74?.id);
  console.log('- Telegram ID:', user74?.telegram_id);
  console.log('- Username:', user74?.username);
  console.log('- Balance UNI:', user74?.balance_uni);
  console.log('- Balance TON:', user74?.balance_ton);
  
  console.log('\n');
  
  // 2. Проверяем, есть ли транзакции для user 74
  const { data: transactions74, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', 74)
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log(`Транзакций у user 74: ${count}`);
  
  if (transactions74 && transactions74.length > 0) {
    console.log('\nПоследние транзакции user 74:');
    transactions74.forEach(tx => {
      console.log(`- ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount || tx.amount_uni || tx.amount_ton} ${tx.currency || 'UNI'}, Time: ${tx.created_at}`);
    });
  } else {
    console.log('У пользователя 74 нет транзакций');
  }
  
  console.log('\n');
  
  // 3. Проверяем user mapping по telegram_id
  const { data: userByTelegram } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', 999489)
    .single();
    
  if (userByTelegram) {
    console.log('Пользователь найден по telegram_id 999489:');
    console.log('- ID:', userByTelegram.id);
    console.log('- Должен быть 74:', userByTelegram.id === 74 ? '✅' : '❌');
  } else {
    console.log('Пользователь с telegram_id 999489 не найден ❌');
  }
  
  console.log('\n');
  
  // 4. Проверяем все пользователи с похожими telegram_id
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, telegram_id, username')
    .or('telegram_id.eq.74,telegram_id.eq.999489,id.in.(74,75,76)');
    
  console.log('Все пользователи с потенциальными конфликтами:');
  allUsers?.forEach(user => {
    console.log(`- User ${user.id}: telegram_id=${user.telegram_id}, username=${user.username}`);
  });
  
  process.exit(0);
}

checkTransactionsAfterFix().catch(console.error);