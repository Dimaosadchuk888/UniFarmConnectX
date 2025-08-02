import { BOOST_PACKAGES } from './modules/boost/model';

async function testBoostPackage() {
  console.log('=== ТЕСТ ПОЛУЧЕНИЯ ПАКЕТА BOOST ===\n');
  
  // 1. Проверяем константу STARTER пакета
  console.log('1. КОНСТАНТА STARTER ПАКЕТА:');
  console.log(JSON.stringify(BOOST_PACKAGES.STARTER, null, 2));
  console.log(`\nmin_amount из константы: ${BOOST_PACKAGES.STARTER.min_amount}`);
  console.log(`Тип min_amount: ${typeof BOOST_PACKAGES.STARTER.min_amount}`);
  
  // 2. Эмулируем логику getBoostPackages
  console.log('\n2. ЭМУЛЯЦИЯ getBoostPackages():');
  const packages = [
    {
      id: 1,
      name: BOOST_PACKAGES.STARTER.name,
      description: "1% в день на 365 дней + 10,000 UNI бонус",
      daily_rate: parseFloat(BOOST_PACKAGES.STARTER.daily_rate),
      duration_days: BOOST_PACKAGES.STARTER.duration_days,
      min_amount: parseFloat(BOOST_PACKAGES.STARTER.min_amount),
      max_amount: parseFloat(BOOST_PACKAGES.STARTER.max_amount),
      uni_bonus: parseFloat(BOOST_PACKAGES.STARTER.uni_bonus),
      is_active: true
    }
  ];
  
  const package1 = packages[0];
  console.log('\nПакет 1 после обработки:');
  console.log(JSON.stringify(package1, null, 2));
  console.log(`\nmin_amount после parseFloat: ${package1.min_amount}`);
  console.log(`Тип min_amount: ${typeof package1.min_amount}`);
  
  // 3. Проверяем, что будет передано в purchaseWithInternalWallet
  console.log('\n3. ПРОВЕРКА requiredAmount:');
  const requiredAmount = package1.min_amount || 0;
  console.log(`requiredAmount = ${requiredAmount}`);
  console.log(`Тип requiredAmount: ${typeof requiredAmount}`);
  
  // 4. Анализ проблемы
  console.log('\n\n=== АНАЛИЗ ===');
  console.log('Ожидаемая стоимость пакета 1: 1 TON');
  console.log(`Фактическая стоимость из кода: ${requiredAmount} TON`);
  console.log('Списалось у пользователя: ~100 TON');
  console.log('\n❓ ЗАГАДКА: Почему списалось 100 TON вместо 1 TON?');
  
  // 5. Возможные причины
  console.log('\n\n=== ВОЗМОЖНЫЕ ПРИЧИНЫ ===');
  console.log('1. В момент покупки был другой баланс или другие данные');
  console.log('2. Есть другой код, который модифицирует баланс после покупки');
  console.log('3. В базе данных есть триггер, который обнуляет баланс');
  console.log('4. Функция getWalletDataByUserId возвращает неправильные данные');
  console.log('5. В коде есть ошибка, которая использует баланс вместо стоимости пакета');
}

testBoostPackage();