import { supabase } from './core/supabaseClient';

async function auditTonFarmingStop() {
  console.log('=== АНАЛИЗ ОСТАНОВКИ TON FARMING ===\n');
  
  const targetUsers = [186, 187, 188, 189, 190];
  
  // 1. Проверяем последние FARMING_REWARD для этих пользователей
  console.log('1. ПОСЛЕДНИЕ FARMING_REWARD В TON И UNI:');
  
  for (const userId of targetUsers) {
    console.log(`\nUser ${userId}:`);
    
    // Последний TON farming
    const { data: lastTon } = await supabase
      .from('transactions')
      .select('amount, created_at, description')
      .eq('user_id', userId)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (lastTon) {
      console.log(`├── Последний TON: ${lastTon.amount} TON - ${lastTon.created_at}`);
      const hours = Math.floor((Date.now() - new Date(lastTon.created_at).getTime()) / (1000 * 60 * 60));
      console.log(`│   (${hours} часов назад)`);
    } else {
      console.log(`├── Последний TON: НЕ НАЙДЕНО`);
    }
    
    // Последний UNI farming
    const { data: lastUni } = await supabase
      .from('transactions')
      .select('amount, created_at')
      .eq('user_id', userId)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (lastUni) {
      console.log(`└── Последний UNI: ${lastUni.amount} UNI - ${lastUni.created_at}`);
    }
  }
  
  // 2. Проверяем статус в ton_farming_data
  console.log('\n\n2. СТАТУС В ton_farming_data:');
  const { data: farmingData } = await supabase
    .from('ton_farming_data')
    .select('*')
    .in('user_id', targetUsers);
    
  if (farmingData && farmingData.length > 0) {
    farmingData.forEach(data => {
      console.log(`\nUser ${data.user_id}:`);
      console.log(`├── farming_balance: ${data.farming_balance} TON`);
      console.log(`├── boost_active: ${data.boost_active}`);
      console.log(`├── boost_package_id: ${data.boost_package_id}`);
      console.log(`├── daily_rate: ${data.daily_rate}%`);
      console.log(`├── last_update: ${data.last_update}`);
      console.log(`└── created_at: ${data.created_at}`);
    });
  } else {
    console.log('❌ Записи в ton_farming_data НЕ НАЙДЕНЫ!');
  }
  
  // 3. Проверяем общую статистику TON farming
  console.log('\n\n3. ОБЩАЯ СТАТИСТИКА TON FARMING:');
  const { data: recentTonFarming } = await supabase
    .from('transactions')
    .select('user_id')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Последние 2 часа
    .order('created_at', { ascending: false });
    
  if (recentTonFarming && recentTonFarming.length > 0) {
    const uniqueUsers = new Set(recentTonFarming.map(t => t.user_id));
    console.log(`✅ ${uniqueUsers.size} пользователей получили TON farming за последние 2 часа`);
    console.log(`   Всего транзакций: ${recentTonFarming.length}`);
  } else {
    console.log('❌ НИКТО не получал TON farming за последние 2 часа!');
  }
  
  // 4. Проверяем farming calculator логи
  console.log('\n\n4. ВОЗМОЖНЫЕ ПРИЧИНЫ:');
  console.log('├── 1. Farming calculator перестал обрабатывать TON farming');
  console.log('├── 2. У пользователей 186-190 истек срок boost пакета');
  console.log('├── 3. Изменилась логика начисления TON farming');
  console.log('└── 4. Проблема с cron задачей для TON farming');
}

auditTonFarmingStop();