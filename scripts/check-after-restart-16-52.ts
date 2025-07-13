import { supabase } from '../core/supabase';

async function checkAfterRestart() {
  const restartTime = new Date('2025-07-13T16:52:00.000Z');
  
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, user_id, amount_ton, metadata, created_at')
    .eq('currency', 'TON')
    .eq('type', 'FARMING_REWARD')
    .gte('created_at', restartTime.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\nTON Boost transactions after server restart (16:52):`);
  console.log(`Found: ${transactions?.length || 0} transactions\n`);
  
  if (!transactions || transactions.length === 0) {
    console.log('⏳ No new transactions yet. TON Boost scheduler runs every 5 minutes.');
    console.log('Next run expected around 16:55-16:57');
    return;
  }
  
  let correctCount = 0;
  let wrongCount = 0;
  
  transactions.forEach((tx, index) => {
    const createdAt = new Date(tx.created_at);
    const originalType = tx.metadata?.original_type;
    const isCorrect = originalType === 'TON_BOOST_INCOME';
    
    if (isCorrect) correctCount++;
    else wrongCount++;
    
    console.log(`${index + 1}. ID: ${tx.id} | User: ${tx.user_id} | Time: ${createdAt.toLocaleTimeString('ru-RU')}`);
    console.log(`   Amount: ${tx.amount_ton} TON`);
    console.log(`   original_type: ${originalType || 'NOT SET'}`);
    console.log(`   Status: ${isCorrect ? '✅ CORRECT!' : '❌ WRONG'}\n`);
  });
  
  console.log('\n📊 Summary:');
  console.log(`Total TON transactions: ${transactions.length}`);
  console.log(`With correct metadata: ${correctCount}`);
  console.log(`With wrong metadata: ${wrongCount}`);
  
  if (correctCount > 0) {
    console.log('\n✅ SUCCESS! Metadata fix is working!');
  } else {
    console.log('\n❌ Metadata fix not working yet. Check if server properly restarted.');
  }
}

checkAfterRestart().catch(console.error);