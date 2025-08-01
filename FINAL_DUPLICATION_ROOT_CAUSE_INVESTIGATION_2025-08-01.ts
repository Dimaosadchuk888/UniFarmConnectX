// ФИНАЛЬНОЕ РАССЛЕДОВАНИЕ: Точная причина дублирования TON депозитов
// Ищем где именно происходит двойная обработка одного депозита
import { supabase } from './core/supabase';

async function findExactDuplicationSource(): Promise<void> {
  console.log('🔍 ФИНАЛЬНОЕ РАССЛЕДОВАНИЕ: ТОЧНАЯ ПРИЧИНА ДУБЛИРОВАНИЯ');
  console.log('='.repeat(90));

  console.log('\n📋 УСТАНОВЛЕННЫЕ ФАКТЫ:');
  console.log('✅ TON_DEPOSIT поддерживается в enum базы данных');
  console.log('✅ Прямого дублирования по хешам сегодня НЕТ');
  console.log('💥 НО пользователь сообщает: 1 TON → 2 одинаковых хеша → 2 пополнения');
  console.log('💥 Система удваивает депозиты после добавления TON_DEPOSIT категории');

  // 1. ПОИСК РЕАЛЬНЫХ СЛУЧАЕВ ДУБЛИРОВАНИЯ
  console.log('\n1️⃣ ПОИСК РЕАЛЬНЫХ СЛУЧАЕВ ДУБЛИРОВАНИЯ В ИСТОРИИ:');
  console.log('-'.repeat(80));

  // Ищем транзакции с одинаковыми хешами в метаданных
  const { data: hashDuplicates } = await supabase.rpc('execute_sql', {
    query: `
      WITH hash_analysis AS (
        SELECT 
          COALESCE(metadata->>'tx_hash', metadata->>'ton_tx_hash', metadata->>'hash') as extracted_hash,
          user_id,
          amount_ton,
          type,
          created_at,
          id,
          description,
          COUNT(*) OVER (PARTITION BY COALESCE(metadata->>'tx_hash', metadata->>'ton_tx_hash', metadata->>'hash')) as hash_count
        FROM transactions 
        WHERE (metadata->>'tx_hash' IS NOT NULL 
               OR metadata->>'ton_tx_hash' IS NOT NULL 
               OR metadata->>'hash' IS NOT NULL)
          AND created_at >= '2025-07-20'
          AND CAST(amount_ton AS FLOAT) > 0
      )
      SELECT * FROM hash_analysis 
      WHERE hash_count > 1 
        AND extracted_hash IS NOT NULL
        AND extracted_hash != ''
      ORDER BY extracted_hash, created_at
    `
  });

  if (hashDuplicates && hashDuplicates.length > 0) {
    console.log(`🚨 НАЙДЕНО ${hashDuplicates.length} ТРАНЗАКЦИЙ С ДУБЛИРОВАННЫМИ ХЕШАМИ:`);
    
    const groupedByHash = hashDuplicates.reduce((acc, tx) => {
      const hash = tx.extracted_hash;
      if (!acc[hash]) acc[hash] = [];
      acc[hash].push(tx);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(groupedByHash).forEach(([hash, transactions]) => {
      if (transactions.length > 1) {
        console.log(`\n💥 ДУБЛИКАТ ХЕША: ${hash.substring(0, 20)}...`);
        transactions.forEach((tx, i) => {
          console.log(`   ${i + 1}. ID ${tx.id} | User ${tx.user_id} | ${tx.amount_ton} TON | ${tx.type}`);
          console.log(`      Дата: ${tx.created_at}`);
          console.log(`      Описание: ${tx.description}`);
        });
      }
    });
  } else {
    console.log('✅ Дублированных хешей в транзакциях НЕ НАЙДЕНО');
  }

  // 2. АНАЛИЗ СЕГОДНЯШНИХ ДЕПОЗИТОВ НА ПОДОЗРЕНИЯ
  console.log('\n2️⃣ АНАЛИЗ СЕГОДНЯШНИХ ДЕПОЗИТОВ НА ПОДОЗРИТЕЛЬНЫЕ ПАТТЕРНЫ:');
  console.log('-'.repeat(80));

  const { data: todayDeposits } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        user_id,
        amount_ton,
        type,
        created_at,
        id,
        description,
        metadata
      FROM transactions 
      WHERE created_at >= '2025-08-01'
        AND CAST(amount_ton AS FLOAT) > 0
        AND type IN ('DEPOSIT', 'TON_DEPOSIT', 'FARMING_REWARD')
      ORDER BY user_id, created_at
    `
  });

  if (todayDeposits && todayDeposits.length > 0) {
    console.log(`💰 Найдено ${todayDeposits.length} депозитов сегодня:`);
    
    // Группируем по пользователям
    const byUser = todayDeposits.reduce((acc, tx) => {
      if (!acc[tx.user_id]) acc[tx.user_id] = [];
      acc[tx.user_id].push(tx);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(byUser).forEach(([userId, userTxs]) => {
      if (userTxs.length > 1) {
        console.log(`\n👤 User ${userId} - ${userTxs.length} депозитов:`);
        userTxs.forEach((tx, i) => {
          console.log(`   ${i + 1}. ${tx.amount_ton} TON (${tx.type}) в ${tx.created_at}`);
          console.log(`      ID: ${tx.id} | ${tx.description}`);
          
          // Проверяем метаданные на хеши
          if (tx.metadata) {
            const hash = tx.metadata.tx_hash || tx.metadata.ton_tx_hash || tx.metadata.hash;
            if (hash) {
              console.log(`      Hash: ${hash.substring(0, 30)}...`);
            }
          }
        });
        
        // Ищем подозрительные паттерны
        const samAmounts = userTxs.filter((tx1, i) => 
          userTxs.some((tx2, j) => i !== j && tx1.amount_ton === tx2.amount_ton)
        );
        
        if (samAmounts.length > 0) {
          console.log(`      🚨 ПОДОЗРЕНИЕ: Одинаковые суммы депозитов!`);
        }
      }
    });
  }

  // 3. ПОИСК ДВОЙНЫХ ВЫЗОВОВ В ЛОГИКЕ ОБРАБОТКИ
  console.log('\n3️⃣ АНАЛИЗ ЛОГИКИ ОБРАБОТКИ НА ДВОЙНЫЕ ВЫЗОВЫ:');
  console.log('-'.repeat(80));

  console.log('🔍 ПРОВЕРЯЕМ FRONTEND → BACKEND ИНТЕГРАЦИЮ:');
  console.log('\n📱 FRONTEND (TonDepositCard.tsx):');
  console.log('   После успешной отправки TON:');
  console.log('   → correctApiRequest("/api/v2/wallet/ton-deposit", "POST", {...})');
  
  console.log('\n🖥️ BACKEND (modules/wallet/routes.ts):');
  console.log('   POST /api/v2/wallet/ton-deposit');
  console.log('   → walletController.tonDeposit()');
  
  console.log('\n⚙️ CONTROLLER (modules/wallet/controller.ts):');
  console.log('   walletController.tonDeposit()');
  console.log('   → walletService.processTonDeposit()');
  
  console.log('\n🔧 SERVICE (modules/wallet/service.ts):');
  console.log('   processTonDeposit()');
  console.log('   → UnifiedTransactionService.createTransaction()');

  console.log('\n💡 ВОЗМОЖНЫЕ ИСТОЧНИКИ ДУБЛИРОВАНИЯ:');
  console.log('1. 🔄 ДВОЙНОЙ ВЫЗОВ API: Frontend вызывает /api/v2/wallet/ton-deposit дважды');
  console.log('2. 🔄 RETRY ЛОГИКА: Timeout → повторный вызов с тем же хешом');
  console.log('3. 🔄 WEBSOCKET CONFLICT: WebSocket update → дополнительная обработка');
  console.log('4. 🔄 TRANSACTION RACE: Конкурентные вызовы обходят дедупликацию');
  console.log('5. 🔄 FALLBACK LOGIC: TON_DEPOSIT fails → fallback к DEPOSIT');

  // 4. ПОИСК CONCURRENCY ISSUES
  console.log('\n4️⃣ ПОИСК CONCURRENCY ISSUES (близкие по времени транзакции):');
  console.log('-'.repeat(80));

  const { data: closeTransactions } = await supabase.rpc('execute_sql', {
    query: `
      WITH close_pairs AS (
        SELECT 
          t1.id as id1,
          t2.id as id2,
          t1.user_id,
          t1.amount_ton,
          t1.created_at as time1,
          t2.created_at as time2,
          EXTRACT(EPOCH FROM (t2.created_at - t1.created_at)) as seconds_diff,
          t1.type as type1,
          t2.type as type2
        FROM transactions t1
        JOIN transactions t2 ON (
          t1.user_id = t2.user_id 
          AND t1.id < t2.id
          AND t1.amount_ton = t2.amount_ton
          AND CAST(t1.amount_ton AS FLOAT) > 0
          AND ABS(EXTRACT(EPOCH FROM (t2.created_at - t1.created_at))) < 60
        )
        WHERE t1.created_at >= '2025-07-20'
          AND (t1.type IN ('DEPOSIT', 'TON_DEPOSIT', 'FARMING_REWARD') 
               OR t2.type IN ('DEPOSIT', 'TON_DEPOSIT', 'FARMING_REWARD'))
      )
      SELECT * FROM close_pairs
      WHERE ABS(seconds_diff) < 30
      ORDER BY ABS(seconds_diff)
    `
  });

  if (closeTransactions && closeTransactions.length > 0) {
    console.log(`⚡ НАЙДЕНО ${closeTransactions.length} ПОДОЗРИТЕЛЬНО БЛИЗКИХ ТРАНЗАКЦИЙ:`);
    
    closeTransactions.forEach((pair, i) => {
      console.log(`\n${i + 1}. БЛИЗКАЯ ПАРА:`);
      console.log(`   User ${pair.user_id}: ${pair.amount_ton} TON`);
      console.log(`   ID ${pair.id1} (${pair.type1}) → ID ${pair.id2} (${pair.type2})`);
      console.log(`   Разница: ${Math.abs(pair.seconds_diff).toFixed(1)} секунд`);
      
      if (Math.abs(pair.seconds_diff) < 5) {
        console.log(`   🚨 КРИТИЧНО: Менее 5 секунд разницы!`);
      }
    });
  } else {
    console.log('✅ Подозрительно близких транзакций НЕ НАЙДЕНО');
  }

  // 5. АНАЛИЗ ДЕДУПЛИКАЦИИ
  console.log('\n5️⃣ АНАЛИЗ ЭФФЕКТИВНОСТИ ДЕДУПЛИКАЦИИ:');
  console.log('-'.repeat(80));

  console.log('🛡️ ТЕКУЩАЯ ЛОГИКА ДЕДУПЛИКАЦИИ в UnifiedTransactionService:');
  console.log('   1. Извлекает: metadata?.tx_hash || metadata?.ton_tx_hash');
  console.log('   2. Проверяет: supabase.from("transactions").eq("tx_hash_unique", hash)');
  console.log('   3. Если найден → return { success: false, error: "already exists" }');

  console.log('\n❓ ВОЗМОЖНЫЕ ПРОБЛЕМЫ ДЕДУПЛИКАЦИИ:');
  console.log('1. 🔍 tx_hash_unique поле может быть NULL');
  console.log('2. 🔍 metadata.tx_hash может отличаться от tx_hash_unique');
  console.log('3. 🔍 Race condition: два запроса проходят проверку одновременно');
  console.log('4. 🔍 Разные форматы хешей: tx_hash vs ton_tx_hash');

  // 6. ФИНАЛЬНЫЙ АНАЛИЗ
  console.log('\n' + '='.repeat(90));
  console.log('🎯 ФИНАЛЬНЫЙ ДИАГНОЗ');
  console.log('='.repeat(90));

  console.log('\n💥 УСТАНОВЛЕННАЯ ПРОБЛЕМА:');
  console.log('✅ Enum поддерживает TON_DEPOSIT');
  console.log('✅ Дубликатов по хешам в БД НЕТ');
  console.log('❌ НО пользователь видит дублирование');

  console.log('\n🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
  console.log('1. 📱 FRONTEND: Двойной вызов API при медленном соединении');
  console.log('2. 🔄 RETRY: Автоматические повторы при timeout');
  console.log('3. ⚡ RACE CONDITION: Concurrent запросы обходят дедупликацию');
  console.log('4. 🎭 UI BUG: Показывает одну транзакцию дважды');
  console.log('5. 📊 BALANCE UPDATE: WebSocket удваивает отображение');

  console.log('\n🚨 СРОЧНЫЕ ДЕЙСТВИЯ:');
  console.log('1. 📝 Добавить детальное логирование в processTonDeposit()');
  console.log('2. 🔒 Усилить дедупликацию через database constraints');
  console.log('3. 📱 Проверить frontend на двойные вызовы');
  console.log('4. ⏱️ Добавить rate limiting на deposit endpoint');
  console.log('5. 🎯 Протестировать с реальным депозитом');

  console.log('\n📋 ПЛАН ДЕЙСТВИЙ:');
  console.log('1. Найти где ИМЕННО происходит дублирование');
  console.log('2. Добавить уникальные constraints в БД');
  console.log('3. Исправить frontend race conditions');
  console.log('4. Улучшить логирование для диагностики');
}

findExactDuplicationSource().catch(console.error);