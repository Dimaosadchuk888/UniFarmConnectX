/**
 * Углубленная проверка TON Boost для User 74
 * Поиск истории депозитов в разных местах
 */

import { supabase } from './core/supabase';

async function checkTonBoostDeep() {
  console.log('🔍 УГЛУБЛЕННАЯ ПРОВЕРКА TON BOOST');
  console.log('=' .repeat(60));
  
  const userId = 74;

  // 1. Проверка транзакций BOOST_PURCHASE
  console.log('\n📊 1. ПОИСК ТРАНЗАКЦИЙ ПОКУПКИ BOOST:');
  console.log('-'.repeat(60));
  
  const { data: boostTransactions, error: transError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'BOOST_PURCHASE')
    .order('created_at', { ascending: false });

  if (!transError && boostTransactions) {
    console.log(`Найдено транзакций BOOST_PURCHASE: ${boostTransactions.length}`);
    boostTransactions.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.description} - ${t.amount_ton || t.amount_uni} ${t.currency} (${new Date(t.created_at).toLocaleString()})`);
    });
  }

  // 2. Проверка транзакций с metadata о TON Boost
  console.log('\n📊 2. ПОИСК ТРАНЗАКЦИЙ С METADATA TON BOOST:');
  console.log('-'.repeat(60));
  
  const { data: metadataTransactions, error: metaError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!metaError && metadataTransactions) {
    const tonBoostRelated = metadataTransactions.filter(t => 
      t.metadata?.boost_package_id || 
      t.metadata?.original_type?.includes('BOOST') ||
      t.description?.toLowerCase().includes('boost')
    );
    
    console.log(`Найдено транзакций связанных с TON Boost: ${tonBoostRelated.length}`);
    tonBoostRelated.slice(0, 10).forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.type}: ${t.description}`);
      console.log(`     Metadata: ${JSON.stringify(t.metadata)}`);
      console.log(`     Сумма: ${t.amount_ton || t.amount_uni} ${t.currency}`);
      console.log(`     Дата: ${new Date(t.created_at).toLocaleString()}`);
    });
  }

  // 3. История изменений farming_balance
  console.log('\n📊 3. АНАЛИЗ ИСТОРИИ FARMING_BALANCE:');
  console.log('-'.repeat(60));
  
  // Получаем все транзакции пользователя за последние 7 дней
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: allTransactions, error: allError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: true });

  if (!allError && allTransactions) {
    // Ищем моменты, когда могли быть депозиты
    const possibleDeposits = allTransactions.filter(t => 
      t.amount_ton && parseFloat(t.amount_ton) < 0 || // Отрицательные суммы
      t.description?.includes('пакет') || 
      t.description?.includes('Boost') ||
      t.description?.includes('депозит')
    );
    
    console.log(`Возможные депозиты (по описанию): ${possibleDeposits.length}`);
    possibleDeposits.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.type}: ${t.description} - ${t.amount_ton || t.amount_uni} ${t.currency}`);
    });
  }

  // 4. Проверка данных в users таблице
  console.log('\n📊 4. ПРОВЕРКА ДАННЫХ В ТАБЛИЦЕ USERS:');
  console.log('-'.repeat(60));
  
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_package, ton_farming_deposit, ton_farming_balance, ton_farming_rate')
    .eq('id', userId)
    .single();

  if (!userError && userData) {
    console.log(`User ID: ${userData.id}`);
    console.log(`Balance TON: ${userData.balance_ton}`);
    console.log(`TON Boost Package: ${userData.ton_boost_package}`);
    console.log(`TON Farming Deposit: ${userData.ton_farming_deposit}`);
    console.log(`TON Farming Balance: ${userData.ton_farming_balance}`);
    console.log(`TON Farming Rate: ${userData.ton_farming_rate}`);
  }

  // 5. Итоговый анализ
  console.log('\n📊 5. ИТОГОВЫЙ АНАЛИЗ:');
  console.log('-'.repeat(60));
  
  const { data: tonFarmingData } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (tonFarmingData) {
    console.log('\n🔸 Текущее состояние TON Boost:');
    console.log(`  • Farming Balance: ${tonFarmingData.farming_balance} TON`);
    console.log(`  • Начало фарминга: ${new Date(tonFarmingData.farming_start_timestamp).toLocaleString()}`);
    console.log(`  • Последнее обновление: ${new Date(tonFarmingData.farming_last_update).toLocaleString()}`);
    
    // Расчет времени работы
    const startTime = new Date(tonFarmingData.farming_start_timestamp).getTime();
    const now = Date.now();
    const hoursActive = (now - startTime) / (1000 * 60 * 60);
    
    console.log(`  • Время работы: ${hoursActive.toFixed(1)} часов`);
    console.log(`  • Ожидаемый доход: ${(tonFarmingData.farming_balance * tonFarmingData.farming_rate * hoursActive / 24).toFixed(3)} TON`);
  }
}

// Запускаем проверку
checkTonBoostDeep().catch(console.error);