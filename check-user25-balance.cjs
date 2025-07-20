/**
 * ПРОВЕРКА БАЛАНСА USER #25 - ТОТ САМЫЙ ТЕСТОВЫЙ ПОЛЬЗОВАТЕЛЬ
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser25() {
  console.log('🔍 ПРОВЕРКА USER #25 ИЗ ТЗ');
  console.log('='.repeat(40));
  
  try {
    // Получаем пользователя #25
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_ton, balance_uni, telegram_id')
      .eq('id', 25)
      .single();
    
    if (userError) {
      console.log('❌ Ошибка получения User #25:', userError.message);
      return;
    }
    
    if (!user) {
      console.log('❌ User #25 не найден');
      return;
    }
    
    console.log('👤 USER #25:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Telegram ID: ${user.telegram_id}`);
    console.log(`   TON баланс: ${user.balance_ton}`);
    console.log(`   UNI баланс: ${user.balance_uni}`);
    
    // Получаем все TON транзакции для User #25
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false });
    
    if (txError) {
      console.log('❌ Ошибка получения транзакций:', txError.message);
      return;
    }
    
    console.log(`\n📊 TON ТРАНЗАКЦИИ USER #25 (${transactions?.length || 0}):`);
    
    if (transactions && transactions.length > 0) {
      let totalDeposits = 0;
      let totalWithdraws = 0;
      
      transactions.forEach((tx, i) => {
        console.log(`\n   ${i + 1}. ID: ${tx.id}`);
        console.log(`      Тип: ${tx.type}`);
        console.log(`      Сумма: ${tx.amount} TON`);
        console.log(`      Описание: ${tx.description}`);
        console.log(`      Дата: ${tx.created_at}`);
        console.log(`      Статус: ${tx.status}`);
        
        if (tx.type === 'DEPOSIT') {
          totalDeposits += parseFloat(tx.amount || tx.amount_ton || 0);
        } else if (tx.type === 'WITHDRAWAL') {
          totalWithdraws += parseFloat(tx.amount || tx.amount_ton || 0);
        }
      });
      
      console.log(`\n💰 ИТОГО:`);
      console.log(`   Депозиты: ${totalDeposits} TON`);
      console.log(`   Выводы: ${totalWithdraws} TON`);
      console.log(`   Расчетный баланс: ${totalDeposits - totalWithdraws} TON`);
      console.log(`   Фактический баланс: ${user.balance_ton} TON`);
      
      const diff = parseFloat(user.balance_ton) - (totalDeposits - totalWithdraws);
      if (Math.abs(diff) > 0.0001) {
        console.log(`   ⚠️ НЕСООТВЕТСТВИЕ: ${diff} TON`);
      } else {
        console.log(`   ✅ Баланс корректный`);
      }
      
    } else {
      console.log('   ❌ TON транзакции не найдены');
    }
    
  } catch (error) {
    console.log('❌ Критическая ошибка:', error.message);
  }
}

checkUser25().catch(console.error);