#!/usr/bin/env tsx
/**
 * 🚨 СРОЧНАЯ ДИАГНОСТИКА: TON депозиты 29.07.2025
 * 
 * Проверяем что произошло с депозитами User ID 25 в 14:06 и 14:08
 * после отключения rollback функций 29.07.2025
 * 
 * НИКАКИХ ИЗМЕНЕНИЙ В КОДЕ ИЛИ БД - ТОЛЬКО ДИАГНОСТИКА!
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.error('❌ SUPABASE_KEY отсутствует в environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function urgentDiagnosis() {
  console.log('🚨 СРОЧНАЯ ДИАГНОСТИКА TON ДЕПОЗИТОВ - 29.07.2025');
  console.log('User ID 25 - депозиты в 14:06 и 14:08 не зачислены\n');

  // 1. ПРОВЕРЯЕМ БАЛАНС USER 25
  console.log('1️⃣ ТЕКУЩИЙ БАЛАНС USER 25:');
  const { data: user25, error: userError } = await supabase
    .from('users')
    .select('id, balance_ton, balance_uni, telegram_username')
    .eq('id', 25)
    .single();

  if (userError) {
    console.log(`❌ Ошибка получения данных User 25: ${userError.message}`);
    return;
  }

  console.log(`   👤 User: ${user25.telegram_username || 'N/A'} (ID: ${user25.id})`);
  console.log(`   💰 TON Balance: ${user25.balance_ton || 0}`);
  console.log(`   🪙 UNI Balance: ${user25.balance_uni || 0}\n`);

  // 2. ПОИСК ТРАНЗАКЦИЙ НА 29.07.2025 между 14:00-15:00
  console.log('2️⃣ ПОИСК ТРАНЗАКЦИЙ USER 25 на 29.07.2025 (14:00-15:00):');
  
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 25)
    .gte('created_at', '2025-07-29T14:00:00Z')
    .lte('created_at', '2025-07-29T15:00:00Z')
    .order('created_at', { ascending: true });

  if (txError) {
    console.log(`❌ Ошибка поиска транзакций: ${txError.message}`);
    return;
  }

  console.log(`   📊 Найдено транзакций: ${transactions?.length || 0}`);
  
  if (transactions && transactions.length > 0) {
    transactions.forEach(tx => {
      const time = new Date(tx.created_at).toLocaleTimeString('ru-RU');
      console.log(`   • ${time} | ${tx.type} | ${tx.amount} | ${tx.description || 'No desc'}`);
      if (tx.metadata) {
        console.log(`     📋 Metadata: ${JSON.stringify(tx.metadata).substring(0, 100)}...`);
      }
      if (tx.tx_hash || tx.tx_hash_unique) {
        console.log(`     🔗 Hash: ${tx.tx_hash || tx.tx_hash_unique || 'N/A'}`);
      }
    });
  } else {
    console.log('   ⚠️ НЕТ ТРАНЗАКЦИЙ в указанном интервале!');
  }

  console.log('');

  // 3. ПОИСК ПО КОНКРЕТНЫМ TX_HASH из задания
  console.log('3️⃣ ПОИСК ПО КОНКРЕТНЫМ TX_HASH:');
  const targetHashes = [
    'te6cckECAgEAAKoAAeGIFZ8mrv', // 14:08
    'te6cckECAgEAAKoAAeGICdUc8k'  // 14:06
  ];

  for (const hash of targetHashes) {
    console.log(`\n   🔍 Поиск: ${hash}`);
    
    // Поиск в различных полях
    const searches = [
      { field: 'tx_hash', query: hash },
      { field: 'tx_hash_unique', query: hash },
      { field: 'description', query: `%${hash}%` },
      { field: 'metadata', query: `%${hash}%` }
    ];

    let found = false;
    for (const search of searches) {
      let query = supabase.from('transactions').select('*');
      
      if (search.field === 'description' || search.field === 'metadata') {
        query = query.ilike(search.field, search.query);
      } else {
        query = query.eq(search.field, search.query);
      }

      const { data: results } = await query.limit(5);
      
      if (results && results.length > 0) {
        found = true;
        console.log(`     ✅ Найдено в ${search.field}: ${results.length} записей`);
        results.forEach(tx => {
          console.log(`       • ID: ${tx.id} | User: ${tx.user_id} | Type: ${tx.type} | Amount: ${tx.amount}`);
          console.log(`         Date: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        });
      }
    }
    
    if (!found) {
      console.log(`     ❌ НЕТ записей с hash: ${hash}`);
    }
  }

  console.log('');

  // 4. АНАЛИЗ ОТКЛЮЧЕННЫХ ROLLBACK ФУНКЦИЙ
  console.log('4️⃣ АНАЛИЗ ВЛИЯНИЯ ОТКЛЮЧЕННЫХ ROLLBACK ФУНКЦИЙ:');
  console.log('   🚨 29.07.2025 ОТКЛЮЧЕНЫ:');
  console.log('   • UnifiedTransactionService.updateUserBalance()');
  console.log('   • TransactionEnforcer.detectDirectSQLUpdates()');
  console.log('   • SQL скрипт удаления дубликатов');
  console.log('   • BatchBalanceProcessor.invalidateBatch()');
  console.log('');
  console.log('   ⚠️ ПОТЕНЦИАЛЬНЫЕ ПОСЛЕДСТВИЯ:');
  console.log('   • Транзакции могли создаваться без обновления баланса');
  console.log('   • Дедупликация по tx_hash могла не работать');
  console.log('   • Ручные SQL операции могли быть заблокированы');

  console.log('');

  // 5. ПРОВЕРЯЕМ ЛОГИ СИСТЕМЫ (если доступны)
  console.log('5️⃣ РЕКОМЕНДАЦИИ ПО ПРОВЕРКЕ ЛОГОВ:');
  console.log('   📋 Искать в логах сервера:');
  console.log('   • "[ANTI_ROLLBACK_PROTECTION]" - отключенные операции');
  console.log('   • "TON deposit from blockchain" - попытки обработки');
  console.log('   • "te6cckECAgEAAKoAAeGI" - упоминания конкретных hash');
  console.log('   • "User 25" - операции конкретного пользователя');

  console.log('');
  console.log('🎯 ВЫВОДЫ:');
  console.log('✅ Диагностика завершена - нужно проверить влияние отключенных rollback функций на TON депозиты');
}

urgentDiagnosis().catch(error => {
  console.error('❌ Ошибка диагностики:', error);
});