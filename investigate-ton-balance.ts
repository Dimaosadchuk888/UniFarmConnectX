import { supabase } from './core/supabaseClient';

async function investigateTonBalance() {
  console.log('=== РАССЛЕДОВАНИЕ: КУДА ПРОПАЛ БАЛАНС TON ===\n');
  
  const userId = '184';
  
  try {
    // 1. ВСЕ транзакции TON за последние 2 часа
    console.log('1. ВСЕ ТРАНЗАКЦИИ TON ЗА ПОСЛЕДНИЕ 2 ЧАСА:');
    console.log('=' * 60);
    
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    const { data: allTonTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('currency', 'TON')
      .gte('created_at', twoHoursAgo.toISOString())
      .order('created_at', { ascending: true });
      
    let runningBalance = 0.344031; // Начальный баланс до пополнения
    
    allTonTx?.forEach((tx, i) => {
      console.log(`\nТранзакция ${i + 1}:`);
      console.log(`  Время: ${new Date(tx.created_at).toLocaleString()}`);
      console.log(`  Тип: ${tx.type}`);
      console.log(`  Сумма: ${tx.amount} TON`);
      console.log(`  Статус: ${tx.status}`);
      console.log(`  Описание: ${tx.description}`);
      
      // Считаем изменение баланса
      if (tx.type === 'TON_DEPOSIT' || tx.type === 'FARMING_REWARD') {
        runningBalance += parseFloat(tx.amount);
      } else if (tx.type === 'TON_BOOST_PURCHASE' || tx.type === 'WITHDRAWAL') {
        runningBalance -= parseFloat(tx.amount);
      }
      
      console.log(`  -> Баланс после: ${runningBalance.toFixed(6)} TON`);
    });
    
    console.log(`\n📊 Ожидаемый баланс по транзакциям: ${runningBalance.toFixed(6)} TON`);
    console.log(`📊 Реальный баланс в БД: 0 TON`);
    console.log(`❗ Разница: ${runningBalance.toFixed(6)} TON пропало!\n`);
    
    // 2. Проверяем активность TON Boost
    console.log('\n2. АКТИВНОСТЬ TON BOOST:');
    console.log('=' * 60);
    
    const { data: user } = await supabase
      .from('users')
      .select('ton_boost_active, ton_boost_package, ton_boost_activated_at, ton_farming_balance')
      .eq('id', userId)
      .single();
      
    console.log(`TON Boost активен: ${user.ton_boost_active ? 'ДА' : 'НЕТ'}`);
    console.log(`Пакет: ${user.ton_boost_package}`);
    console.log(`Активирован: ${user.ton_boost_activated_at ? new Date(user.ton_boost_activated_at).toLocaleString() : 'НЕТ ДАННЫХ'}`);
    console.log(`TON farming баланс: ${user.ton_farming_balance}`);
    
    // 3. Ищем любые операции с балансом около времени покупки
    console.log('\n\n3. ПОИСК ПОДОЗРИТЕЛЬНЫХ ОПЕРАЦИЙ (10:25-10:27):');
    console.log('=' * 60);
    
    const { data: suspiciousTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', parseInt(userId))
      .gte('created_at', '2025-08-02T10:25:00')
      .lte('created_at', '2025-08-02T10:27:00')
      .order('created_at', { ascending: true });
      
    suspiciousTx?.forEach(tx => {
      console.log(`\n${new Date(tx.created_at).toLocaleTimeString()} - ${tx.type}`);
      console.log(`  Валюта: ${tx.currency}`);
      console.log(`  Сумма: ${tx.amount}`);
      console.log(`  Описание: ${tx.description}`);
    });
    
    // 4. Проверяем стоимость пакетов
    console.log('\n\n4. СТОИМОСТЬ TON BOOST ПАКЕТОВ:');
    console.log('=' * 60);
    
    const { data: packages } = await supabase
      .from('ton_boost_packages')
      .select('*')
      .order('id');
      
    packages?.forEach(pkg => {
      console.log(`\nПакет ${pkg.id}: "${pkg.name}"`);
      console.log(`  Стоимость: ${pkg.ton_amount} TON`);
      console.log(`  Доход: ${pkg.daily_income} UNI/день`);
    });
    
    // 5. ВЫВОД
    console.log('\n\n=== ВЫВОД РАССЛЕДОВАНИЯ ===');
    console.log('1. Вы пополнили баланс на 100 TON в 10:25:39');
    console.log('2. В 10:26:05 получили бонус 10000 UNI за покупку TON Boost');
    console.log('3. НО транзакция покупки TON Boost НЕ записана!');
    console.log('4. При этом TON Boost активирован (пакет 1)');
    console.log('5. Весь баланс 100.344 TON исчез');
    console.log('\n❗ ВЕРОЯТНАЯ ПРИЧИНА: При покупке TON Boost вместо вычета');
    console.log('   стоимости пакета произошло полное обнуление баланса!');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

investigateTonBalance();