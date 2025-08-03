/**
 * Расследование дублирования конкретной TON транзакции
 * BOC: te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKABZpFBvrrFJAWiokVZF0jaVpS4WogHhGrlhtGT3Nx2c+u4VTiWDwFKqA5bFP1f+FcnGm3mCx5TtEYlGNh1ccWBFNTRi7RHrhaAAAG8AAHAEAaEIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKh3NZQAAAAAAAAAAAAAAAAAABGzPzj
 * Время: 03.08.2025, 12:50
 */

import { supabase } from './core/supabase';

async function investigateDuplicateBoc() {
  console.log('\n=== РАССЛЕДОВАНИЕ ДУБЛИРУЮЩИХСЯ TON ТРАНЗАКЦИЙ ===\n');

  const targetBoc = 'te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKABZpFBvrrFJAWiokVZF0jaVpS4WogHhGrlhtGT3Nx2c+u4VTiWDwFKqA5bFP1f+FcnGm3mCx5TtEYlGNh1ccWBFNTRi7RHrhaAAAG8AAHAEAaEIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKh3NZQAAAAAAAAAAAAAAAAAABGzPzj';
  const userId = 184;

  try {
    console.log(`🔍 Ищем все транзакции с BOC: ${targetBoc.substring(0, 50)}...`);

    // 1. Поиск точных совпадений BOC
    console.log('\n1️⃣ ПОИСК ТОЧНЫХ СОВПАДЕНИЙ BOC:');
    const { data: exactMatches, error: exactError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, amount_ton, currency, description, tx_hash_unique, metadata, created_at')
      .eq('user_id', userId)
      .eq('tx_hash_unique', targetBoc)
      .order('created_at', { ascending: false });

    if (exactError) {
      console.error('❌ Ошибка поиска точных совпадений:', exactError);
    } else {
      console.log(`✅ Найдено ${exactMatches?.length || 0} точных совпадений`);
      exactMatches?.forEach((tx, index) => {
        console.log(`  ${index + 1}. ID: ${tx.id}, Время: ${tx.created_at}, Amount: ${tx.amount_ton}, Description: ${tx.description}`);
        console.log(`      tx_hash_unique: ${tx.tx_hash_unique?.substring(0, 50)}...`);
        console.log(`      metadata: ${JSON.stringify(tx.metadata)}`);
      });
    }

    // 2. Поиск по паттерну BOC (с суффиксами)
    console.log('\n2️⃣ ПОИСК ПО ПАТТЕРНУ BOC (с суффиксами):');
    const { data: patternMatches, error: patternError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, amount_ton, currency, description, tx_hash_unique, metadata, created_at')
      .eq('user_id', userId)
      .like('tx_hash_unique', `${targetBoc}%`)
      .order('created_at', { ascending: false });

    if (patternError) {
      console.error('❌ Ошибка поиска по паттерну:', patternError);
    } else {
      console.log(`✅ Найдено ${patternMatches?.length || 0} совпадений по паттерну`);
      patternMatches?.forEach((tx, index) => {
        const suffix = tx.tx_hash_unique?.replace(targetBoc, '');
        console.log(`  ${index + 1}. ID: ${tx.id}, Время: ${tx.created_at}, Суффикс: "${suffix}"`);
        console.log(`      tx_hash_unique: ${tx.tx_hash_unique}`);
      });
    }

    // 3. Поиск в metadata
    console.log('\n3️⃣ ПОИСК В METADATA:');
    const { data: metadataMatches, error: metadataError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, amount_ton, currency, description, tx_hash_unique, metadata, created_at')
      .eq('user_id', userId)
      .contains('metadata', { tx_hash: targetBoc })
      .order('created_at', { ascending: false });

    if (metadataError) {
      console.error('❌ Ошибка поиска в metadata:', metadataError);
    } else {
      console.log(`✅ Найдено ${metadataMatches?.length || 0} совпадений в metadata`);
      metadataMatches?.forEach((tx, index) => {
        console.log(`  ${index + 1}. ID: ${tx.id}, Время: ${tx.created_at}`);
        console.log(`      metadata.tx_hash: ${tx.metadata?.tx_hash}`);
        console.log(`      tx_hash_unique: ${tx.tx_hash_unique}`);
      });
    }

    // 4. Поиск по описанию
    console.log('\n4️⃣ ПОИСК ПО ОПИСАНИЮ (содержит BOC):');
    const { data: descriptionMatches, error: descError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, amount_ton, currency, description, tx_hash_unique, metadata, created_at')
      .eq('user_id', userId)
      .like('description', `%${targetBoc.substring(0, 30)}%`)
      .order('created_at', { ascending: false });

    if (descError) {
      console.error('❌ Ошибка поиска по описанию:', descError);
    } else {
      console.log(`✅ Найдено ${descriptionMatches?.length || 0} совпадений в описании`);
      descriptionMatches?.forEach((tx, index) => {
        console.log(`  ${index + 1}. ID: ${tx.id}, Время: ${tx.created_at}`);
        console.log(`      description: ${tx.description}`);
      });
    }

    // 5. Поиск всех TON депозитов в день 03.08.2025
    console.log('\n5️⃣ ВСЕ TON ДЕПОЗИТЫ 03.08.2025:');
    const { data: dayTransactions, error: dayError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, amount_ton, currency, description, tx_hash_unique, created_at')
      .eq('user_id', userId)
      .gte('created_at', '2025-08-03T00:00:00')
      .lt('created_at', '2025-08-04T00:00:00')
      .in('type', ['TON_DEPOSIT', 'DEPOSIT'])
      .order('created_at', { ascending: false });

    if (dayError) {
      console.error('❌ Ошибка поиска дневных транзакций:', dayError);
    } else {
      console.log(`✅ Найдено ${dayTransactions?.length || 0} TON депозитов за день`);
      dayTransactions?.forEach((tx, index) => {
        console.log(`  ${index + 1}. ID: ${tx.id}, Время: ${tx.created_at}, Amount: ${tx.amount_ton}`);
        console.log(`      Type: ${tx.type}, Description: ${tx.description}`);
        console.log(`      tx_hash_unique: ${tx.tx_hash_unique?.substring(0, 50)}...`);
      });
    }

    // 6. Временной анализ вокруг 12:50
    console.log('\n6️⃣ ВРЕМЕННОЙ АНАЛИЗ ВОКРУГ 12:50:');
    const { data: timeAnalysis, error: timeError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, amount_ton, currency, description, tx_hash_unique, created_at')
      .eq('user_id', userId)
      .gte('created_at', '2025-08-03T12:48:00')
      .lt('created_at', '2025-08-03T12:52:00')
      .order('created_at', { ascending: false });

    if (timeError) {
      console.error('❌ Ошибка временного анализа:', timeError);
    } else {
      console.log(`✅ Найдено ${timeAnalysis?.length || 0} транзакций в интервале 12:48-12:52`);
      timeAnalysis?.forEach((tx, index) => {
        console.log(`  ${index + 1}. ID: ${tx.id}, Время: ${tx.created_at}, Type: ${tx.type}`);
        console.log(`      Amount: ${tx.amount_ton}, tx_hash: ${tx.tx_hash_unique?.substring(0, 30)}...`);
      });
    }

    console.log('\n🔍 АНАЛИЗ ДЕДУПЛИКАЦИИ:');
    console.log('1. Проверим, применяется ли логика extractBaseBoc()');
    console.log('2. Определим, создаются ли дубликаты до или после нашего фикса');
    console.log('3. Выявим источник дублирования (frontend, backend, или blockchain)');

  } catch (error) {
    console.error('❌ Критическая ошибка расследования:', error);
  }
}

investigateDuplicateBoc().then(() => {
  console.log('\n🏁 Расследование завершено');
  process.exit(0);
}).catch(error => {
  console.error('❌ Фатальная ошибка:', error);
  process.exit(1);
});