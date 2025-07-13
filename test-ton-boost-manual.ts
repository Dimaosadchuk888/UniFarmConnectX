import { tonBoostIncomeScheduler } from './modules/scheduler/tonBoostIncomeScheduler.js';

async function testTonBoostManual() {
  console.log('🔍 Тестирование ручного запуска TON Boost планировщика\n');
  
  try {
    console.log('Запускаем processTonBoostIncome()...\n');
    
    // Вызываем напрямую метод обработки
    await (tonBoostIncomeScheduler as any).processTonBoostIncome();
    
    console.log('\n✅ Обработка завершена');
    console.log('Проверьте новые транзакции командой: npx tsx check-new-ton-transactions.ts');
  } catch (error) {
    console.error('❌ Ошибка при обработке:', error);
  }
}

testTonBoostManual();