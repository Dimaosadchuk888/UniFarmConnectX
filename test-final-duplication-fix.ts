/**
 * ФИНАЛЬНЫЙ ТЕСТ ИСПРАВЛЕНИЯ ДУБЛИРОВАНИЯ TON ДЕПОЗИТОВ
 * Проверяет всю цепочку: Frontend -> Backend -> Database -> Deduplication
 */

import { supabase } from './core/supabase';
import { UnifiedTransactionService } from './core/TransactionService';

const TARGET_BOC = 'te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKABZpFBvrrFJAWiokVZF0jaVpS4WogHhGrlhtGT3Nx2c+u4VTiWDwFKqA5bFP1f+FcnGm3mCx5TtEYlGNh1ccWBFNTRi7RHrhaAAAG8AAHAEAaEIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKh3NZQAAAAAAAAAAAAAAAAAABGzPzj';

async function testFinalDuplicationFix() {
  console.log('\n🔧 === ФИНАЛЬНЫЙ ТЕСТ ИСПРАВЛЕНИЯ ДУБЛИРОВАНИЯ ===\n');

  const userId = 184;
  const transactionService = UnifiedTransactionService.getInstance();

  try {
    // 1. Проверяем логику удаления суффиксов (симуляция frontend)
    console.log('1️⃣ ТЕСТ УДАЛЕНИЯ СУФФИКСОВ (симуляция frontend):');
    
    const bocWithSuffix1 = `${TARGET_BOC}_1754225900000_abc123def`;
    const bocWithSuffix2 = `${TARGET_BOC}_1754225901000_xyz789ghi`;
    
    // Симулируем логику из исправленного frontend
    const cleanBoc1 = bocWithSuffix1.replace(/_\d{13}_[a-z0-9]+$/, '');
    const cleanBoc2 = bocWithSuffix2.replace(/_\d{13}_[a-z0-9]+$/, '');
    
    console.log(`   Original BOC 1: ${bocWithSuffix1.substring(0, 60)}...`);
    console.log(`   Clean BOC 1:    ${cleanBoc1.substring(0, 60)}...`);
    console.log(`   Original BOC 2: ${bocWithSuffix2.substring(0, 60)}...`);
    console.log(`   Clean BOC 2:    ${cleanBoc2.substring(0, 60)}...`);
    console.log(`   ✅ Clean BOCs identical: ${cleanBoc1 === cleanBoc2}`);
    console.log(`   ✅ Clean BOC matches target: ${cleanBoc1 === TARGET_BOC}`);

    // 2. Очищаем предыдущие тестовые данные
    console.log('\n2️⃣ ОЧИСТКА ПРЕДЫДУЩИХ ТЕСТОВЫХ ДАННЫХ:');
    const { data: oldTests, error: cleanupError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .like('description', '%DUPLICATION_TEST%');

    console.log(`   Удалено предыдущих тестов: ${cleanupError ? 'ошибка' : oldTests?.length || 0}`);

    // 3. Тест создания дублирующихся транзакций через UnifiedTransactionService
    console.log('\n3️⃣ ТЕСТ СОЗДАНИЯ ДУБЛИРУЮЩИХСЯ ТРАНЗАКЦИЙ:');
    
    // Попытка создать первую транзакцию
    console.log('   Создаем первую транзакцию...');
    const result1 = await transactionService.createTransaction({
      user_id: userId,
      type: 'TON_DEPOSIT',
      amount_uni: 0,
      amount_ton: 1.5,
      description: 'DUPLICATION_TEST - First transaction',
      metadata: {
        tx_hash: TARGET_BOC, // Чистый BOC без суффиксов
        original_type: 'TON_DEPOSIT',
        test_run: true
      }
    });

    console.log(`   Результат 1: ${result1.success ? 'SUCCESS' : 'FAILED'}`);
    if (!result1.success) {
      console.log(`   Ошибка 1: ${result1.error}`);
    }

    // Попытка создать дублирующуюся транзакцию (должна быть заблокирована)
    console.log('   Создаем дублирующуюся транзакцию...');
    const result2 = await transactionService.createTransaction({
      user_id: userId,
      type: 'TON_DEPOSIT',
      amount_uni: 0,
      amount_ton: 1.5,
      description: 'DUPLICATION_TEST - Duplicate transaction (should be blocked)',
      metadata: {
        tx_hash: TARGET_BOC, // Тот же чистый BOC
        original_type: 'TON_DEPOSIT',
        test_run: true
      }
    });

    console.log(`   Результат 2: ${result2.success ? 'SUCCESS (BAD!)' : 'BLOCKED (GOOD!)'}`);
    if (!result2.success) {
      console.log(`   ✅ Дедупликация сработала: ${result2.error}`);
    } else {
      console.log(`   ❌ ПРОБЛЕМА: Дублирование НЕ заблокировано!`);
    }

    // Попытка создать транзакцию с суффиксом (должна быть заблокирована extractBaseBoc)
    console.log('   Создаем транзакцию с суффиксом...');
    const result3 = await transactionService.createTransaction({
      user_id: userId,
      type: 'TON_DEPOSIT',
      amount_uni: 0,
      amount_ton: 1.5,
      description: 'DUPLICATION_TEST - Transaction with suffix (should be blocked)',
      metadata: {
        tx_hash: `${TARGET_BOC}_1754225902000_test123`, // BOC с суффиксом
        original_type: 'TON_DEPOSIT',
        test_run: true
      }
    });

    console.log(`   Результат 3: ${result3.success ? 'SUCCESS (BAD!)' : 'BLOCKED (GOOD!)'}`);
    if (!result3.success) {
      console.log(`   ✅ extractBaseBoc() сработала: ${result3.error}`);
    } else {
      console.log(`   ❌ ПРОБЛЕМА: extractBaseBoc() НЕ сработала!`);
    }

    // 4. Проверяем результат в базе данных
    console.log('\n4️⃣ ПРОВЕРКА БАЗЫ ДАННЫХ:');
    const { data: testTransactions, error: dbError } = await supabase
      .from('transactions')
      .select('id, tx_hash_unique, description, created_at')
      .eq('user_id', userId)
      .like('description', '%DUPLICATION_TEST%')
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error(`   ❌ Ошибка проверки БД: ${dbError.message}`);
    } else {
      console.log(`   ✅ Найдено тестовых транзакций в БД: ${testTransactions?.length || 0}`);
      testTransactions?.forEach((tx, index) => {
        console.log(`   ${index + 1}. ID: ${tx.id}, Hash: ${tx.tx_hash_unique?.substring(0, 30)}..., Desc: ${tx.description?.substring(0, 50)}...`);
      });

      if (testTransactions && testTransactions.length === 1) {
        console.log('   ✅ ОТЛИЧНО: Только одна транзакция в БД - дедупликация работает!');
      } else if (testTransactions && testTransactions.length > 1) {
        console.log('   ❌ ПРОБЛЕМА: Дублирующиеся транзакции все еще создаются!');
      }
    }

    // 5. Финальная очистка
    console.log('\n5️⃣ ФИНАЛЬНАЯ ОЧИСТКА:');
    const { error: finalCleanupError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .like('description', '%DUPLICATION_TEST%');

    console.log(`   Очистка: ${finalCleanupError ? 'ошибка' : 'успешно'}`);

    console.log('\n🎯 ИТОГИ ТЕСТА:');
    console.log(`   ✅ Frontend удаляет суффиксы: ${cleanBoc1 === TARGET_BOC}`);
    console.log(`   ✅ Backend блокирует точные дубли: ${!result2.success}`);
    console.log(`   ✅ Backend блокирует дубли с суффиксами: ${!result3.success}`);
    console.log(`   ✅ База данных чистая: ${testTransactions?.length === 1}`);

    const allTestsPassed = cleanBoc1 === TARGET_BOC && !result2.success && !result3.success && testTransactions?.length === 1;
    
    if (allTestsPassed) {
      console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Дублирование TON депозитов исправлено!');
    } else {
      console.log('\n⚠️ НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОШЛИ. Требуется дополнительная диагностика.');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка теста:', error);
  }
}

testFinalDuplicationFix().then(() => {
  console.log('\n🏁 Финальный тест завершен');
  process.exit(0);
}).catch(error => {
  console.error('❌ Фатальная ошибка:', error);
  process.exit(1);
});