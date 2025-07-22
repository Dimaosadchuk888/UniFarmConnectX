#!/usr/bin/env node

/**
 * ДИАГНОСТИКА ИНТЕРВАЛЬНОГО РЕЖИМА В RUNTIME
 * Проверка фактической работы переменной окружения в коде
 */

console.log('🔍 ДИАГНОСТИКА ИНТЕРВАЛЬНОГО РЕЖИМА В RUNTIME');
console.log('='.repeat(60));

// 1. ПРОВЕРКА ПЕРЕМЕННОЙ ОКРУЖЕНИЯ
console.log('\n📋 1. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ:');
const intervalMode = process.env.UNI_FARMING_INTERVAL_MODE;
console.log(`  UNI_FARMING_INTERVAL_MODE = "${intervalMode}"`);
console.log(`  Тип значения: ${typeof intervalMode}`);
console.log(`  Строгое сравнение === 'true': ${intervalMode === 'true'}`);
console.log(`  Нестрогое сравнение == 'true': ${intervalMode == 'true'}`);
console.log(`  Boolean(intervalMode): ${Boolean(intervalMode)}`);

// 2. СИМУЛЯЦИЯ КОДА КАЛЬКУЛЯТОРА
console.log('\n📋 2. СИМУЛЯЦИЯ LOGИКИ КАЛЬКУЛЯТОРА:');

// Имитируем логику из UnifiedFarmingCalculator.ts
const useIntervalMode = process.env.UNI_FARMING_INTERVAL_MODE === 'true';
console.log(`  useIntervalMode = ${useIntervalMode}`);

// Симуляция расчета периодов
const mockFarmer = {
  user_id: 184,
  uni_deposit_amount: 19291,
  uni_farming_last_update: new Date(Date.now() - 6 * 60 * 1000), // 6 минут назад
  uni_farming_start: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 часа назад
};

const now = new Date();
const lastUpdate = new Date(mockFarmer.uni_farming_last_update);
const minutesSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
const periods = Math.floor(minutesSinceLastUpdate / 5);
const MAX_ALLOWED_PERIODS = 288;

console.log(`\n  Симуляция расчета для User ${mockFarmer.user_id}:`);
console.log(`  ├── Время с последнего обновления: ${minutesSinceLastUpdate.toFixed(2)} минут`);
console.log(`  ├── Рассчитанных периодов: ${periods}`);
console.log(`  ├── Максимально разрешенных периодов: ${MAX_ALLOWED_PERIODS}`);

// Ключевая логика из кода
const effectivePeriods = useIntervalMode ? 1 : Math.min(periods, MAX_ALLOWED_PERIODS);
console.log(`  └── Эффективных периодов: ${effectivePeriods}`);

if (useIntervalMode) {
  console.log(`  ✅ ИНТЕРВАЛЬНЫЙ РЕЖИМ: всегда 1 период`);
} else {
  console.log(`  ⚠️  НАКОПИТЕЛЬНЫЙ РЕЖИМ: до ${periods} периодов`);
}

// 3. РАСЧЕТ ОЖИДАЕМОГО ДОХОДА
console.log('\n📋 3. РАСЧЕТ ОЖИДАЕМОГО ДОХОДА:');

const depositAmount = parseFloat(mockFarmer.uni_deposit_amount);
const rate = 0.01; // 1% в день
const dailyIncome = depositAmount * rate;
const incomePerPeriod = dailyIncome / 288;
const totalIncome = incomePerPeriod * effectivePeriods;

console.log(`  Депозит: ${depositAmount.toLocaleString()} UNI`);
console.log(`  Дневной доход (1%): ${dailyIncome.toFixed(2)} UNI`);
console.log(`  Доход за 1 период: ${incomePerPeriod.toFixed(6)} UNI`);
console.log(`  Эффективных периодов: ${effectivePeriods}`);
console.log(`  ИТОГО К НАЧИСЛЕНИЮ: ${totalIncome.toFixed(6)} UNI`);

// 4. АНАЛИЗ ФАКТИЧЕСКИХ ДАННЫХ
console.log('\n📋 4. АНАЛИЗ ФАКТИЧЕСКИХ ИЗМЕНЕНИЙ:');

// Данные из логов браузера
const balanceHistory = [
  { time: '09:36', balance: 277441.755287 },
  { time: '09:39', balance: 277660.887231 }
];

