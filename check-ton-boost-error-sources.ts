/**
 * Дополнительная проверка источников ошибок TON Boost
 * Поиск SQL ошибок и проблем с metadata
 */

import { supabase } from './core/supabase.js';

async function checkErrorSources() {
  console.log('=== ПРОВЕРКА ИСТОЧНИКОВ ОШИБОК TON BOOST ===');
  console.log('Дата:', new Date().toISOString());
  console.log('\n');

  // 1. Проверка последних ошибок в логах
  console.log('🔍 1. ПОИСК SQL ОШИБОК В ПОСЛЕДНИХ ТРАНЗАКЦИЯХ');
  console.log('=' .repeat(50));
  
  // Получаем транзакции с metadata за последний час
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data: recentTx, error: e1 } = await supabase
    .from('transactions')
    .select('id, type, metadata, created_at, description')
    .gte('created_at', oneHourAgo)
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (e1) {
    console.error('❌ Ошибка получения транзакций:', e1);
  } else if (recentTx) {
    console.log(`Проверяем ${recentTx.length} транзакций за последний час:`);
    
    let errorCount = 0;
    const errorExamples = [];
    
    for (const tx of recentTx) {
      try {
        // Проверяем является ли metadata валидным JSON
        if (typeof tx.metadata === 'string') {
          const parsed = JSON.parse(tx.metadata);
          
          // Проверяем структуру для TON Boost транзакций
          if (tx.type === 'BOOST_PURCHASE' || tx.description?.includes('TON Boost')) {
            if (!parsed.boost_package_id && !parsed.original_type) {
              console.log(`⚠️ TX ${tx.id}: Неполная структура metadata`);
            }
          }
        }
      } catch (e) {
        errorCount++;
        errorExamples.push({
          id: tx.id,
          type: tx.type,
          error: e.message,
          metadata: tx.metadata
        });
      }
    }
    
    if (errorCount > 0) {
      console.log(`\n❌ Найдено ${errorCount} транзакций с невалидным JSON:`);
      errorExamples.forEach(ex => {
        console.log(`\nTX ${ex.id} (${ex.type}):`);
        console.log(`Metadata: ${ex.metadata}`);
        console.log(`Ошибка: ${ex.error}`);
      });
    } else {
      console.log('✅ Все metadata валидны');
    }
  }

  // 2. Проверка типов данных в ton_farming_data
  console.log('\n\n🔍 2. ПРОВЕРКА ТИПОВ ДАННЫХ В TON_FARMING_DATA');
  console.log('=' .repeat(50));
  
  const { data: tonData, error: e2 } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance, farming_rate, boost_package_id')
    .limit(10);

  if (!e2 && tonData) {
    console.log('Проверяем типы данных:');
    
    tonData.forEach(row => {
      const balanceType = typeof row.farming_balance;
      const rateType = typeof row.farming_rate;
      const packageType = typeof row.boost_package_id;
      
      if (balanceType !== 'number' || rateType !== 'number' || packageType !== 'number') {
        console.log(`\n⚠️ User ${row.user_id}:`);
        console.log(`  farming_balance: ${row.farming_balance} (тип: ${balanceType})`);
        console.log(`  farming_rate: ${row.farming_rate} (тип: ${rateType})`);
        console.log(`  boost_package_id: ${row.boost_package_id} (тип: ${packageType})`);
      }
    });
  }

  // 3. Проверка конфликтов при upsert операциях
  console.log('\n\n🔍 3. ПРОВЕРКА ДУБЛИКАТОВ И КОНФЛИКТОВ');
  console.log('=' .repeat(50));
  
  // Проверяем есть ли дубликаты user_id в ton_farming_data
  const { data: duplicates, error: e3 } = await supabase
    .rpc('check_ton_farming_duplicates');

  if (e3) {
    // Альтернативный метод
    const { data: allUsers } = await supabase
      .from('ton_farming_data')
      .select('user_id')
      .order('user_id');
    
    if (allUsers) {
      const userCounts = {};
      allUsers.forEach(row => {
        userCounts[row.user_id] = (userCounts[row.user_id] || 0) + 1;
      });
      
      const duplicateUsers = Object.entries(userCounts)
        .filter(([_, count]) => count > 1);
      
      if (duplicateUsers.length > 0) {
        console.log('❌ Найдены дубликаты user_id:');
        duplicateUsers.forEach(([userId, count]) => {
          console.log(`  User ${userId}: ${count} записей`);
        });
      } else {
        console.log('✅ Дубликатов user_id не найдено');
      }
    }
  }

  // 4. Анализ транзакций без metadata
  console.log('\n\n🔍 4. ТРАНЗАКЦИИ БЕЗ METADATA');
  console.log('=' .repeat(50));
  
  const { data: noMetaTx, error: e4 } = await supabase
    .from('transactions')
    .select('id, type, created_at')
    .eq('type', 'BOOST_PURCHASE')
    .is('metadata', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!e4 && noMetaTx) {
    console.log(`Найдено ${noMetaTx.length} BOOST_PURCHASE транзакций без metadata:`);
    noMetaTx.forEach(tx => {
      console.log(`  TX ${tx.id}: ${tx.created_at}`);
    });
  }

  // 5. Проверка последних изменений farming_balance
  console.log('\n\n🔍 5. ПОСЛЕДНИЕ ИЗМЕНЕНИЯ FARMING_BALANCE');
  console.log('=' .repeat(50));
  
  const { data: user74Data, error: e5 } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', 74)
    .single();

  if (!e5 && user74Data) {
    console.log('User 74 текущее состояние:');
    console.log(`  farming_balance: ${user74Data.farming_balance}`);
    console.log(`  farming_rate: ${user74Data.farming_rate}`);
    console.log(`  boost_package_id: ${user74Data.boost_package_id}`);
    console.log(`  last_update: ${user74Data.farming_last_update}`);
    
    // Получаем последние изменения баланса из транзакций
    const { data: lastChanges } = await supabase
      .from('transactions')
      .select('created_at, type, amount, amount_ton, description')
      .eq('user_id', 74)
      .in('type', ['BOOST_PURCHASE', 'FARMING_REWARD'])
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (lastChanges) {
      console.log('\nПоследние изменения:');
      lastChanges.forEach(tx => {
        const amount = parseFloat(tx.amount_ton || tx.amount || '0');
        const sign = tx.type === 'BOOST_PURCHASE' ? '-' : '+';
        console.log(`  ${tx.created_at}: ${sign}${amount} TON (${tx.type})`);
      });
    }
  }

  console.log('\n=== КОНЕЦ ПРОВЕРКИ ОШИБОК ===');
}

// Запускаем проверки
checkErrorSources()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Критическая ошибка:', err);
    process.exit(1);
  });