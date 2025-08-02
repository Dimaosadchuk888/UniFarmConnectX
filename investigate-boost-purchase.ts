import { supabase } from './core/supabaseClient';

async function investigateBoostPurchase() {
  console.log('=== РАССЛЕДОВАНИЕ: КОД ПОКУПКИ TON BOOST ===\n');
  
  const userId = '184';
  
  try {
    // 1. Проверяем пакеты и их стоимость
    console.log('1. ИНФОРМАЦИЯ О TON BOOST ПАКЕТАХ:');
    console.log('=' * 60);
    
    const { data: packages } = await supabase
      .from('ton_boost_packages')
      .select('*')
      .order('id');
      
    packages?.forEach(pkg => {
      console.log(`\nПакет ${pkg.id}: "${pkg.name}"`);
      console.log(`  Стоимость: ${pkg.ton_amount} TON`);
      console.log(`  Доход в день: ${pkg.daily_income} UNI`);
      console.log(`  TON в час: ${pkg.ton_per_hour}`);
    });
    
    // 2. Проверяем состояние пользователя
    console.log('\n\n2. ТЕКУЩЕЕ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ:');
    console.log('=' * 60);
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('balance_ton, balance_uni, ton_boost_active, ton_boost_package, ton_boost_activated_at, ton_farming_balance')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.log('Ошибка получения данных пользователя:', userError);
    } else {
      console.log(`Баланс TON: ${user.balance_ton}`);
      console.log(`Баланс UNI: ${user.balance_uni}`);
      console.log(`TON Boost активен: ${user.ton_boost_active ? 'ДА' : 'НЕТ'}`);
      console.log(`Активный пакет: ${user.ton_boost_package || 'НЕТ'}`);
      console.log(`Дата активации: ${user.ton_boost_activated_at ? new Date(user.ton_boost_activated_at).toLocaleString() : 'НЕТ'}`);
      console.log(`TON farming баланс: ${user.ton_farming_balance}`);
    }
    
    // 3. Анализ транзакций в критическое время
    console.log('\n\n3. ТРАНЗАКЦИИ В МОМЕНТ ПОКУПКИ (10:25-10:27):');
    console.log('=' * 60);
    
    const { data: criticalTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', parseInt(userId))
      .gte('created_at', '2025-08-02T10:25:00')
      .lte('created_at', '2025-08-02T10:27:00')
      .order('created_at', { ascending: true });
      
    criticalTx?.forEach((tx, i) => {
      console.log(`\n${i + 1}. ${new Date(tx.created_at).toLocaleTimeString()}`);
      console.log(`   Тип: ${tx.type}`);
      console.log(`   Валюта: ${tx.currency}`);
      console.log(`   Сумма: ${tx.amount}`);
      console.log(`   Описание: ${tx.description}`);
    });
    
    // 4. Поиск кода покупки
    console.log('\n\n4. АНАЛИЗ ПРОБЛЕМЫ:');
    console.log('=' * 60);
    
    console.log('\nХРОНОЛОГИЯ СОБЫТИЙ:');
    console.log('10:25:39 - Пополнение +100 TON (транзакция записана)');
    console.log('10:26:05 - Бонус +10000 UNI за покупку TON Boost (транзакция записана)');
    console.log('10:26:XX - Покупка TON Boost пакета 1 (транзакция НЕ записана!)');
    console.log('10:27:XX - Баланс TON = 0 (должно быть ~100.36)');
    
    console.log('\n❗ КЛЮЧЕВЫЕ НАХОДКИ:');
    console.log('1. Транзакция покупки TON Boost НЕ ЗАПИСАЛАСЬ в базу данных');
    console.log('2. Но TON Boost АКТИВИРОВАЛСЯ (идут доходы с пакета 1)');
    console.log('3. Весь баланс TON обнулился (100.36 → 0)');
    console.log('4. Получен бонус 10000 UNI за покупку');
    
    console.log('\n🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('1. В коде покупки есть ошибка: balance_ton = 0 вместо balance_ton - стоимость');
    console.log('2. Или используется неправильная формула: balance_ton = balance_ton - balance_ton');
    console.log('3. Или проблема с типами данных (null, undefined)');
    
    // 5. Проверяем файлы кода
    console.log('\n\n5. ФАЙЛЫ ДЛЯ ПРОВЕРКИ:');
    console.log('=' * 60);
    console.log('modules/boost/service.ts - основная логика покупки');
    console.log('modules/tonFarming/repository.ts - работа с TON farming');
    console.log('core/BalanceManager.ts - управление балансами');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

investigateBoostPurchase();