#!/usr/bin/env node

/**
 * Расчет ожидаемого дохода за 5 минут для пользователя 184
 * На основе текущих депозитов и интервального режима
 */

console.log('💰 РАСЧЕТ ОЖИДАЕМОГО ДОХОДА ЗА 5 МИНУТ');
console.log('='.repeat(50));

// Данные из логов браузера
const currentData = {
  userId: 184,
  uniBalance: 276043.577405,
  tonBalance: 4.054705,
  uniFarmingActive: true,
  uniDepositAmount: 19291,  // Текущий депозит UNI
  uniFarmingBalance: 0
};

console.log('\n📊 ТЕКУЩИЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ 184:');
console.log(`  UNI Баланс: ${currentData.uniBalance.toLocaleString()} UNI`);
console.log(`  TON Баланс: ${currentData.tonBalance} TON`);
console.log(`  UNI Депозит в фарминге: ${currentData.uniDepositAmount.toLocaleString()} UNI`);
console.log(`  Статус фарминга: ${currentData.uniFarmingActive ? 'АКТИВЕН' : 'НЕАКТИВЕН'}`);

console.log('\n🔍 ИНТЕРВАЛЬНЫЙ РЕЖИМ - РАСЧЕТ ДОХОДА:');

// Формула UNI Farming из UnifiedFarmingCalculator.ts:
// 1% годовых = 0.01
// 365 дней в году = 365
// 24 часа в дне = 24
// 12 интервалов по 5 минут в часе = 12
// Итого интервалов в году: 365 * 24 * 12 = 105,120

const ANNUAL_RATE = 0.01;  // 1% годовых
const DAYS_PER_YEAR = 365;
const HOURS_PER_DAY = 24;
const INTERVALS_PER_HOUR = 12;  // каждые 5 минут
const TOTAL_INTERVALS_PER_YEAR = DAYS_PER_YEAR * HOURS_PER_DAY * INTERVALS_PER_HOUR;

console.log(`  Годовая ставка: ${ANNUAL_RATE * 100}%`);
console.log(`  Интервалов в году: ${TOTAL_INTERVALS_PER_YEAR.toLocaleString()}`);

// Расчет дохода за 1 интервал (5 минут)
const incomePerInterval = (currentData.uniDepositAmount * ANNUAL_RATE) / TOTAL_INTERVALS_PER_YEAR;

console.log(`\n💡 РАСЧЕТ:`);
console.log(`  Депозит: ${currentData.uniDepositAmount.toLocaleString()} UNI`);
console.log(`  Формула: (${currentData.uniDepositAmount} × ${ANNUAL_RATE}) ÷ ${TOTAL_INTERVALS_PER_YEAR.toLocaleString()}`);
console.log(`  Доход за 5 минут: ${incomePerInterval.toFixed(6)} UNI`);

// Дополнительные расчеты для наглядности
const incomePerHour = incomePerInterval * INTERVALS_PER_HOUR;
const incomePerDay = incomePerHour * HOURS_PER_DAY;
const incomePerYear = incomePerDay * DAYS_PER_YEAR;

console.log(`\n📈 ПРОЕКЦИЯ ДОХОДОВ:`);
console.log(`  За 5 минут: ${incomePerInterval.toFixed(6)} UNI`);
console.log(`  За час (12 интервалов): ${incomePerHour.toFixed(4)} UNI`);
console.log(`  За день: ${incomePerDay.toFixed(2)} UNI`);
console.log(`  За год: ${incomePerYear.toFixed(0)} UNI (${((incomePerYear/currentData.uniDepositAmount)*100).toFixed(2)}%)`);

// Проверка интервального режима
console.log(`\n🔧 РЕЖИМ РАБОТЫ:`);
const intervalMode = process.env.UNI_FARMING_INTERVAL_MODE;
console.log(`  UNI_FARMING_INTERVAL_MODE = "${intervalMode}"`);

if (intervalMode === 'true') {
  console.log(`  ✅ ИНТЕРВАЛЬНЫЙ РЕЖИМ`);
  console.log(`  📋 Начисления: строго по расписанию каждые 5 минут`);
  console.log(`  💰 Ожидаемая сумма: ${incomePerInterval.toFixed(6)} UNI`);
} else {
  console.log(`  ⚠️  НАКОПИТЕЛЬНЫЙ РЕЖИМ (старая логика)`);
  console.log(`  📋 Начисления: могут накапливаться до 288 периодов`);
  console.log(`  💰 Возможная сумма: до ${(incomePerInterval * 288).toFixed(2)} UNI`);
}

// Информация о следующем начислении
const now = new Date();
const nextCron = new Date(now);
nextCron.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
const timeToNext = nextCron.getTime() - now.getTime();
const minutesToNext = Math.floor(timeToNext / 60000);
const secondsToNext = Math.floor((timeToNext % 60000) / 1000);

console.log(`\n⏰ СЛЕДУЮЩЕЕ НАЧИСЛЕНИЕ:`);
console.log(`  Время: ${nextCron.toLocaleTimeString()}`);
console.log(`  Осталось: ${minutesToNext}м ${secondsToNext}с`);

console.log(`\n🎯 ИТОГ:`);
console.log('='.repeat(50));
if (currentData.uniFarmingActive) {
  console.log(`✅ Фарминг активен с депозитом ${currentData.uniDepositAmount.toLocaleString()} UNI`);
  console.log(`💰 Ожидаемое начисление: ${incomePerInterval.toFixed(6)} UNI каждые 5 минут`);
  console.log(`📊 Годовая доходность: точно 1.00% (${incomePerYear.toFixed(0)} UNI)`);
} else {
  console.log(`❌ Фарминг неактивен - начисления не производятся`);
}