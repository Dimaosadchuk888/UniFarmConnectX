/**
 * Phase 2 UI Updates Verification Script
 * Проверяет обновления интерфейса для использования metadata
 */

import { supabase } from './core/supabase';

async function checkPhase2UIUpdates() {
  console.log('=== PHASE 2 UI UPDATES VERIFICATION ===\n');
  
  // 1. Проверяем транзакции с metadata
  console.log('1. Проверяем транзакции с metadata.original_type:');
  const { data: metadataTransactions, error: metadataError } = await supabase
    .from('transactions')
    .select('id, type, amount, currency, description, metadata')
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (metadataError) {
    console.error('Ошибка получения транзакций:', metadataError);
    return;
  }
  
  console.log(`Найдено ${metadataTransactions?.length || 0} транзакций с metadata:\n`);
  
  metadataTransactions?.forEach(tx => {
    console.log(`ID: ${tx.id}`);
    console.log(`Type: ${tx.type}`);
    console.log(`Amount: ${tx.amount} ${tx.currency}`);
    console.log(`Metadata: ${JSON.stringify(tx.metadata)}`);
    console.log(`Original Type: ${tx.metadata?.original_type || 'Не указан'}`);
    console.log('---');
  });
  
  // 2. Проверяем различные типы транзакций
  console.log('\n2. Статистика по типам транзакций с metadata:');
  const typeStats: Record<string, number> = {};
  
  metadataTransactions?.forEach(tx => {
    const originalType = tx.metadata?.original_type || tx.type;
    typeStats[originalType] = (typeStats[originalType] || 0) + 1;
  });
  
  Object.entries(typeStats).forEach(([type, count]) => {
    console.log(`- ${type}: ${count} транзакций`);
  });
  
  // 3. Проверяем TON Boost транзакции
  console.log('\n3. TON Boost транзакции:');
  const tonBoostTxs = metadataTransactions?.filter(tx => 
    tx.metadata?.original_type === 'TON_BOOST_INCOME' ||
    tx.metadata?.transaction_source === 'ton_boost_scheduler'
  );
  
  console.log(`Найдено ${tonBoostTxs?.length || 0} TON Boost транзакций`);
  tonBoostTxs?.slice(0, 3).forEach(tx => {
    console.log(`- ID ${tx.id}: ${tx.amount} ${tx.currency} (${tx.metadata?.original_type})`);
  });
  
  // 4. Проверяем BOOST_PURCHASE транзакции
  console.log('\n4. BOOST_PURCHASE транзакции:');
  const { data: boostPurchases } = await supabase
    .from('transactions')
    .select('id, type, amount_ton, amount, currency, description')
    .eq('type', 'BOOST_PURCHASE')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log(`Найдено ${boostPurchases?.length || 0} BOOST_PURCHASE транзакций`);
  boostPurchases?.forEach(tx => {
    console.log(`- ID ${tx.id}: ${tx.amount || tx.amount_ton} ${tx.currency} - ${tx.description}`);
  });
  
  console.log('\n=== ПРОВЕРКА ЗАВЕРШЕНА ===');
  console.log('\nОжидаемый результат Phase 2:');
  console.log('✓ TransactionHistory.tsx поддерживает metadata');
  console.log('✓ StyledTransactionItem.tsx использует metadata.original_type');
  console.log('✓ TON Boost транзакции отображаются с правильным типом');
  console.log('✓ Визуальное различие между типами транзакций');
}

// Запускаем проверку
checkPhase2UIUpdates().catch(console.error);