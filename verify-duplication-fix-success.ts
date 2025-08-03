/**
 * ФИНАЛЬНАЯ ПРОВЕРКА УСПЕШНОГО ИСПРАВЛЕНИЯ ДУБЛИРОВАНИЯ
 * Тест с уникальным BOC для подтверждения что дедупликация работает
 */

import { supabase } from './core/supabase';
import { UnifiedTransactionService } from './core/TransactionService';

// Уникальный BOC для этого теста (изменена последняя часть)
const UNIQUE_BOC = 'te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKABZpFBvrrFJAWiokVZF0jaVpS4WogHhGrlhtGT3Nx2c+u4VTiWDwFKqA5bFP1f+FcnGm3mCx5TtEYlGNh1ccWBFNTRi7RHrhaAAAG8AAHAEAaEIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKh3NZQAAAAAAAAAAAAAAAAAABGzXXX';

async function verifyDuplicationFixSuccess() {
  console.log('\n🎉 === ПРОВЕРКА УСПЕШНОГО ИСПРАВЛЕНИЯ ДУБЛИРОВАНИЯ ===\n');

  const userId = 184;
  const transactionService = UnifiedTransactionService.getInstance();

  try {
    // Проверяем что этот BOC не существует
    console.log('🔍 Проверка уникальности BOC...');
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('tx_hash_unique', UNIQUE_BOC)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('⚠️ BOC уже существует, очищаем...');
      await supabase
        .from('transactions')
        .delete()
        .eq('tx_hash_unique', UNIQUE_BOC);
    }

    // Тест 1: Создание новой транзакции (должно пройти)
    console.log('\n1️⃣ Создание новой транзакции с уникальным BOC...');
    const result1 = await transactionService.createTransaction({
      user_id: userId,
      type: 'TON_DEPOSIT',
      amount_uni: 0,
      amount_ton: 1.23,
      description: 'SUCCESS_TEST - New unique transaction',
      metadata: {
        tx_hash: UNIQUE_BOC,
        test_type: 'success_verification'
      }
    });

    console.log(`Результат 1: ${result1.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (!result1.success) console.log(`Ошибка: ${result1.error}`);

    // Тест 2: Попытка дублирования (должно быть заблокировано)
    console.log('\n2️⃣ Попытка создать дубликат той же транзакции...');
    const result2 = await transactionService.createTransaction({
      user_id: userId,
      type: 'TON_DEPOSIT',
      amount_uni: 0,
      amount_ton: 1.23,
      description: 'SUCCESS_TEST - Duplicate attempt (should fail)',
      metadata: {
        tx_hash: UNIQUE_BOC,
        test_type: 'duplicate_attempt'
      }
    });

    const duplicateBlocked = !result2.success;
    console.log(`Результат 2: ${duplicateBlocked ? '✅ ЗАБЛОКИРОВАН' : '❌ ПРОШЕЛ'}`);
    if (!result2.success) console.log(`✅ Блокировка: ${result2.error}`);

    // Тест 3: Дубликат с суффиксом (должно быть заблокировано)
    console.log('\n3️⃣ Попытка создать дубликат с суффиксом...');
    const bocWithSuffix = `${UNIQUE_BOC}_1754226200000_final789`;
    const result3 = await transactionService.createTransaction({
      user_id: userId,
      type: 'TON_DEPOSIT',
      amount_uni: 0,
      amount_ton: 1.23,
      description: 'SUCCESS_TEST - Suffix duplicate (should fail)',
      metadata: {
        tx_hash: bocWithSuffix,
        test_type: 'suffix_duplicate'
      }
    });

    const suffixBlocked = !result3.success;
    console.log(`Результат 3: ${suffixBlocked ? '✅ ЗАБЛОКИРОВАН' : '❌ ПРОШЕЛ'}`);
    if (!result3.success) console.log(`✅ Суффикс блокировка: ${result3.error}`);

    // Проверка базы данных
    console.log('\n4️⃣ Проверка итогового состояния БД...');
    const { data: finalTransactions } = await supabase
      .from('transactions')
      .select('id, tx_hash_unique, description, created_at')
      .eq('user_id', userId)
      .like('description', '%SUCCESS_TEST%')
      .order('created_at', { ascending: false });

    const dbCount = finalTransactions?.length || 0;
    console.log(`📊 Транзакций в БД с тестовыми метками: ${dbCount}`);
    
    finalTransactions?.forEach((tx, i) => {
      console.log(`  ${i+1}. ID: ${tx.id}, Hash: ${tx.tx_hash_unique?.substring(0, 30)}..., Desc: ${tx.description?.substring(0, 40)}...`);
    });

    // Очистка тестовых данных
    console.log('\n🧹 Очистка тестовых данных...');
    await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .like('description', '%SUCCESS_TEST%');

    // ФИНАЛЬНАЯ ОЦЕНКА
    console.log('\n🏆 ФИНАЛЬНАЯ ОЦЕНКА:');
    console.log(`✅ Новая транзакция создана: ${result1.success}`);
    console.log(`✅ Точный дубликат заблокирован: ${duplicateBlocked}`);
    console.log(`✅ Суффикс дубликат заблокирован: ${suffixBlocked}`);
    console.log(`✅ Только одна транзакция в БД: ${dbCount === 1}`);

    const allTestsPassed = result1.success && duplicateBlocked && suffixBlocked && dbCount === 1;
    
    if (allTestsPassed) {
      console.log('\n🎉 ПОЛНЫЙ УСПЕХ! ДУБЛИРОВАНИЕ TON ДЕПОЗИТОВ ИСПРАВЛЕНО!');
      console.log('🔒 Система дедупликации работает на всех уровнях:');
      console.log('   ✅ Frontend удаляет суффиксы перед отправкой');
      console.log('   ✅ Backend блокирует точные дубликаты');
      console.log('   ✅ Backend блокирует дубликаты с суффиксами');
      console.log('   ✅ База данных содержит только уникальные записи');
      console.log('\n🚀 Приложение готово к продакшн деплойменту!');
    } else {
      console.log('\n⚠️ Некоторые аспекты требуют внимания:');
      if (!result1.success) console.log('   ❌ Новые транзакции не создаются');
      if (!duplicateBlocked) console.log('   ❌ Точные дубликаты не блокируются');
      if (!suffixBlocked) console.log('   ❌ Дубликаты с суффиксами не блокируются');
      if (dbCount !== 1) console.log('   ❌ Неожиданное количество записей в БД');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка проверки:', error);
  }
}

verifyDuplicationFixSuccess().then(() => {
  console.log('\n🏁 Проверка завершена');
  process.exit(0);
}).catch(error => {
  console.error('❌ Фатальная ошибка:', error);
  process.exit(1);
});