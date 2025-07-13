import { supabase } from '../core/supabase';

async function checkNewIncome() {
  // Получаем время последнего перезапуска сервера (примерно 16:42)
  const restartTime = new Date('2025-07-13T16:42:00');
  
  // Получаем все TON Boost income транзакции после перезапуска
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount_ton, metadata, created_at, description')
    .eq('currency', 'TON')
    .like('description', 'TON Boost доход%')
    .gte('created_at', restartTime.toISOString())
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const now = new Date();
  console.log(`\nCurrent time: ${now.toLocaleTimeString('ru-RU')}`);
  console.log(`\nTON Boost income transactions after server restart (16:42):`);
  console.log(`Found: ${data?.length || 0} transactions\n`);
  
  if (!data || data.length === 0) {
    console.log('❌ NO NEW INCOME TRANSACTIONS FOUND!');
    console.log('The scheduler might have stopped or there\'s an issue.');
    return;
  }
  
  let correctCount = 0;
  
  data.forEach((tx, index) => {
    const txTime = new Date(tx.created_at);
    const time = txTime.toLocaleTimeString('ru-RU');
    const hasCorrectMetadata = tx.metadata?.original_type === 'TON_BOOST_INCOME';
    
    if (hasCorrectMetadata) correctCount++;
    
    console.log(`${index + 1}. ID: ${tx.id} | User: ${tx.user_id} | Time: ${time}`);
    console.log(`   Amount: ${tx.amount_ton} TON`);
    console.log(`   original_type: ${tx.metadata?.original_type || 'NOT SET'}`);
    console.log(`   Status: ${hasCorrectMetadata ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log('');
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`Total income transactions: ${data.length}`);
  console.log(`With correct metadata: ${correctCount}`);
  console.log(`With wrong metadata: ${data.length - correctCount}`);
  
  if (correctCount > 0) {
    console.log(`\n✅ SUCCESS! ${correctCount} transactions have correct metadata!`);
  } else {
    console.log(`\n❌ PROBLEM: All transactions still have old metadata.`);
  }
}

checkNewIncome().catch(console.error);