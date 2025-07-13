import { supabase } from '../core/supabase';

async function checkTiming() {
  // Получаем последние TON Boost транзакции
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, amount_ton, created_at, metadata')
    .eq('currency', 'TON')
    .like('description', 'TON Boost%')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const now = new Date();
  console.log(`\nCurrent time: ${now.toLocaleTimeString('ru-RU')}`);
  console.log(`\nLast 10 TON Boost transactions:`);
  
  data?.forEach((tx, index) => {
    const txTime = new Date(tx.created_at);
    const diffMinutes = Math.floor((now.getTime() - txTime.getTime()) / (1000 * 60));
    const time = txTime.toLocaleTimeString('ru-RU');
    
    console.log(`\n${index + 1}. ID: ${tx.id} | User: ${tx.user_id}`);
    console.log(`   Time: ${time} (${diffMinutes} minutes ago)`);
    console.log(`   original_type: ${tx.metadata?.original_type || 'NOT SET'}`);
  });
  
  if (data && data.length > 0) {
    const lastTx = new Date(data[0].created_at);
    const timeSinceLast = Math.floor((now.getTime() - lastTx.getTime()) / (1000 * 60));
    
    console.log(`\n⏰ Time since last TON Boost transaction: ${timeSinceLast} minutes`);
    
    if (timeSinceLast >= 5) {
      console.log(`\n⚠️ WARNING: No new transactions for ${timeSinceLast} minutes!`);
      console.log(`The scheduler should run every 5 minutes.`);
    }
  }
}

checkTiming().catch(console.error);