if (balanceHistory.length >= 2) {
  const lastChange = balanceHistory[balanceHistory.length - 1].balance - balanceHistory[balanceHistory.length - 2].balance;
  const expectedChange = totalIncome;
  const ratio = lastChange / expectedChange;
  
  console.log(`  Последнее изменение баланса: +${lastChange.toFixed(6)} UNI`);
  console.log(`  Ожидаемое изменение: +${expectedChange.toFixed(6)} UNI`);
  console.log(`  Соотношение фактического к ожидаемому: ${ratio.toFixed(1)}x`);
  
  if (ratio > 100) {
    console.log(`  ❌ ПРОБЛЕМА: Интервальный режим НЕ РАБОТАЕТ!`);
  } else if (ratio >= 0.8 && ratio <= 1.2) {
    console.log(`  ✅ НОРМА: Интервальный режим работает корректно`);
  }
}

// 5. ПРОВЕРКА ВСЕХ СВЯЗАННЫХ ПЕРЕМЕННЫХ
console.log('\n📋 5. ПРОВЕРКА СВЯЗАННЫХ ПЕРЕМЕННЫХ:');
console.log(`  NODE_ENV = "${process.env.NODE_ENV}"`);
console.log(`  REPLIT_ENVIRONMENT = "${process.env.REPLIT_ENVIRONMENT}"`);
console.log(`  PWD = "${process.env.PWD}"`);

// Проверка, не переопределяется ли переменная где-то в коде
const envVars = Object.keys(process.env).filter(key => key.includes('FARM') || key.includes('UNI') || key.includes('INTERVAL'));
console.log(`  Все переменные с FARM/UNI/INTERVAL:`);
envVars.forEach(key => {
  console.log(`    ${key} = "${process.env[key]}"`);
});

// 6. ВРЕМЯ И CRON АНАЛИЗ
console.log('\n📋 6. АНАЛИЗ ВРЕМЕНИ И CRON:');
const currentTime = new Date();
const nextCronTime = new Date(currentTime);
nextCronTime.setMinutes(Math.ceil(currentTime.getMinutes() / 5) * 5, 0, 0);

console.log(`  Текущее время: ${currentTime.toISOString()}`);
console.log(`  Следующий CRON: ${nextCronTime.toISOString()}`);
console.log(`  Минут до следующего запуска: ${Math.ceil((nextCronTime - currentTime) / 60000)}`);

// 7. ИТОГОВЫЙ ДИАГНОЗ
console.log('\n🎯 ИТОГОВЫЙ ДИАГНОЗ:');
console.log('='.repeat(60));

console.log(`📊 СТАТУС ПЕРЕМЕННОЙ ОКРУЖЕНИЯ:`);
console.log(`  UNI_FARMING_INTERVAL_MODE = "${intervalMode}" (${intervalMode === 'true' ? 'АКТИВЕН' : 'НЕАКТИВЕН'})`);

console.log(`\n📊 ЛОГИКА КОДА:`);
console.log(`  useIntervalMode = ${useIntervalMode}`);
console.log(`  effectivePeriods = ${effectivePeriods} ${effectivePeriods === 1 ? '(интервальный)' : '(накопительный)'}`);

console.log(`\n📊 ОЖИДАЕМОЕ ПОВЕДЕНИЕ:`);
if (useIntervalMode) {
  console.log(`  ✅ Должны начисляться ${incomePerPeriod.toFixed(6)} UNI каждые 5 минут`);
} else {
  console.log(`  ⚠️  Могут начисляться до ${(incomePerPeriod * periods).toFixed(2)} UNI за накопленные периоды`);
}

console.log(`\n📊 РЕКОМЕНДАЦИИ ДЛЯ ДИАГНОСТИКИ:`);
console.log(`  1. Проверить логи UnifiedFarmingCalculator.calculateIncome()`);
console.log(`  2. Добавить debug логирование в строку 54-55 калькулятора`);
console.log(`  3. Проверить, вызывается ли калькулятор вообще`);
console.log(`  4. Убедиться, что переменная окружения не переопределяется в runtime`);

console.log(`\n📋 СЛЕДУЮЩИЙ CRON ЗАПУСК ЧЕРЕЗ: ${Math.ceil((nextCronTime - currentTime) / 60000)} минут`);