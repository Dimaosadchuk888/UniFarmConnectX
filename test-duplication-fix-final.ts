/**
 * ОКОНЧАТЕЛЬНЫЙ ТЕСТ ИСПРАВЛЕНИЯ ДУБЛИРОВАНИЯ
 * Проверяет исправленную логику дедупликации с корректным SQL запросом
 */

import { supabase } from './core/supabase';
import { UnifiedTransactionService } from './core/TransactionService';

const TARGET_BOC = 'te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKABZpFBvrrFJAWiokVZF0jaVpS4WogHhGrlhtGT3Nx2c+u4VTiWDwFKqA5bFP1f+FcnGm3mCx5TtEYlGNh1ccWBFNTRi7RHrhaAAAG8AAHAEAaEIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKh3NZQAAAAAAAAAAAAAAAAAABGzPzj';

async function testDuplicationFixFinal() {
  console.log('\n🔧 === ОКОНЧАТЕЛЬНЫЙ ТЕСТ ДЕДУПЛИКАЦИИ ===\n');

  const userId = 184;
  const transactionService = UnifiedTransactionService.getInstance();

  try {
    // Очистка предыдущих тестов
    console.log('🧹 Очистка предыдущих тестов...');
    await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .like('description', '%FINAL_DEDUPLICATION_TEST%');

    // Тест 1: Создание первой транзакции
    console.log('\n1️⃣ Создание первой транзакции...');
    const result1 = await transactionService.createTransaction({
      user_id: userId,
      type: 'TON_DEPOSIT',
      amount_uni: 0,
      amount_ton: 2.0,
      description: 'FINAL_DEDUPLICATION_TEST - First transaction',
      metadata: {
        tx_hash: TARGET_BOC,
        test_id: 'test_1'
      }
    });

    console.log(`Результат 1: ${result1.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (!result1.success) console.log(`Ошибка: ${result1.error}`);

    // Тест 2: Попытка создать дубликат с тем же BOC
    console.log('\n2️⃣ Попытка создать дубликат...');
    const result2 = await transactionService.createTransaction({
      user_id: userId,
      type: 'TON_DEPOSIT',
      amount_uni: 0,
      amount_ton: 2.0,
      description: 'FINAL_DEDUPLICATION_TEST - Duplicate (should fail)',
      metadata: {
        tx_hash: TARGET_BOC,
        test_id: 'test_2'
      }
    });

    const deduplicationWorked = !result2.success;
    console.log(`Результат 2: ${deduplicationWorked ? '✅ ЗАБЛОКИРОВАН (хорошо)' : '❌ ПРОШЕЛ (плохо)'}`);
    if (!result2.success) console.log(`✅ Дедупликация: ${result2.error}`);

    // Тест 3: Попытка создать дубликат с суффиксом
    console.log('\n3️⃣ Попытка создать дубликат с суффиксом...');
    const bocWithSuffix = `${TARGET_BOC}_1754226000000_test456`;
    const result3 = await transactionService.createTransaction({
      user_id: userId,
      type: 'TON_DEPOSIT',
      amount_uni: 0,
      amount_ton: 2.0,
      description: 'FINAL_DEDUPLICATION_TEST - Suffix duplicate (should fail)',
      metadata: {
        tx_hash: bocWithSuffix,
        test_id: 'test_3'
      }
    });

    const suffixDeduplicationWorked = !result3.success;
    console.log(`Результат 3: ${suffixDeduplicationWorked ? '✅ ЗАБЛОКИРОВАН (хорошо)' : '❌ ПРОШЕЛ (плохо)'}`);
    if (!result3.success) console.log(`✅ Суффикс дедупликация: ${result3.error}`);

    // Проверка базы данных
    console.log('\n4️⃣ Проверка базы данных...');
    const { data: finalCheck, error: checkError } = await supabase
      .from('transactions')
      .select('id, tx_hash_unique, description')
      .eq('user_id', userId)
      .like('description', '%FINAL_DEDUPLICATION_TEST%');

    const dbCount = finalCheck?.length || 0;
    console.log(`📊 Транзакций в БД: ${dbCount}`);
    
    if (dbCount === 1) {
      console.log('✅ ИДЕАЛЬНО: Только одна транзакция в БД');
    } else {
      console.log('❌ ПРОБЛЕМА: Неожиданное количество транзакций');
      finalCheck?.forEach((tx, i) => {
        console.log(`  ${i+1}. ID: ${tx.id}, Hash: ${tx.tx_hash_unique?.substring(0, 30)}...`);
      });
    }

    // Финальная очистка
    await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .like('description', '%FINAL_DEDUPLICATION_TEST%');

    // ИТОГИ
    console.log('\n🎯 ИТОГИ:');
    console.log(`✅ Первая транзакция создана: ${result1.success}`);
    console.log(`✅ Дубликат заблокирован: ${deduplicationWorked}`);
    console.log(`✅ Суффикс дубликат заблокирован: ${suffixDeduplicationWorked}`);
    console.log(`✅ База данных чистая: ${dbCount === 1}`);

    const allPassed = result1.success && deduplicationWorked && suffixDeduplicationWorked && dbCount === 1;
    
    if (allPassed) {
      console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Дедупликация работает корректно!');
    } else {
      console.log('\n⚠️ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛИЛИСЬ. Дедупликация требует доработки.');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

testDuplicationFixFinal().then(() => {
  console.log('\n🏁 Тест завершен');
  process.exit(0);
}).catch(error => {
  console.error('❌ Фатальная ошибка:', error);
  process.exit(1);
});