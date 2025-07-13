// Диагностический скрипт для проверки парсинга min_amount в BOOST_PURCHASE транзакциях

const BOOST_PACKAGES = {
  STARTER: {
    name: 'Starter Boost',
    daily_rate: '0.01',
    min_amount: '1.0',
    max_amount: '1000.0',
    duration_days: 365,
    uni_bonus: '10000'
  },
  STANDARD: {
    name: 'Standard Boost',
    daily_rate: '0.015',
    min_amount: '5.0',
    max_amount: '5000.0',
    duration_days: 365,
    uni_bonus: '50000'
  },
  ADVANCED: {
    name: 'Advanced Boost',
    daily_rate: '0.02',
    min_amount: '10.0',
    max_amount: '10000.0',
    duration_days: 365,
    uni_bonus: '100000'
  },
  PREMIUM: {
    name: 'Premium Boost',
    daily_rate: '0.025',
    min_amount: '25.0',
    max_amount: '25000.0',
    duration_days: 365,
    uni_bonus: '500000'
  },
  ELITE: {
    name: 'Elite Boost',
    daily_rate: '0.03',
    min_amount: '100.0',
    max_amount: '100000.0',
    duration_days: 365,
    uni_bonus: '1000000'
  }
};

console.log('🔍 ПРОВЕРКА ПАРСИНГА min_amount ДЛЯ BOOST ПАКЕТОВ\n');
console.log('='*60 + '\n');

// Проверка каждого пакета
Object.entries(BOOST_PACKAGES).forEach(([key, pkg]) => {
  console.log(`📦 ${key} (${pkg.name}):`);
  console.log(`  • min_amount (строка): "${pkg.min_amount}"`);
  
  const parsedValue = parseFloat(pkg.min_amount);
  console.log(`  • parseFloat результат: ${parsedValue}`);
  console.log(`  • Тип после parseFloat: ${typeof parsedValue}`);
  console.log(`  • isNaN: ${isNaN(parsedValue)}`);
  
  // Проверка, что произойдет при toString()
  const backToString = parsedValue.toString();
  console.log(`  • toString() результат: "${backToString}"`);
  
  // Симуляция кода из purchaseWithInternalWallet
  const requiredAmount = parseFloat(pkg.min_amount || "0");
  console.log(`  • requiredAmount (с fallback): ${requiredAmount}`);
  console.log(`  • Финальная строка для транзакции: "${requiredAmount.toString()}"`);
  
  console.log('');
});

// Проверка специфичного случая с undefined
console.log('\n📌 ПРОВЕРКА ГРАНИЧНЫХ СЛУЧАЕВ:\n');

const testCases = [
  { input: undefined, label: 'undefined' },
  { input: null, label: 'null' },
  { input: '', label: 'пустая строка' },
  { input: '0', label: '"0"' },
  { input: '0.0', label: '"0.0"' },
  { input: 0, label: '0 (число)' }
];

testCases.forEach(test => {
  const result = parseFloat(test.input || "0");
  console.log(`${test.label} → parseFloat → ${result} → toString → "${result.toString()}"`);
});

console.log('\n💡 ВЫВОДЫ:\n');
console.log('Если min_amount корректно парсится, проблема может быть в:');
console.log('1. boostPackage.min_amount = undefined (нет такого поля)');
console.log('2. boostPackage = null/undefined');
console.log('3. Ошибка в логике до создания транзакции');