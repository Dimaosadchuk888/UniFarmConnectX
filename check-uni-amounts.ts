import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function checkUniAmounts() {
  console.log('\n=== ПРОВЕРКА ПОЛЯ AMOUNT_UNI В ТРАНЗАКЦИЯХ ===\n');
  
  // 1. Проверяем транзакции где currency=UNI
  const { data: uniTx, count: uniCount } = await supabase
    .from('transactions')
    .select('id, type, amount, amount_uni, currency', { count: 'exact' })
    .eq('currency', 'UNI')
    .eq('user_id', 184)
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('1. UNI транзакции пользователя 184:');
  console.log(`   Всего найдено: ${uniCount}\n`);
  console.log('   Последние 10 транзакций:');
  console.log('   ID       | amount       | amount_uni | type');
  console.log('   ---------|--------------|------------|--------------------');
  
  uniTx?.forEach(t => {
    const amount = t.amount ? parseFloat(t.amount).toFixed(6) : 'NULL';
    const amount_uni = t.amount_uni !== null ? parseFloat(t.amount_uni).toFixed(6) : 'NULL';
    console.log(`   ${t.id.toString().padEnd(8)} | ${amount.padEnd(12)} | ${amount_uni.padEnd(10)} | ${t.type}`);
  });
  
  // 2. Проверяем есть ли расхождения между amount и amount_uni
  console.log('\n2. АНАЛИЗ РАСХОЖДЕНИЙ:');
  
  const { data: mismatch } = await supabase
    .from('transactions')
    .select('id, amount, amount_uni, currency')
    .eq('currency', 'UNI')
    .eq('user_id', 184)
    .not('amount_uni', 'is', null)
    .limit(100);
  
  let nullAmountUni = 0;
  let zeroAmountUni = 0;
  let mismatchCount = 0;
  
  mismatch?.forEach(t => {
    if (t.amount_uni === null) {
      nullAmountUni++;
    } else if (parseFloat(t.amount_uni) === 0) {
      zeroAmountUni++;
    } else if (t.amount && Math.abs(parseFloat(t.amount) - parseFloat(t.amount_uni)) > 0.000001) {
      mismatchCount++;
    }
  });
  
  console.log(`   - amount_uni = NULL: ${nullAmountUni} транзакций`);
  console.log(`   - amount_uni = 0: ${zeroAmountUni} транзакций`);
  console.log(`   - amount != amount_uni: ${mismatchCount} транзакций`);
  
  // 3. Проверяем фильтр который использует система
  console.log('\n3. РЕЗУЛЬТАТ ФИЛЬТРАЦИИ:');
  
  // Фильтр из кода: currency.eq.UNI,amount_uni.gt.0
  const { data: filtered, count: filteredCount } = await supabase
    .from('transactions')
    .select('id, amount, amount_uni, currency', { count: 'exact' })
    .eq('user_id', 184)
    .or('currency.eq.UNI,amount_uni.gt.0')
    .limit(5);
  
  console.log(`   Фильтр 'currency.eq.UNI,amount_uni.gt.0' находит: ${filteredCount} транзакций`);
  
  // Альтернативный фильтр только по currency
  const { count: onlyCurrencyCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', 184)
    .eq('currency', 'UNI');
  
  console.log(`   Фильтр только 'currency.eq.UNI' находит: ${onlyCurrencyCount} транзакций`);
  
  // 4. ВЫВОДЫ
  console.log('\n4. ВЫВОДЫ:');
  
  if (uniCount! > 0 && filteredCount === onlyCurrencyCount) {
    console.log('   ✅ Фильтрация работает корректно');
    console.log('   ✅ Транзакции есть в БД и правильно фильтруются');
    console.log('   ❌ ПРОБЛЕМА В FRONTEND: транзакции не отображаются в UI');
  } else if (uniCount! > filteredCount!) {
    console.log('   ⚠️ Фильтр пропускает некоторые транзакции');
    console.log(`   - По currency=UNI: ${uniCount} транзакций`);
    console.log(`   - По фильтру из кода: ${filteredCount} транзакций`);
    console.log(`   - Потеряно: ${uniCount! - filteredCount!} транзакций`);
  }
  
  console.log('\n=== ПРОВЕРКА ЗАВЕРШЕНА ===\n');
}

checkUniAmounts().catch(console.error);