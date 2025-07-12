import { supabase } from './core/supabase';

async function testApiTransactions() {
  console.log('=== Тестирование API транзакций ===\n');

  try {
    // 1. Проверяем, что возвращает API без фильтров
    console.log('1. Запрос всех транзакций (без фильтра по валюте):');
    const { data: allTx, error: allError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .order('created_at', { ascending: false })
      .limit(50);

    if (allError) {
      console.error('Ошибка:', allError);
      return;
    }

    const types = allTx?.reduce((acc, tx) => {
      acc[tx.type] = (acc[tx.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    console.log('Найдено транзакций:', allTx?.length || 0);
    console.log('Типы:', types);
    
    // Проверяем наличие FARMING_REWARD
    const farmingRewards = allTx?.filter(tx => tx.type === 'FARMING_REWARD') || [];
    console.log(`FARMING_REWARD транзакций в первых 50: ${farmingRewards.length}`);

    // 2. Проверяем фильтр по валюте UNI (как делает UI)
    console.log('\n2. Запрос с фильтром currency=UNI:');
    const { data: uniTx, error: uniError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('currency', 'UNI')
      .order('created_at', { ascending: false })
      .limit(20);

    if (uniError) {
      console.error('Ошибка:', uniError);
    } else {
      const uniTypes = uniTx?.reduce((acc, tx) => {
        acc[tx.type] = (acc[tx.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      console.log('Найдено транзакций:', uniTx?.length || 0);
      console.log('Типы:', uniTypes);
      
      const uniFarmingRewards = uniTx?.filter(tx => tx.type === 'FARMING_REWARD') || [];
      console.log(`FARMING_REWARD транзакций: ${uniFarmingRewards.length}`);
    }

    // 3. Проверяем структуру FARMING_REWARD транзакций
    console.log('\n3. Структура FARMING_REWARD транзакций:');
    const { data: farmingTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(3);

    farmingTx?.forEach((tx, i) => {
      console.log(`\nТранзакция ${i+1}:`);
      console.log(`  ID: ${tx.id}`);
      console.log(`  type: ${tx.type}`);
      console.log(`  currency: ${tx.currency}`);
      console.log(`  amount: ${tx.amount}`);
      console.log(`  amount_uni: ${tx.amount_uni}`);
      console.log(`  amount_ton: ${tx.amount_ton}`);
      console.log(`  created_at: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
      console.log(`  description: ${tx.description}`);
    });

    // 4. Проверяем, что именно видит UI
    console.log('\n4. Симуляция запроса из UI (page=1, limit=20, currency=UNI):');
    
    // Сначала без фильтра currency
    const { data: uiData1 } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .order('created_at', { ascending: false })
      .range(0, 19);

    const uiTypes1 = uiData1?.reduce((acc, tx) => {
      if (tx.currency === 'UNI' || tx.amount_uni > 0) {
        acc[tx.type] = (acc[tx.type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    console.log('UNI транзакции (проверка по currency или amount_uni):', uiTypes1);

    // 5. Проверяем проблему с полем currency
    console.log('\n5. Анализ поля currency в FARMING_REWARD:');
    const { data: currencyCheck } = await supabase
      .from('transactions')
      .select('currency, count')
      .eq('user_id', 74)
      .eq('type', 'FARMING_REWARD');

    const currencyStats = currencyCheck?.reduce((acc, row) => {
      const curr = row.currency || 'NULL';
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    console.log('Значения поля currency в FARMING_REWARD:', currencyStats);

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

testApiTransactions();