const fs = require('fs');

console.log('🔍 ПРОВЕРКА ПРИМЕНЕНИЯ ИСПРАВЛЕНИЙ ПЛАНИРОВЩИКОВ');
console.log('='.repeat(60));

// Проверка UNI Farming Scheduler
const farmingSchedulerPath = 'core/scheduler/farmingScheduler.ts';
if (fs.existsSync(farmingSchedulerPath)) {
  const content = fs.readFileSync(farmingSchedulerPath, 'utf8');
  
  console.log('\n📄 UNI FARMING SCHEDULER (farmingScheduler.ts):');
  
  // Ищем удаленные строки
  const hasImmediateStart = content.includes('this.processUniFarmingIncome()') && 
                           content.includes('this.processTonFarmingIncome()') &&
                           content.includes('Запускаем первое начисление сразу при старте');
  
  if (hasImmediateStart) {
    console.log('❌ ПРОБЛЕМА: Немедленные запуски все еще присутствуют в коде!');
    console.log('   Строки 52-60 НЕ удалены.');
  } else {
    console.log('✅ ИСПРАВЛЕНО: Немедленные запуски убраны из кода.');
  }
  
  // Показываем start() метод
  const startMethodMatch = content.match(/start\(\)\s*\{[\s\S]*?\n\s*\}/);
  if (startMethodMatch) {
    console.log('\n📋 Текущий start() метод:');
    console.log(startMethodMatch[0]);
  }
} else {
  console.log('❌ Файл farmingScheduler.ts не найден!');
}

// Проверка TON Boost Scheduler  
const tonSchedulerPath = 'modules/scheduler/tonBoostIncomeScheduler.ts';
if (fs.existsSync(tonSchedulerPath)) {
  const content = fs.readFileSync(tonSchedulerPath, 'utf8');
  
  console.log('\n📄 TON BOOST SCHEDULER (tonBoostIncomeScheduler.ts):');
  
  // Ищем удаленные строки
  const hasImmediateStart = content.includes('this.processTonBoostIncome()') && 
                           content.includes('Первый запуск сразу');
  
  if (hasImmediateStart) {
    console.log('❌ ПРОБЛЕМА: Немедленные запуски все еще присутствуют в коде!');
    console.log('   Строки 31-35 НЕ удалены.');
  } else {
    console.log('✅ ИСПРАВЛЕНО: Немедленные запуски убраны из кода.');
  }
  
  // Показываем start() метод
  const startMethodMatch = content.match(/start\(\)\s*\{[\s\S]*?\n\s*\}/);
  if (startMethodMatch) {
    console.log('\n📋 Текущий start() метод:');
    console.log(startMethodMatch[0]);
  }
} else {
  console.log('❌ Файл tonBoostIncomeScheduler.ts не найден!');
}

console.log('\n' + '='.repeat(60));
console.log('🎯 ЗАКЛЮЧЕНИЕ:');
console.log('Если исправления применены в коде, но интервалы все еще аномальные,');
console.log('то требуется полный перезапуск системы для применения изменений.');