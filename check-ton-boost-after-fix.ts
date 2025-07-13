import { supabase } from './core/supabase.js';

async function checkTonBoostAfterFix() {
  console.log('🔍 Проверка работы TON Boost после исправления\n');
  
  // 1. Проверяем последние транзакции
  const { data: latestTransactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'FARMING_REWARD')
    .not('metadata->>original_type', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (latestTransactions && latestTransactions.length > 0) {
    console.log(`✅ Найдено ${latestTransactions.length} новых транзакций TON Boost:\n`);
    
    latestTransactions.forEach(tx => {
      console.log(`ID: ${tx.id}`);
      console.log(`User: ${tx.user_id}`);
      console.log(`Amount: +${tx.amount_ton} TON`);
      console.log(`Created: ${new Date(tx.created_at).toLocaleString()}`);
      console.log(`Metadata:`, tx.metadata);
      console.log('---');
    });
  } else {
    console.log('❌ Новых транзакций TON Boost пока не найдено');
    console.log('\nЭто нормально если прошло меньше 5 минут с момента перезапуска');
  }
  
  // 2. Проверяем активных пользователей
  const { data: activeUsers } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('boost_active', true);
    
  console.log(`\n📊 Активных пользователей TON Boost: ${activeUsers?.length || 0}`);
  
  // 3. Рассчитываем ожидаемый доход
  if (activeUsers && activeUsers.length > 0) {
    let totalExpectedIncome = 0;
    
    for (const user of activeUsers) {
      const userId = parseInt(user.user_id.toString());
      const { data: userBalance } = await supabase
        .from('users')
        .select('balance_ton')
        .eq('id', userId)
        .single();
        
      if (userBalance) {
        const deposit = parseFloat(userBalance.balance_ton || '0');
        const fiveMinuteIncome = deposit * 0.01 / 288;
        totalExpectedIncome += fiveMinuteIncome;
      }
    }
    
    console.log(`💰 Ожидаемый доход всех пользователей: ${totalExpectedIncome.toFixed(6)} TON каждые 5 минут`);
    console.log(`📈 Это примерно ${(totalExpectedIncome * 288).toFixed(2)} TON в день`);
  }
  
  console.log('\n⏰ Планировщик запускается каждые 5 минут');
  console.log('✅ Следующий запуск должен создать транзакции для всех активных пользователей');
}

checkTonBoostAfterFix();