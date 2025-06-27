import { createClient } from '@supabase/supabase-js';

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkwMzA3NywiZXhwIjoyMDY1NDc5MDc3fQ.pjlz8qlmQLUa9BZb12pt9QZU5Fk9YvqxpSZGA84oqog';

async function checkDepositGrowth() {
  try {
    console.log('🔍 Проверка роста депозитов в системе UniFarm...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. Получение пользователей с активными UNI депозитами
    console.log('\n📈 Проверка UNI депозитов...');
    const { data: uniDeposits, error: uniError } = await supabase
      .from('users')
      .select(`
        id, 
        telegram_id, 
        username, 
        balance_uni, 
        balance_ton,
        uni_deposit_amount,
        uni_farming_start_timestamp,
        uni_farming_last_update,
        uni_farming_rate,
        created_at
      `)
      .not('uni_deposit_amount', 'is', null)
      .not('uni_deposit_amount', 'eq', '0')
      .order('uni_farming_start_timestamp', { ascending: true });
    
    if (uniError) {
      console.error('❌ UNI deposits query error:', uniError);
    } else {
      console.log(`✅ Найдено ${uniDeposits.length} активных UNI депозитов:`);
      
      uniDeposits.forEach(user => {
        const startDate = new Date(user.uni_farming_start_timestamp);
        const lastUpdate = user.uni_farming_last_update ? new Date(user.uni_farming_last_update) : null;
        const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const expectedRate = 0.01; // 1% в день из FARMING_CONFIG.DEFAULT_RATE
        const depositAmount = parseFloat(user.uni_deposit_amount || '0');
        const expectedGrowth = depositAmount * expectedRate * daysSinceStart;
        const currentBalance = parseFloat(user.balance_uni || '0');
        
        console.log(`\n  🌾 User ${user.id} (${user.username || user.telegram_id}):`);
        console.log(`    📅 Депозит создан: ${startDate.toISOString().split('T')[0]} (${daysSinceStart} дней назад)`);
        console.log(`    💰 Сумма депозита: ${user.uni_deposit_amount} UNI`);
        console.log(`    📊 Ставка: ${user.uni_farming_rate || expectedRate} в день`);
        console.log(`    💵 Текущий баланс: ${user.balance_uni} UNI`);
        console.log(`    🎯 Ожидаемый доход: ${expectedGrowth.toFixed(6)} UNI (при 1% в день)`);
        console.log(`    📈 Фактический рост: ${(currentBalance - depositAmount).toFixed(6)} UNI`);
        console.log(`    ⚖️  Соотношение: ${currentBalance >= depositAmount + expectedGrowth * 0.9 ? '✅ Норма' : '⚠️ Отставание'}`);
        
        if (lastUpdate) {
          const hoursSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60));
          console.log(`    🔄 Последнее обновление: ${hoursSinceUpdate} часов назад`);
        }
      });
    }
    
    // 2. Получение пользователей с TON Boost пакетами
    console.log('\n\n🚀 Проверка TON Boost депозитов...');
    const { data: tonBoosts, error: tonError } = await supabase
      .from('users')
      .select(`
        id, 
        telegram_id, 
        username, 
        balance_uni, 
        balance_ton,
        ton_farming_balance,
        ton_farming_rate,
        ton_farming_start_timestamp,
        ton_farming_last_update,
        created_at
      `)
      .not('ton_farming_balance', 'is', null)
      .not('ton_farming_balance', 'eq', '0')
      .order('ton_farming_start_timestamp', { ascending: true });
    
    if (tonError) {
      console.error('❌ TON Boost query error:', tonError);
    } else {
      console.log(`✅ Найдено ${tonBoosts.length} активных TON Boost депозитов:`);
      
      tonBoosts.forEach(user => {
        const startDate = new Date(user.ton_farming_start_timestamp);
        const lastUpdate = user.ton_farming_last_update ? new Date(user.ton_farming_last_update) : null;
        const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const depositAmount = parseFloat(user.ton_farming_balance || '0');
        const dailyRate = parseFloat(user.ton_farming_rate || '0.001'); // Ставка может варьироваться от 1% до 3%
        const expectedGrowth = depositAmount * dailyRate * daysSinceStart;
        const currentTonBalance = parseFloat(user.balance_ton || '0');
        
        console.log(`\n  🎯 User ${user.id} (${user.username || user.telegram_id}):`);
        console.log(`    📅 TON Boost создан: ${startDate.toISOString().split('T')[0]} (${daysSinceStart} дней назад)`);
        console.log(`    💰 Депозит TON: ${user.ton_farming_balance} TON`);
        console.log(`    📊 Ставка: ${(dailyRate * 100).toFixed(1)}% в день`);
        console.log(`    💵 Текущий баланс TON: ${user.balance_ton} TON`);
        console.log(`    🎯 Ожидаемый доход: ${expectedGrowth.toFixed(8)} TON`);
        console.log(`    📈 Фактический рост: ${(currentTonBalance - depositAmount).toFixed(8)} TON`);
        console.log(`    ⚖️  Соотношение: ${currentTonBalance >= expectedGrowth * 0.8 ? '✅ Норма' : '⚠️ Отставание'}`);
        
        if (lastUpdate) {
          const hoursSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60));
          console.log(`    🔄 Последнее обновление: ${hoursSinceUpdate} часов назад`);
        }
      });
    }
    
    // 3. Анализ транзакций начисления процентов
    console.log('\n\n💰 Анализ транзакций начислений...');
    const { data: rewardTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .in('transaction_type', ['FARMING_REWARD', 'REFERRAL_REWARD'])
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (txError) {
      console.error('❌ Transactions query error:', txError);
    } else {
      console.log(`✅ Последние ${rewardTransactions.length} транзакций начислений:`);
      
      const groupedByType = rewardTransactions.reduce((acc, tx) => {
        if (!acc[tx.transaction_type]) acc[tx.transaction_type] = [];
        acc[tx.transaction_type].push(tx);
        return acc;
      }, {});
      
      Object.entries(groupedByType).forEach(([type, transactions]) => {
        console.log(`\n  📝 ${type}: ${transactions.length} транзакций`);
        transactions.slice(0, 5).forEach(tx => {
          const date = new Date(tx.created_at).toISOString().split('T')[0];
          console.log(`    - User ${tx.user_id}: ${tx.amount_uni || tx.amount_ton || '0'} ${tx.amount_uni ? 'UNI' : 'TON'} (${date})`);
        });
      });
    }
    
    // 4. Проверка планировщиков
    console.log('\n\n⚙️ Статус планировщиков начислений...');
    console.log('📋 Конфигурация из model.ts:');
    console.log('  - UNI Farming: 1% в день (0.01)');
    console.log('  - TON Boost пакеты: 1%-3% в день в зависимости от пакета');
    console.log('  - Начисления должны происходить каждые 5 минут');
    
    console.log('\n✅ Анализ роста депозитов завершен');
    
  } catch (error) {
    console.error('❌ Deposit growth check failed:', error);
  }
}

checkDepositGrowth();