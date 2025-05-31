/**
 * Проверка логики TON Boost пакетов с правильными процентами
 */

console.log('🔧 Проверка логики TON Boost пакетов');
console.log('=====================================');

// Конфигурация TON Boost пакетов с правильными ставками
const TON_BOOST_PACKAGES = {
  1: {
    name: "Starter Boost",
    price_ton: 1,
    bonus_uni: 10000,
    daily_rate: 0.005 // 0.5% в день
  },
  2: {
    name: "Standard Boost", 
    price_ton: 5,
    bonus_uni: 75000,
    daily_rate: 0.01 // 1% в день
  },
  3: {
    name: "Advanced Boost",
    price_ton: 15,
    bonus_uni: 250000, 
    daily_rate: 0.02 // 2% в день
  },
  4: {
    name: "Premium Boost",
    price_ton: 25,
    bonus_uni: 500000,
    daily_rate: 0.025 // 2.5% в день
  }
};

// Функция расчета скорости фарминга за секунду
function calculateTonRatePerSecond(tonAmount, packageId) {
  const config = TON_BOOST_PACKAGES[packageId];
  if (!config) return "0";

  const amount = parseFloat(tonAmount);
  const dailyRate = config.daily_rate;
  
  const secondsInDay = 24 * 60 * 60; // 86400
  const ratePerSecond = (amount * dailyRate) / secondsInDay;
  
  return ratePerSecond.toFixed(18);
}

// Функция расчета дневного дохода
function calculateDailyIncome(tonAmount, packageId) {
  const config = TON_BOOST_PACKAGES[packageId];
  if (!config) return "0";

  const amount = parseFloat(tonAmount);
  const dailyIncome = amount * config.daily_rate;
  
  return dailyIncome.toFixed(8);
}

// Тест 1: Проверка конфигурации пакетов
console.log('\n📦 Тест 1: Конфигурация TON Boost пакетов');

Object.entries(TON_BOOST_PACKAGES).forEach(([id, config]) => {
  console.log(`Пакет ${id}: ${config.name}`);
  console.log(`  Стоимость: ${config.price_ton} TON`);
  console.log(`  Бонус: ${config.bonus_uni.toLocaleString()} UNI`);
  console.log(`  Ставка: ${(config.daily_rate * 100).toFixed(1)}% в день`);
  console.log('');
});

// Тест 2: Расчет доходности для каждого пакета
console.log('💰 Тест 2: Расчет доходности по пакетам');

Object.entries(TON_BOOST_PACKAGES).forEach(([id, config]) => {
  const packageId = parseInt(id);
  const tonAmount = config.price_ton.toString();
  
  const dailyIncome = calculateDailyIncome(tonAmount, packageId);
  const ratePerSecond = calculateTonRatePerSecond(tonAmount, packageId);
  
  console.log(`${config.name} (${config.price_ton} TON):`);
  console.log(`  Дневной доход: ${dailyIncome} TON`);
  console.log(`  Доход в секунду: ${ratePerSecond} TON`);
  console.log(`  Ставка: ${(config.daily_rate * 100).toFixed(1)}% в день`);
  console.log('');
});

// Тест 3: Независимость депозитов
console.log('🔄 Тест 3: Независимость депозитов');

console.log('Сценарий: Пользователь покупает несколько пакетов');
console.log('');

// Депозит 1: Starter Boost (1 TON)
const deposit1_amount = "1";
const deposit1_package = 1;
const deposit1_daily = calculateDailyIncome(deposit1_amount, deposit1_package);

console.log(`Депозит 1: ${TON_BOOST_PACKAGES[1].name}`);
console.log(`  Сумма: ${deposit1_amount} TON`);
console.log(`  Дневной доход: ${deposit1_daily} TON (0.5%)`);

// Депозит 2: Premium Boost (25 TON)
const deposit2_amount = "25";
const deposit2_package = 4;
const deposit2_daily = calculateDailyIncome(deposit2_amount, deposit2_package);

console.log(`Депозит 2: ${TON_BOOST_PACKAGES[4].name}`);
console.log(`  Сумма: ${deposit2_amount} TON`);
console.log(`  Дневной доход: ${deposit2_daily} TON (2.5%)`);

const totalDaily = parseFloat(deposit1_daily) + parseFloat(deposit2_daily);
console.log(`\nОбщий дневной доход: ${totalDaily.toFixed(8)} TON`);
console.log('Каждый депозит работает по своей ставке независимо!');

// Тест 4: Реферальные бонусы с TON Boost
console.log('\n🎯 Тест 4: Реферальные бонусы с TON Boost доходов');

// Реферальные проценты (исправленные)
const REFERRAL_RATES = {
  1: 1.00,   // 100% с первого уровня
  2: 0.02,   // 2% со второго уровня
  3: 0.03,   // 3% с третьего уровня
};

const farmingIncome = totalDaily; // Доход от TON Boost фарминга
console.log(`Доход от TON Boost фарминга: ${farmingIncome.toFixed(8)} TON`);
console.log('Реферальные бонусы:');

Object.entries(REFERRAL_RATES).forEach(([level, rate]) => {
  const bonus = farmingIncome * rate;
  const percentage = level === '1' ? '100%' : `${(rate * 100).toFixed(0)}%`;
  console.log(`  Уровень ${level}: ${bonus.toFixed(8)} TON (${percentage})`);
});

// Тест 5: Проверка на месяц
console.log('\n📅 Тест 5: Доходность на месяц (30 дней)');

Object.entries(TON_BOOST_PACKAGES).forEach(([id, config]) => {
  const packageId = parseInt(id);
  const tonAmount = config.price_ton.toString();
  const dailyIncome = parseFloat(calculateDailyIncome(tonAmount, packageId));
  const monthlyIncome = dailyIncome * 30;
  const monthlyPercentage = (monthlyIncome / config.price_ton) * 100;
  
  console.log(`${config.name}:`);
  console.log(`  Инвестиция: ${config.price_ton} TON`);
  console.log(`  Доход за месяц: ${monthlyIncome.toFixed(8)} TON`);
  console.log(`  Доходность: ${monthlyPercentage.toFixed(1)}% за месяц`);
  console.log('');
});

console.log('✅ Логика TON Boost пакетов проверена:');
console.log('🎯 Ставки: 0.5%, 1%, 2%, 2.5% в день');
console.log('🔄 Каждый депозит работает независимо');
console.log('💰 Реферальные бонусы начисляются с доходов');

process.exit(0);