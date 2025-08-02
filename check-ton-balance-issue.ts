import { supabase } from './core/supabaseClient';

async function checkTonBalanceIssue() {
  console.log('=== ПРОВЕРКА ПРОБЛЕМЫ С БАЛАНСОМ TON ===\n');
  
  const userId = '184';
  
  try {
    // 1. Текущий баланс
    const { data: user } = await supabase
      .from('users')
      .select('balance_ton, ton_boost_active, ton_boost_package_id')
      .eq('id', userId)
      .single();
      
    console.log('1. ТЕКУЩЕЕ СОСТОЯНИЕ:');
    console.log(`   Баланс TON: ${user?.balance_ton}`);
    console.log(`   TON Boost активен: ${user?.ton_boost_active ? 'ДА' : 'НЕТ'}`);
    console.log(`   ID пакета: ${user?.ton_boost_package_id || 'нет'}\n`);
    
    // 2. Последние транзакции TON
    console.log('2. ПОСЛЕДНИЕ ТРАНЗАКЦИИ TON:');
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(10);
      
    transactions?.forEach((tx, i) => {
      console.log(`\n   ${i + 1}. ${tx.type}`);
      console.log(`      Сумма: ${tx.amount} TON`);
      console.log(`      Статус: ${tx.status}`);
      console.log(`      Описание: ${tx.description}`);
      console.log(`      Время: ${new Date(tx.created_at).toLocaleString()}`);
    });
    
    // 3. Проверим пакеты TON Boost
    console.log('\n\n3. ДОСТУПНЫЕ TON BOOST ПАКЕТЫ:');
    const { data: packages } = await supabase
      .from('ton_boost_packages')
      .select('*')
      .order('ton_amount', { ascending: true });
      
    packages?.forEach(pkg => {
      console.log(`   Пакет ${pkg.id}: ${pkg.ton_amount} TON → ${pkg.daily_income} UNI/день`);
    });
    
    // 4. Проверим, не обнулился ли баланс из-за точности
    if (user?.balance_ton !== null && user?.balance_ton !== undefined) {
      console.log('\n\n4. АНАЛИЗ БАЛАНСА:');
      console.log(`   Точное значение balance_ton: ${user.balance_ton}`);
      console.log(`   Тип данных: ${typeof user.balance_ton}`);
      
      if (Math.abs(user.balance_ton) < 0.000001 && user.balance_ton !== 0) {
        console.log('   ⚠️ Баланс очень мал, но не равен нулю!');
        console.log('   Возможно, проблема с отображением.');
      }
    }
    
  } catch (error) {
    console.error('Ошибка при проверке:', error);
  }
}

checkTonBalanceIssue();