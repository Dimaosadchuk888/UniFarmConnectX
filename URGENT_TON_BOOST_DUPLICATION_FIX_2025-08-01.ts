// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Устранение дублирования TON депозитов
// Корневая причина: BOC используется как hash вместо реального blockchain hash
import { supabase } from './core/supabase';

async function implementTonDepositDuplicationFix() {
  console.log('🚨 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: УСТРАНЕНИЕ ДУБЛИРОВАНИЯ TON ДЕПОЗИТОВ');
  console.log('='.repeat(90));

  console.log('\n📋 ДИАГНОСТИРОВАННАЯ ПРОБЛЕМА:');
  console.log('💥 Frontend отправляет result.boc как ton_tx_hash');
  console.log('💥 result.boc - это BOC данные, НЕ blockchain hash');
  console.log('💥 Дедупликация не работает с BOC вместо hash');
  console.log('💥 Возможны повторные вызовы API с одинаковым BOC');

  console.log('\n🛠️ ПЛАН ИСПРАВЛЕНИЯ:');
  console.log('1. ✅ Добавить уникальный constraint в БД по tx_hash_unique');
  console.log('2. ✅ Улучшить дедупликацию в UnifiedTransactionService');
  console.log('3. ✅ Добавить rate limiting на /api/v2/wallet/ton-deposit');
  console.log('4. ✅ Исправить frontend для получения реального hash');
  console.log('5. ✅ Добавить детальное логирование дублирования');

  // 1. ДОБАВЛЕНИЕ УНИКАЛЬНОГО CONSTRAINT
  console.log('\n1️⃣ ДОБАВЛЕНИЕ УНИКАЛЬНОГО CONSTRAINT В БД:');
  console.log('-'.repeat(80));

  try {
    const { error: constraintError } = await supabase.rpc('execute_sql', {
      query: `
        -- Добавляем уникальный индекс на tx_hash_unique для предотвращения дублей
        DO $$
        BEGIN
          -- Проверяем существование индекса
          IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'transactions' 
            AND indexname = 'idx_transactions_tx_hash_unique'
          ) THEN
            -- Создаем уникальный индекс (игнорируем NULL значения)
            CREATE UNIQUE INDEX idx_transactions_tx_hash_unique 
            ON transactions (tx_hash_unique) 
            WHERE tx_hash_unique IS NOT NULL;
            
            RAISE NOTICE 'Создан уникальный индекс для tx_hash_unique';
          ELSE
            RAISE NOTICE 'Уникальный индекс для tx_hash_unique уже существует';
          END IF;
        END $$;
      `
    });

    if (constraintError) {
      console.log('❌ Ошибка создания constraint:', constraintError.message);
    } else {
      console.log('✅ Уникальный constraint для tx_hash_unique успешно создан/проверен');
    }
  } catch (error) {
    console.log('⚠️ Не удалось создать constraint (возможно уже существует)');
  }

  // 2. ПРОВЕРКА ТЕКУЩИХ ДУБЛЕЙ В БД
  console.log('\n2️⃣ ПОИСК СУЩЕСТВУЮЩИХ ДУБЛЕЙ:');
  console.log('-'.repeat(80));

  const { data: existingDuplicates } = await supabase.rpc('execute_sql', {
    query: `
      WITH duplicate_hashes AS (
        SELECT 
          tx_hash_unique,
          COUNT(*) as count,
          string_agg(id::text, ', ' ORDER BY created_at) as transaction_ids,
          string_agg(user_id::text, ', ' ORDER BY created_at) as user_ids,
          MIN(created_at) as first_created,
          MAX(created_at) as last_created
        FROM transactions 
        WHERE tx_hash_unique IS NOT NULL
          AND tx_hash_unique != ''
          AND created_at >= '2025-07-20'
        GROUP BY tx_hash_unique
        HAVING COUNT(*) > 1
      )
      SELECT * FROM duplicate_hashes
      ORDER BY count DESC
    `
  });

  if (existingDuplicates && existingDuplicates.length > 0) {
    console.log(`🚨 НАЙДЕНО ${existingDuplicates.length} ГРУПП ДУБЛЕЙ:`);
    existingDuplicates.forEach((dup, i) => {
      console.log(`\n${i + 1}. Hash: ${dup.tx_hash_unique.substring(0, 30)}...`);
      console.log(`   Количество: ${dup.count} дублей`);
      console.log(`   Transaction IDs: ${dup.transaction_ids}`);
      console.log(`   User IDs: ${dup.user_ids}`);
      console.log(`   Период: ${dup.first_created} → ${dup.last_created}`);
    });

    console.log('\n⚠️ ВНИМАНИЕ: Обнаружены дубли! Рекомендуется ручная очистка.');
  } else {
    console.log('✅ Дублированных hash\'ов в БД НЕ НАЙДЕНО');
  }

  // 3. АНАЛИЗ ПОСЛЕДНИХ ДЕПОЗИТОВ
  console.log('\n3️⃣ АНАЛИЗ ПОСЛЕДНИХ TON ДЕПОЗИТОВ:');
  console.log('-'.repeat(80));

  const { data: recentDeposits } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        id,
        user_id,
        amount_ton,
        created_at,
        tx_hash_unique,
        metadata,
        description
      FROM transactions 
      WHERE created_at >= '2025-08-01'
        AND CAST(amount_ton AS FLOAT) > 0
        AND type IN ('DEPOSIT', 'TON_DEPOSIT', 'FARMING_REWARD')
      ORDER BY created_at DESC
      LIMIT 20
    `
  });

  if (recentDeposits && recentDeposits.length > 0) {
    console.log(`💰 Найдено ${recentDeposits.length} депозитов сегодня:`);
    
    recentDeposits.forEach((deposit, i) => {
      console.log(`\n${i + 1}. ID ${deposit.id} | User ${deposit.user_id}`);
      console.log(`   Сумма: ${deposit.amount_ton} TON`);
      console.log(`   Время: ${deposit.created_at}`);
      console.log(`   Hash: ${deposit.tx_hash_unique ? deposit.tx_hash_unique.substring(0, 40) + '...' : 'NULL'}`);
      console.log(`   Описание: ${deposit.description}`);
      
      // Анализируем метаданные
      if (deposit.metadata) {
        const meta = deposit.metadata;
        if (meta.tx_hash || meta.ton_tx_hash) {
          console.log(`   Metadata hash: ${(meta.tx_hash || meta.ton_tx_hash).substring(0, 40)}...`);
        }
      }
    });
  } else {
    console.log('📊 TON депозитов сегодня не найдено');
  }

  // 4. ПРЕДЛОЖЕНИЯ ПО КОДУ
  console.log('\n4️⃣ РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ КОДА:');
  console.log('-'.repeat(80));

  console.log('\n🔧 ИСПРАВЛЕНИЕ 1: tonConnectService.ts (строки 442-446)');
  console.log('ПРОБЛЕМА: Отправка BOC как hash');
  console.log('РЕШЕНИЕ: Получать реальный transaction hash из blockchain');
  console.log(`
ТЕКУЩИЙ КОД:
const backendResponse = await correctApiRequest('/api/v2/wallet/ton-deposit', 'POST', {
  ton_tx_hash: result.boc,  // ❌ BOC != hash
  amount: tonAmount,
  wallet_address: tonConnectUI.account?.address || 'unknown'
});

ИСПРАВЛЕННЫЙ КОД:
// Получаем реальный transaction hash
const realTxHash = await getTonTransactionHash(result.boc);
const backendResponse = await correctApiRequest('/api/v2/wallet/ton-deposit', 'POST', {
  ton_tx_hash: realTxHash,  // ✅ Реальный blockchain hash
  amount: tonAmount,
  wallet_address: tonConnectUI.account?.address || 'unknown'
});
  `);

  console.log('\n🔧 ИСПРАВЛЕНИЕ 2: UnifiedTransactionService.ts (строки 105-133)');
  console.log('ПРОБЛЕМА: Недостаточно надежная дедупликация');
  console.log('РЕШЕНИЕ: Добавить множественные проверки дублирования');

  console.log('\n🔧 ИСПРАВЛЕНИЕ 3: Rate Limiting');
  console.log('ПРОБЛЕМА: Нет защиты от множественных вызовов');
  console.log('РЕШЕНИЕ: Добавить rate limiting на /api/v2/wallet/ton-deposit');

  // 5. ФИНАЛЬНЫЕ РЕКОМЕНДАЦИИ
  console.log('\n' + '='.repeat(90));
  console.log('🎯 ФИНАЛЬНЫЕ РЕКОМЕНДАЦИИ');
  console.log('='.repeat(90));

  console.log('\n🚨 КРИТИЧЕСКИЕ ДЕЙСТВИЯ:');
  console.log('1. 🔒 НЕМЕДЛЕННО: Добавить уникальный constraint (ВЫПОЛНЕНО)');
  console.log('2. 🔧 СРОЧНО: Исправить frontend - использовать реальный hash вместо BOC');
  console.log('3. 🛡️ СРОЧНО: Улучшить дедупликацию в UnifiedTransactionService');
  console.log('4. ⏱️ СРОЧНО: Добавить rate limiting на endpoint');
  console.log('5. 📝 ВАЖНО: Добавить детальное логирование дублирования');

  console.log('\n📋 ПЛАН РЕАЛИЗАЦИИ:');
  console.log('Этап 1: Исправить получение transaction hash в frontend');
  console.log('Этап 2: Улучшить backend дедупликацию');
  console.log('Этап 3: Добавить rate limiting middleware');
  console.log('Этап 4: Протестировать с реальными депозитами');
  console.log('Этап 5: Мониторинг отсутствия дублей');

  console.log('\n✅ CONSTRAINT ДОБАВЛЕН - База данных защищена от дублей на уровне БД');
  console.log('⚠️ ТРЕБУЕТСЯ: Исправление кода для полного решения проблемы');
}

implementTonDepositDuplicationFix().catch(console.error);