import { supabase } from './core/supabaseClient';

async function checkBoostPackages() {
  console.log('=== ПРОВЕРКА СТОИМОСТИ TON BOOST ПАКЕТОВ ===\n');
  
  try {
    // 1. Проверяем пакеты в БД
    console.log('1. ПАКЕТЫ В БАЗЕ ДАННЫХ:');
    const { data: packages, error } = await supabase
      .from('ton_boost_packages')
      .select('*')
      .order('id');
      
    if (error) {
      console.log('Ошибка получения пакетов:', error.message);
    } else if (packages && packages.length > 0) {
      packages.forEach(pkg => {
        console.log(`\nПакет ${pkg.id}: "${pkg.name}"`);
        console.log(`  Стоимость: ${pkg.ton_amount} TON`);
        console.log(`  Доход в день: ${pkg.daily_income} UNI`);
        console.log(`  TON в час: ${pkg.ton_per_hour}`);
        console.log(`  Длительность: ${pkg.duration_days} дней`);
      });
    } else {
      console.log('Пакеты не найдены в БД');
    }
    
    // 2. Расчет для пользователя 184
    console.log('\n\n2. РАСЧЕТ ДЛЯ ПОЛЬЗОВАТЕЛЯ 184:');
    console.log('Было TON до покупки: ~100.36');
    console.log('Стало TON после покупки: 0.003993');
    console.log('Исчезло TON: ~100.356');
    
    // 3. Поиск пакета со стоимостью ~100 TON
    if (packages) {
      const matchingPackage = packages.find(pkg => 
        Math.abs(parseFloat(pkg.ton_amount) - 100) < 1
      );
      
      if (matchingPackage) {
        console.log(`\n❗ НАЙДЕН ПОДХОДЯЩИЙ ПАКЕТ:`);
        console.log(`Пакет ${matchingPackage.id}: "${matchingPackage.name}"`);
        console.log(`Стоимость: ${matchingPackage.ton_amount} TON`);
      } else {
        console.log('\n⚠️ НЕ НАЙДЕН пакет со стоимостью ~100 TON');
        console.log('Но пользователь купил пакет 1 (Starter Boost)');
      }
    }
    
    // 4. Проверяем farming_balance
    console.log('\n\n3. АНАЛИЗ FARMING_BALANCE:');
    console.log('ton_farming_balance в users: 115');
    console.log('farming_balance в ton_farming_data: 115');
    console.log('\n🔍 Возможная причина: 115 TON = 100 TON (депозит) + 15 TON (старый баланс?)');
    
    // 5. Вывод
    console.log('\n\n=== ВЫВОД ===');
    console.log('1. Пользователь купил пакет 1 (Starter Boost)');
    console.log('2. Но списалось 100 TON вместо стоимости пакета');
    console.log('3. ton_farming_balance = 115 (возможно накопление депозитов)');
    console.log('4. Транзакция покупки не записалась');
    console.log('\n❗ ПРОБЛЕМА: Код списывает весь баланс вместо стоимости пакета!');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkBoostPackages();