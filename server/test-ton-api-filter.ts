/**
 * Тестирование API фильтрации TON транзакций
 * БЕЗ ИЗМЕНЕНИЯ КОДА - только проверка
 */

import { supabase } from '../core/supabase';
import { transactionService } from '../core/TransactionService';

async function testTonApiFilter() {
  console.log('\n=== ТЕСТИРОВАНИЕ API ФИЛЬТРАЦИИ TON ТРАНЗАКЦИЙ ===\n');
  
  const userId = 184;
  
  // 1. Проверяем прямой запрос к БД
  console.log('1️⃣ ПРЯМОЙ ЗАПРОС К БД (как должно работать):');
  
  const { data: directTon, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(20);
    
  console.log(`Найдено TON транзакций: ${directTon?.length || 0}`);
  if (directTon && directTon.length > 0) {
    console.log('Первые 3 транзакции:');
    directTon.slice(0, 3).forEach(tx => {
      console.log(`- ID ${tx.id}: ${tx.amount} ${tx.currency}, type=${tx.type}`);
    });
  }
  
  // 2. Проверяем через UnifiedTransactionService
  console.log('\n\n2️⃣ ЧЕРЕЗ UnifiedTransactionService (как работает API):');
  
  const result = await transactionService.getUserTransactions(
    userId,
    1,
    20,
    { currency: 'TON' }
  );
  
  console.log(`Найдено транзакций: ${result.transactions.length}`);
  console.log(`Total в ответе: ${result.total}`);
  
  if (result.transactions.length > 0) {
    console.log('\nПервые 3 транзакции:');
    result.transactions.slice(0, 3).forEach(tx => {
      console.log(`- ID ${tx.id}: ${tx.amount} ${tx.currency}, type=${tx.type}`);
    });
  }
  
  // 3. Проверяем логику фильтрации в TransactionService
  console.log('\n\n3️⃣ АНАЛИЗ ПРОБЛЕМЫ:');
  
  // Смотрим что возвращает API без фильтра
  const allResult = await transactionService.getUserTransactions(
    userId,
    1,
    100
  );
  
  const tonInAll = allResult.transactions.filter(tx => tx.currency === 'TON');
  console.log(`\nВ общем списке найдено TON транзакций: ${tonInAll.length}`);
  
  // 4. Проверяем структуру транзакций
  console.log('\n\n4️⃣ СТРУКТУРА TON ТРАНЗАКЦИЙ:');
  
  if (directTon && directTon.length > 0) {
    const firstTx = directTon[0];
    console.log('\nПример TON транзакции из БД:');
    console.log(JSON.stringify({
      id: firstTx.id,
      type: firstTx.type,
      amount: firstTx.amount,
      amount_uni: firstTx.amount_uni,
      amount_ton: firstTx.amount_ton,
      currency: firstTx.currency,
      status: firstTx.status
    }, null, 2));
  }
  
  // 5. Проверяем код фильтрации
  console.log('\n\n5️⃣ КОД ФИЛЬТРАЦИИ:');
  console.log('core/TransactionService.ts строки 169-207:');
  console.log('- Строка 173: фильтр по currency применяется на уровне БД');
  console.log('- Строки 204-206: дополнительная фильтрация на уровне приложения');
  console.log('- Проблема может быть в двойной фильтрации!');
  
  // 6. Финальный вывод
  console.log('\n\n📊 ИТОГОВЫЙ АНАЛИЗ:');
  console.log('====================');
  
  if (directTon?.length !== result.transactions.length) {
    console.log('❌ ПРОБЛЕМА ОБНАРУЖЕНА!');
    console.log(`- БД возвращает: ${directTon?.length || 0} TON транзакций`);
    console.log(`- API возвращает: ${result.transactions.length} транзакций`);
    console.log(`- Разница: ${(directTon?.length || 0) - result.transactions.length}`);
    console.log('\nВозможная причина: двойная фильтрация или неправильная обработка');
  } else {
    console.log('✅ API фильтрация работает корректно');
  }
}

// Запускаем тест
testTonApiFilter()
  .then(() => console.log('\n✅ Тест завершен'))
  .catch(error => console.error('❌ Ошибка:', error));