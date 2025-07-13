import { supabase } from './core/supabase';

async function checkFixStatus() {
  console.log('=== БЫСТРАЯ ПРОВЕРКА СТАТУСА ===\n');
  
  // 1. Проверяем использование правильной таблицы
  console.log('📊 1. ПРОВЕРКА ТАБЛИЦЫ ton_farming_data:\n');
  
  const { data: tonFarmingData, error: tfdError } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance, boost_package_id, updated_at')
    .eq('user_id', 74)
    .single();

  if (!tfdError && tonFarmingData) {
    console.log('✅ Таблица ton_farming_data доступна');
    console.log(`User 74: farming_balance=${tonFarmingData.farming_balance}, package_id=${tonFarmingData.boost_package_id}`);
    console.log(`Последнее обновление: ${tonFarmingData.updated_at}\n`);
  } else {
    console.log('❌ Ошибка доступа к ton_farming_data:', tfdError);
  }

  // 2. Проверяем последние транзакции TON
  console.log('💰 2. ПОСЛЕДНИЕ TON ТРАНЗАКЦИИ:\n');
  
  const { data: recentTx, error: txError } = await supabase
    .from('transactions')
    .select('id, user_id, amount, created_at')
    .eq('currency', 'TON')
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!txError && recentTx) {
    if (recentTx.length > 0) {
      console.log('✅ Найдены недавние транзакции:');
      recentTx.forEach(tx => {
        console.log(`  ID: ${tx.id}, User: ${tx.user_id}, Сумма: +${tx.amount} TON, Время: ${tx.created_at}`);
      });
    } else {
      console.log('⏳ Пока нет новых транзакций');
    }
  }

  // 3. Проверяем активных пользователей
  console.log('\n👥 3. АКТИВНЫЕ TON BOOST ПОЛЬЗОВАТЕЛИ:\n');
  
  const { data: activeUsers, error: activeError } = await supabase
    .from('ton_farming_data')
    .select('user_id')
    .eq('boost_active', true);

  if (!activeError && activeUsers) {
    console.log(`Всего активных пользователей: ${activeUsers.length}`);
    
    // Проверяем, обновляется ли farming_balance
    const { data: withBalance } = await supabase
      .from('ton_farming_data')
      .select('user_id')
      .eq('boost_active', true)
      .gt('farming_balance', '0');
      
    console.log(`С положительным farming_balance: ${withBalance?.length || 0}`);
    
    if (withBalance && withBalance.length > 0) {
      console.log('✅ farming_balance обновляется корректно!');
    } else {
      console.log('⚠️ farming_balance все еще 0 для всех');
    }
  }

  console.log('\n📈 ЗАКЛЮЧЕНИЕ:');
  console.log('Если farming_balance обновляется - исправление работает.');
  console.log('Транзакции появятся через 5 минут после запуска планировщика.');
}

checkFixStatus();