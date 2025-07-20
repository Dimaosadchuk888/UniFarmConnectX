/**
 * ИСПРАВЛЕНИЕ СУММ В СУЩЕСТВУЮЩИХ ТРАНЗАКЦИЯХ USER 227
 * Копируем amount_ton в amount для корректного отображения
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixExistingUser227Amounts() {
  console.log('🔧 ИСПРАВЛЕНИЕ СУММ В СУЩЕСТВУЮЩИХ ТРАНЗАКЦИЯХ USER 227');
  console.log('='.repeat(55));
  
  try {
    // 1. Найти все транзакции User 227 с amount = 0, но amount_ton > 0
    const { data: brokenTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 227)
      .eq('currency', 'TON')
      .eq('amount', 0)
      .gt('amount_ton', 0);
    
    if (!brokenTransactions || brokenTransactions.length === 0) {
      console.log('✅ Нет транзакций требующих исправления');
      return;
    }
    
    console.log(`\n📊 НАЙДЕНО ${brokenTransactions.length} ТРАНЗАКЦИЙ ДЛЯ ИСПРАВЛЕНИЯ:`);
    
    let totalFixed = 0;
    let totalAmount = 0;
    
    for (const tx of brokenTransactions) {
      console.log(`\n   ID: ${tx.id}`);
      console.log(`   Текущий amount: ${tx.amount}`);
      console.log(`   Корректный amount_ton: ${tx.amount_ton}`);
      console.log(`   Дата: ${tx.created_at}`);
      
      // Исправляем транзакцию
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ amount: tx.amount_ton })
        .eq('id', tx.id);
      
      if (updateError) {
        console.log(`   ❌ Ошибка исправления: ${updateError.message}`);
      } else {
        console.log(`   ✅ Исправлено: amount = ${tx.amount_ton}`);
        totalFixed++;
        totalAmount += parseFloat(tx.amount_ton);
      }
    }
    
    console.log(`\n📈 ИТОГИ ИСПРАВЛЕНИЯ:`);
    console.log(`   Исправлено транзакций: ${totalFixed}`);
    console.log(`   Общая сумма: ${totalAmount.toFixed(6)} TON`);
    
    // 2. Проверяем результат
    const { data: fixedTransactions } = await supabase
      .from('transactions')
      .select('id, amount, amount_ton')
      .eq('user_id', 227)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`\n✅ ПРОВЕРКА РЕЗУЛЬТАТА (последние 5 транзакций):`);
    if (fixedTransactions) {
      fixedTransactions.forEach((tx, i) => {
        const status = tx.amount === tx.amount_ton ? '✅ OK' : '❌ НЕ СОВПАДАЕТ';
        console.log(`   ${i + 1}. ID ${tx.id}: amount=${tx.amount}, amount_ton=${tx.amount_ton} ${status}`);
      });
    }
    
    // 3. Проверяем баланс User 227
    const { data: user227 } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', 227)
      .single();
    
    if (user227) {
      console.log(`\n💰 БАЛАНС USER 227: ${user227.balance_ton} TON`);
      console.log(`   Сумма исправленных транзакций: ${totalAmount.toFixed(6)} TON`);
      
      if (Math.abs(parseFloat(user227.balance_ton) - totalAmount) < 0.01) {
        console.log(`   ✅ Баланс соответствует сумме транзакций`);
      } else {
        console.log(`   ⚠️ Возможно есть другие транзакции влияющие на баланс`);
      }
    }
    
  } catch (error) {
    console.log('❌ Ошибка исправления:', error.message);
  }
}

fixExistingUser227Amounts().catch(console.error);