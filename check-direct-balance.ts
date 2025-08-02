import { supabase } from './core/supabaseClient';

async function checkDirectBalance() {
  console.log('=== ПРЯМАЯ ПРОВЕРКА БАЛАНСА В БД ===\n');
  
  const userId = '184';
  
  try {
    // 1. Проверяем баланс напрямую в таблице users
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, balance_ton, balance_uni, ton_boost_active, ton_boost_package, ton_farming_balance')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.log('Ошибка получения данных:', error);
      return;
    }
    
    console.log('ДАННЫЕ ПОЛЬЗОВАТЕЛЯ В ТАБЛИЦЕ users:');
    console.log(`ID: ${userData.id}`);
    console.log(`balance_ton: ${userData.balance_ton}`);
    console.log(`balance_uni: ${userData.balance_uni}`);
    console.log(`ton_boost_active: ${userData.ton_boost_active}`);
    console.log(`ton_boost_package: ${userData.ton_boost_package}`);
    console.log(`ton_farming_balance: ${userData.ton_farming_balance}`);
    
    // 2. Проверяем покупки TON Boost
    console.log('\n\nПОКУПКИ TON BOOST:');
    const { data: boostPurchases } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('type', 'TON_BOOST_PURCHASE')
      .order('created_at', { ascending: false });
      
    if (boostPurchases && boostPurchases.length > 0) {
      boostPurchases.forEach((tx, i) => {
        console.log(`\n${i + 1}. Покупка:`)
        console.log(`   Сумма: ${tx.amount} TON`);
        console.log(`   Статус: ${tx.status}`);
        console.log(`   Время: ${new Date(tx.created_at).toLocaleString()}`);
      });
    } else {
      console.log('Покупок TON Boost не найдено');
    }
    
    // 3. Попробуем исправить баланс, если он null или undefined
    if (userData.balance_ton === null || userData.balance_ton === undefined) {
      console.log('\n\n⚠️ ОБНАРУЖЕНА ПРОБЛЕМА: balance_ton = null/undefined');
      console.log('Это может произойти из-за ошибки в коде покупки boost пакета.');
      
      // Считаем, сколько должно быть TON
      console.log('\nРАСЧЕТ ОЖИДАЕМОГО БАЛАНСА:');
      console.log('Пополнение: +100 TON');
      
      // Проверяем стоимость первого пакета
      const { data: package1 } = await supabase
        .from('ton_boost_packages')
        .select('ton_amount')
        .eq('id', 1)
        .single();
        
      if (package1) {
        console.log(`Покупка пакета 1: -${package1.ton_amount} TON`);
        const expectedBalance = 100 - package1.ton_amount;
        console.log(`Ожидаемый баланс: ${expectedBalance} TON`);
      }
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkDirectBalance();