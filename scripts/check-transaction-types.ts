/**
 * Проверка типов транзакций в базе данных UniFarm
 * Выявление отсутствующих типов транзакций
 */

import { supabase } from '../core/supabaseClient';

async function checkTransactionTypes() {
  console.log('=== Проверка типов транзакций в базе данных UniFarm ===\n');
  
  // 1. Получаем все типы транзакций с количеством
  const { data: types, error: typesError } = await supabase
    .rpc('get_transaction_types_count'); // Используем RPC функцию если есть
    
  if (typesError) {
    // Если RPC не работает, используем обычный запрос
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('type')
      .limit(10000);
      
    if (error) {
      console.error('❌ Ошибка получения транзакций:', error);
      return;
    }
    
    // Подсчитываем типы вручную
    const typeCounts: Record<string, number> = {};
    transactions?.forEach(tx => {
      typeCounts[tx.type] = (typeCounts[tx.type] || 0) + 1;
    });
    
    console.log('📊 Типы транзакций в базе данных:');
    console.log('--------------------------------');
    Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`${type}: ${count} транзакций`);
      });
  }
  
  console.log('\n');
  
  // 2. Проверка транзакций с описаниями farming/boost
  console.log('🔍 Поиск транзакций по описанию:');
  console.log('--------------------------------');
  
  const { data: farmingTx } = await supabase
    .from('transactions')
    .select('type, description, created_at')
    .or('description.ilike.%farming%,description.ilike.%boost%')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (farmingTx && farmingTx.length > 0) {
    console.log('Последние транзакции farming/boost:');
    farmingTx.forEach(tx => {
      console.log(`- ${tx.type}: "${tx.description}" (${tx.created_at})`);
    });
  } else {
    console.log('❌ Транзакции с описанием farming/boost не найдены');
  }
  
  console.log('\n');
  
  // 3. Проверка последних транзакций для user_id=74
  console.log('👤 Последние транзакции пользователя 74:');
  console.log('----------------------------------------');
  
  const { data: user74Tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (user74Tx && user74Tx.length > 0) {
    user74Tx.forEach(tx => {
      console.log(`- ${tx.type}: ${tx.amount_uni || 0} UNI, ${tx.amount_ton || 0} TON`);
      console.log(`  Описание: "${tx.description}"`);
      console.log(`  Дата: ${tx.created_at}\n`);
    });
  } else {
    console.log('❌ Транзакции для пользователя 74 не найдены');
  }
  
  console.log('\n');
  
  // 4. Проверка ожидаемых типов транзакций
  console.log('⚠️  Проверка отсутствующих типов транзакций:');
  console.log('--------------------------------------------');
  
  const expectedTypes = [
    'FARMING_REWARD',
    'TON_BOOST_INCOME', 
    'DAILY_BONUS',
    'REFERRAL_REWARD',
    'MISSION_REWARD',
    'BOOST_PURCHASE',
    'FARMING_DEPOSIT'
  ];
  
  for (const type of expectedTypes) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('type', type);
      
    if (count === 0) {
      console.log(`❌ ${type}: НЕ НАЙДЕНО`);
    } else {
      console.log(`✅ ${type}: ${count} транзакций`);
    }
  }
  
  console.log('\n=== Конец проверки ===');
}

// Запуск проверки
checkTransactionTypes().catch(console.error);