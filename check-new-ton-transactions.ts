import { supabase } from './core/supabase.js';

async function checkNewTransactions() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  console.log('🔍 Проверка новых транзакций TON Boost (последние 5 минут)\n');
  
  const { data, error } = await supabase
    .from('transactions')
    .select('user_id, amount_ton, description, metadata, created_at')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .gt('amount_ton', 0)
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Ошибка:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`✅ Найдено ${data.length} новых транзакций:\n`);
    
    data.forEach((tx, index) => {
      console.log(`${index + 1}. User ${tx.user_id}: +${tx.amount_ton} TON`);
      console.log(`   ${tx.description}`);
      
      if (tx.metadata?.original_type === 'TON_BOOST_INCOME') {
        console.log(`   ✨ ИСПРАВЛЕНИЕ РАБОТАЕТ! Metadata: ${JSON.stringify(tx.metadata)}`);
      }
      console.log('');
    });
  } else {
    console.log('❌ Новых транзакций за последние 5 минут не найдено');
    console.log('\nВозможные причины:');
    console.log('1. Планировщик еще не запустился');
    console.log('2. Нужно подождать следующего цикла (каждые 5 минут)');
  }
  
  console.log(`\nТекущее время: ${new Date().toLocaleTimeString()}`);
}

checkNewTransactions().catch(console.error);