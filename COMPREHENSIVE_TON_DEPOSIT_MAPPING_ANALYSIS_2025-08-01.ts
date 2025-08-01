// КОМПЛЕКСНОЕ ИССЛЕДОВАНИЕ: Как изменился маппинг TON депозитов и где произошла поломка
// Анализируем историю изменений в маппинге транзакций
import { supabase } from './core/supabase';

async function investigateTransactionMappingHistory(): Promise<void> {
  console.log('🔍 КОМПЛЕКСНОЕ РАССЛЕДОВАНИЕ: ИСТОРИЯ МАППИНГА TON ДЕПОЗИТОВ');
  console.log('='.repeat(90));

  console.log('\n📋 КЛЮЧЕВЫЕ ФАКТЫ ОТ ПОЛЬЗОВАТЕЛЯ:');
  console.log('💥 TON_DEPOSIT мапится по-другому в системе');
  console.log('💥 Добавлена новая категория TON_DEPOSIT → система удваивает пополнения');
  console.log('💥 1 TON → 2 одинаковых хеша → 2 пополнения вместо одного');
  console.log('💥 Раньше работало правильно, сломалось после изменений');

  // 1. АНАЛИЗ ТЕКУЩЕГО МАППИНГА В КОДЕ
  console.log('\n1️⃣ ТЕКУЩИЙ МАППИНГ В core/TransactionService.ts:');
  console.log('-'.repeat(80));
  
  console.log('const TRANSACTION_TYPE_MAPPING = {');
  console.log('  "TON_DEPOSIT": "TON_DEPOSIT",            // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ');
  console.log('  "FARMING_REWARD": "FARMING_REWARD",');
  console.log('  "DEPOSIT": "DEPOSIT",                    // Добавлен прямой маппинг');
  console.log('  "TON_BOOST_PURCHASE": "TON_BOOST_PURCHASE", // TON Boost покупки');
  console.log('  // Маппинг расширенных типов на базовые');
  console.log('  "TON_BOOST_INCOME": "FARMING_REWARD",   // TON Boost доходы → FARMING_REWARD');
  console.log('  "UNI_DEPOSIT": "DEPOSIT",               // UNI депозиты → DEPOSIT');
  console.log('  "BOOST_PURCHASE": "BOOST_PAYMENT",      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ');
  console.log('};');

  console.log('\n🎯 АНАЛИЗ: Есть маппинг TON_DEPOSIT → TON_DEPOSIT');
  console.log('❓ ВОПРОС: Был ли TON_DEPOSIT в enum transaction_type раньше?');

  // 2. ПРОВЕРКА ENUM В БАЗЕ ДАННЫХ
  console.log('\n2️⃣ ПРОВЕРКА ENUM transaction_type В БАЗЕ ДАННЫХ:');
  console.log('-'.repeat(80));

  const { data: enumValues, error: enumError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT enumlabel as value
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'transaction_type'
      ORDER BY e.enumsortorder;
    `
  });

  if (enumError) {
    console.log('❌ Ошибка получения enum значений:', enumError.message);
  } else {
    console.log('📊 ТЕКУЩИЕ ЗНАЧЕНИЯ ENUM transaction_type:');
    enumValues?.forEach((val, i) => {
      console.log(`   ${i + 1}. ${val.value}`);
    });

    const hasTonDeposit = enumValues?.some(val => val.value === 'TON_DEPOSIT');
    const hasDeposit = enumValues?.some(val => val.value === 'DEPOSIT');
    
    console.log(`\n🎯 КЛЮЧЕВЫЕ НАХОДКИ:`);
    console.log(`   TON_DEPOSIT в enum: ${hasTonDeposit ? '✅ ЕСТЬ' : '❌ НЕТ'}`);
    console.log(`   DEPOSIT в enum: ${hasDeposit ? '✅ ЕСТЬ' : '❌ НЕТ'}`);
  }

  // 3. АНАЛИЗ ИСТОРИЧЕСКИХ ТРАНЗАКЦИЙ ПО ТИПАМ
  console.log('\n3️⃣ АНАЛИЗ ИСТОРИЧЕСКИХ ТРАНЗАКЦИЙ ПО ТИПАМ:');
  console.log('-'.repeat(80));

  const { data: typeHistory } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        type,
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(CASE WHEN CAST(amount_ton AS FLOAT) > 0 THEN CAST(amount_ton AS FLOAT) ELSE 0 END) as total_ton,
        COUNT(DISTINCT user_id) as unique_users
      FROM transactions 
      WHERE created_at >= '2025-07-01'
        AND (CAST(amount_ton AS FLOAT) > 0 OR currency = 'TON')
      GROUP BY type, DATE(created_at)
      ORDER BY date, type
    `
  });

  if (typeHistory && typeHistory.length > 0) {
    console.log('📈 ИСТОРИЯ TON ТРАНЗАКЦИЙ ПО ДНЯМ:');
    
    const dates = [...new Set(typeHistory.map(t => t.date))].sort();
    
    dates.forEach(date => {
      const dayTypes = typeHistory.filter(t => t.date === date);
      console.log(`\n   ${date}:`);
      
      dayTypes.forEach(type => {
        console.log(`      ${type.type}: ${type.count} транзакций, ${parseFloat(type.total_ton).toFixed(3)} TON, ${type.unique_users} пользователей`);
      });
    });
  }

  // 4. ПОИСК МОМЕНТА ПОЯВЛЕНИЯ TON_DEPOSIT
  console.log('\n4️⃣ ПОИСК МОМЕНТА ПОЯВЛЕНИЯ TON_DEPOSIT ТИПА:');
  console.log('-'.repeat(80));

  const { data: tonDepositFirst } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        id,
        user_id,
        amount_ton,
        created_at,
        description,
        metadata
      FROM transactions 
      WHERE type = 'TON_DEPOSIT'
      ORDER BY created_at ASC
      LIMIT 10
    `
  });

  if (tonDepositFirst && tonDepositFirst.length > 0) {
    console.log(`🎯 ПЕРВЫЕ ${tonDepositFirst.length} TON_DEPOSIT ТРАНЗАКЦИЙ:`);
    
    tonDepositFirst.forEach((tx, i) => {
      console.log(`\n   ${i + 1}. ID ${tx.id} (${tx.created_at}):`);
      console.log(`      User: ${tx.user_id}`);
      console.log(`      Amount: ${tx.amount_ton} TON`);
      console.log(`      Description: ${tx.description}`);
      console.log(`      Metadata: ${JSON.stringify(tx.metadata, null, 2)}`);
    });
    
    const firstDate = tonDepositFirst[0].created_at.split('T')[0];
    console.log(`\n💡 ПЕРВЫЙ TON_DEPOSIT: ${firstDate}`);
    
    if (firstDate >= '2025-08-01') {
      console.log('🚨 КРИТИЧНО: TON_DEPOSIT появился СЕГОДНЯ или позже!');
    } else if (firstDate >= '2025-07-22') {
      console.log('⚠️ TON_DEPOSIT появился в конце июля');
    } else {
      console.log('✅ TON_DEPOSIT существует с начала июля');
    }
  } else {
    console.log('❌ НЕТ ТРАНЗАКЦИЙ ТИПА TON_DEPOSIT!');
    console.log('💡 Это объясняет проблему - тип не поддерживается в БД');
  }

  // 5. АНАЛИЗ DEPOSIT vs TON_DEPOSIT
  console.log('\n5️⃣ АНАЛИЗ DEPOSIT vs TON_DEPOSIT:');
  console.log('-'.repeat(80));

  const { data: depositComparison } = await supabase.rpc('execute_sql', {
    query: `
      WITH deposit_analysis AS (
        SELECT 
          type,
          COUNT(*) as count,
          SUM(CASE WHEN CAST(amount_ton AS FLOAT) > 0 THEN CAST(amount_ton AS FLOAT) ELSE 0 END) as total_ton,
          MIN(created_at) as first_date,
          MAX(created_at) as last_date,
          COUNT(DISTINCT user_id) as unique_users
        FROM transactions 
        WHERE type IN ('DEPOSIT', 'TON_DEPOSIT')
          AND (CAST(amount_ton AS FLOAT) > 0 OR currency = 'TON')
        GROUP BY type
      )
      SELECT * FROM deposit_analysis
      ORDER BY first_date
    `
  });

  if (depositComparison && depositComparison.length > 0) {
    console.log('📊 СРАВНЕНИЕ DEPOSIT vs TON_DEPOSIT:');
    
    depositComparison.forEach(comp => {
      console.log(`\n   ${comp.type}:`);
      console.log(`      Количество: ${comp.count} транзакций`);
      console.log(`      Общая сумма: ${parseFloat(comp.total_ton).toFixed(3)} TON`);
      console.log(`      Пользователи: ${comp.unique_users}`);
      console.log(`      Период: ${comp.first_date.split('T')[0]} - ${comp.last_date.split('T')[0]}`);
    });
  }

  // 6. ПОИСК ДУБЛИРОВАНИЯ ЧЕРЕЗ ОПИСАНИЯ
  console.log('\n6️⃣ ПОИСК ДУБЛИРОВАНИЯ ЧЕРЕЗ ОПИСАНИЯ И МЕТАДАННЫЕ:');
  console.log('-'.repeat(80));

  const { data: duplicateSearch } = await supabase.rpc('execute_sql', {
    query: `
      WITH potential_duplicates AS (
        SELECT 
          t1.id as id1,
          t2.id as id2,
          t1.user_id,
          t1.amount_ton,
          t1.created_at as created1,
          t2.created_at as created2,
          t1.type as type1,
          t2.type as type2,
          t1.description as desc1,
          t2.description as desc2
        FROM transactions t1
        JOIN transactions t2 ON (
          t1.user_id = t2.user_id 
          AND t1.id != t2.id
          AND t1.amount_ton = t2.amount_ton
          AND ABS(EXTRACT(EPOCH FROM (t1.created_at - t2.created_at))) < 300  -- 5 минут
        )
        WHERE t1.created_at >= '2025-08-01'
          AND CAST(t1.amount_ton AS FLOAT) > 0
          AND (t1.type IN ('DEPOSIT', 'TON_DEPOSIT', 'FARMING_REWARD') 
               OR t2.type IN ('DEPOSIT', 'TON_DEPOSIT', 'FARMING_REWARD'))
      )
      SELECT * FROM potential_duplicates
      ORDER BY created1 DESC
    `
  });

  if (duplicateSearch && duplicateSearch.length > 0) {
    console.log(`🚨 НАЙДЕНО ${duplicateSearch.length} ПОТЕНЦИАЛЬНЫХ ДУБЛЕЙ:`);
    
    duplicateSearch.forEach((dup, i) => {
      console.log(`\n   ${i + 1}. ДУБЛИКАТ ГРУППА:`);
      console.log(`      User ${dup.user_id}: ${dup.amount_ton} TON`);
      console.log(`      ID ${dup.id1} (${dup.type1}) в ${dup.created1}`);
      console.log(`      ID ${dup.id2} (${dup.type2}) в ${dup.created2}`);
      console.log(`      Описания:`);
      console.log(`        1: ${dup.desc1}`);
      console.log(`        2: ${dup.desc2}`);
    });
  } else {
    console.log('✅ Потенциальных дублей по времени и сумме НЕ НАЙДЕНО');
  }

  // 7. ФИНАЛЬНЫЕ ВЫВОДЫ
  console.log('\n' + '='.repeat(90));
  console.log('🎯 ФИНАЛЬНЫЕ ВЫВОДЫ РАССЛЕДОВАНИЯ');
  console.log('='.repeat(90));

  console.log('\n💥 КЛЮЧЕВАЯ ПРОБЛЕМА:');
  console.log('1. В код добавили тип TON_DEPOSIT');
  console.log('2. Но в enum базы данных его НЕТ (вероятно)');
  console.log('3. Это создает конфликт в маппинге');
  console.log('4. Система пытается создать TON_DEPOSIT, но падает на enum');
  console.log('5. Возможно, создается fallback DEPOSIT + TON_DEPOSIT');

  console.log('\n🔍 ЧТО НУЖНО ИССЛЕДОВАТЬ ДАЛЬШЕ:');
  console.log('1. Проверить, поддерживает ли БД тип TON_DEPOSIT');
  console.log('2. Найти где происходит дублирование (возможно в processTonDeposit)');
  console.log('3. Определить исходный рабочий маппинг до добавления TON_DEPOSIT');
  console.log('4. Проверить логи создания транзакций на дублирование');

  console.log('\n⚠️ ГИПОТЕЗА ДУБЛИРОВАНИЯ:');
  console.log('1. processTonDeposit() вызывается дважды для одного депозита');
  console.log('2. Или TON_DEPOSIT маппится неправильно → fallback на DEPOSIT');
  console.log('3. Или есть два разных пути обработки депозитов');

  console.log('\n🚨 СРОЧНЫЕ ДЕЙСТВИЯ:');
  console.log('1. Проверить enum transaction_type в БД на наличие TON_DEPOSIT');
  console.log('2. Найти где в коде происходит дублирование вызовов');
  console.log('3. Временно откатить маппинг до рабочего состояния');
  console.log('4. Добавить TON_DEPOSIT в enum БД или исправить маппинг');
}

investigateTransactionMappingHistory().catch(console.error);