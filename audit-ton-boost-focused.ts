/**
 * Фокусированная верификация TON Boost для ключевых пользователей
 * Роль: Технический аудитор системы
 * Фокус: User 74 и проблемные случаи
 */

import { supabase } from './core/supabase.js';

async function focusedTonBoostAudit() {
  console.log('=== ФОКУСИРОВАННАЯ ВЕРИФИКАЦИЯ TON BOOST ===');
  console.log('Дата аудита:', new Date().toISOString());
  console.log('\n');

  // Список ключевых пользователей для проверки
  const keyUsers = [74, 48, 1, 14, 15]; // User 74 - основной тест, другие - разные случаи

  console.log('🎯 ПРОВЕРКА КЛЮЧЕВЫХ ПОЛЬЗОВАТЕЛЕЙ');
  console.log('=' .repeat(50));

  for (const userId of keyUsers) {
    console.log(`\n👤 ПОЛЬЗОВАТЕЛЬ ${userId}`);
    console.log('-'.repeat(40));

    // Получаем данные из ton_farming_data
    const { data: tonData, error: tError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tError && tError.code !== 'PGRST116') {
      console.error(`❌ Ошибка получения ton_farming_data:`, tError);
      continue;
    }

    if (!tonData) {
      console.log(`⚠️ Нет записи в ton_farming_data`);
      continue;
    }

    console.log(`📊 Данные ton_farming_data:`);
    console.log(`  - farming_balance: ${tonData.farming_balance} TON`);
    console.log(`  - farming_rate: ${tonData.farming_rate}`);
    console.log(`  - boost_package_id: ${tonData.boost_package_id}`);
    console.log(`  - farming_start: ${tonData.farming_start_timestamp}`);
    console.log(`  - last_update: ${tonData.farming_last_update}`);

    // Получаем все BOOST_PURCHASE транзакции
    const { data: purchases, error: pError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'BOOST_PURCHASE')
      .order('created_at', { ascending: false })
      .limit(10);

    if (pError) {
      console.error(`❌ Ошибка получения транзакций:`, pError);
      continue;
    }

    console.log(`\n💰 Транзакции BOOST_PURCHASE (последние 10):`);
    let totalPurchased = 0;
    
    for (const purchase of purchases || []) {
      const amount = parseFloat(purchase.amount_ton || purchase.amount || '0');
      totalPurchased += amount;
      
      console.log(`  📝 ${purchase.created_at}:`);
      console.log(`     - ID: ${purchase.id}`);
      console.log(`     - Сумма: ${amount} TON`);
      console.log(`     - Описание: ${purchase.description}`);
      
      // Детальная проверка metadata
      if (purchase.metadata) {
        try {
          const metadata = typeof purchase.metadata === 'string' 
            ? JSON.parse(purchase.metadata) 
            : purchase.metadata;
          console.log(`     - Metadata:`, JSON.stringify(metadata, null, 8));
        } catch (e) {
          console.log(`     - ⚠️ Невалидный metadata:`, purchase.metadata);
        }
      }
    }

    console.log(`\n💵 Сумма всех покупок: ${totalPurchased} TON`);
    console.log(`📊 Текущий farming_balance: ${tonData.farming_balance} TON`);
    
    const difference = totalPurchased - parseFloat(tonData.farming_balance || '0');
    if (Math.abs(difference) > 0.01) {
      console.log(`❌ РАСХОЖДЕНИЕ: ${difference} TON`);
    } else {
      console.log(`✅ Баланс соответствует покупкам`);
    }

    // Проверяем последние доходы
    const { data: incomes, error: iError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'FARMING_REWARD')
      .like('description', '%TON Boost%')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!iError && incomes && incomes.length > 0) {
      console.log(`\n📈 Последние начисления дохода:`);
      
      for (const income of incomes) {
        const amount = parseFloat(income.amount_ton || income.amount || '0');
        console.log(`  📝 ${income.created_at}: +${amount} TON`);
        
        // Проверяем metadata
        if (income.metadata) {
          try {
            const metadata = typeof income.metadata === 'string' 
              ? JSON.parse(income.metadata) 
              : income.metadata;
            if (metadata.original_type) {
              console.log(`     - original_type: ${metadata.original_type}`);
            }
          } catch (e) {
            // Игнорируем ошибки парсинга
          }
        }
      }

      // Рассчитываем ожидаемый доход
      const expectedIncome = parseFloat(tonData.farming_balance || '0') * 
                           parseFloat(tonData.farming_rate || '0.01') * 
                           5 / 1440; // За 5 минут
      console.log(`\n💡 Ожидаемый доход за 5 мин: ${expectedIncome.toFixed(6)} TON`);
    }
  }

  // Проверка SQL ошибок
  console.log('\n\n🔍 ПРОВЕРКА SQL ОШИБОК С METADATA');
  console.log('=' .repeat(50));

  // Получаем проблемные транзакции
  const { data: recentTx, error: rtError } = await supabase
    .from('transactions')
    .select('id, type, metadata, created_at')
    .or('type.eq.BOOST_PURCHASE,type.eq.FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!rtError && recentTx) {
    let validCount = 0;
    let invalidCount = 0;
    const invalidExamples = [];

    for (const tx of recentTx) {
      if (tx.metadata) {
        try {
          if (typeof tx.metadata === 'string') {
            JSON.parse(tx.metadata);
          }
          validCount++;
        } catch (e) {
          invalidCount++;
          if (invalidExamples.length < 3) {
            invalidExamples.push({
              id: tx.id,
              type: tx.type,
              metadata: tx.metadata,
              error: e.message
            });
          }
        }
      }
    }

    console.log(`✅ Валидный JSON metadata: ${validCount} транзакций`);
    console.log(`❌ Невалидный JSON metadata: ${invalidCount} транзакций`);
    
    if (invalidExamples.length > 0) {
      console.log(`\n📋 Примеры невалидных metadata:`);
      for (const example of invalidExamples) {
        console.log(`  - TX ${example.id} (${example.type}):`);
        console.log(`    Metadata: ${example.metadata}`);
        console.log(`    Ошибка: ${example.error}`);
      }
    }
  }

  // Итоговая статистика по проблемным пользователям
  console.log('\n\n📊 СВОДКА ПО ПРОБЛЕМНЫМ ПОЛЬЗОВАТЕЛЯМ');
  console.log('=' .repeat(50));

  // Ищем пользователей с farming_balance = 0 но с покупками
  const { data: allTonUsers, error: atuError } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance, boost_package_id')
    .eq('farming_balance', 0)
    .order('user_id');

  if (!atuError && allTonUsers) {
    console.log(`\n❗ Пользователи с farming_balance = 0: ${allTonUsers.length}`);
    
    // Проверяем есть ли у них покупки
    const problemUsers = [];
    for (const user of allTonUsers.slice(0, 10)) { // Проверяем первых 10
      const { data: hasPurchases } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', user.user_id)
        .eq('type', 'BOOST_PURCHASE')
        .limit(1);
      
      if (hasPurchases && hasPurchases.length > 0) {
        problemUsers.push(user.user_id);
      }
    }

    if (problemUsers.length > 0) {
      console.log(`\n❌ Пользователи с покупками но farming_balance = 0:`);
      console.log(`   ${problemUsers.join(', ')}`);
    }
  }

  console.log('\n=== КОНЕЦ ФОКУСИРОВАННОЙ ВЕРИФИКАЦИИ ===');
}

// Запускаем аудит
focusedTonBoostAudit()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Критическая ошибка:', err);
    process.exit(1);
  });