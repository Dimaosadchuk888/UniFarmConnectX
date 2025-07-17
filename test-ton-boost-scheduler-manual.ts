import { TONBoostIncomeScheduler } from './modules/scheduler/tonBoostIncomeScheduler';
import { logger } from './core/logger';

async function testScheduler() {
  console.log('=== ТЕСТ ЗАПУСКА TON BOOST ПЛАНИРОВЩИКА ===\n');
  console.log(`Время: ${new Date().toLocaleString()}\n`);

  try {
    // Создаем экземпляр планировщика
    const scheduler = new TONBoostIncomeScheduler();
    
    console.log('1. Запускаем обработку TON Boost доходов вручную...\n');
    
    // Вызываем processTonBoostIncome напрямую
    await scheduler.processTonBoostIncome();
    
    console.log('\n✅ Обработка завершена успешно!');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА при выполнении планировщика:');
    console.error(error);
    
    if (error instanceof Error) {
      console.error('\nСтек ошибки:');
      console.error(error.stack);
    }
  }
}

// Переопределяем logger для вывода в консоль
logger.info = console.log;
logger.warn = console.warn;
logger.error = console.error;

testScheduler()
  .then(() => {
    console.log('\n=== ТЕСТ ЗАВЕРШЕН ===');
    process.exit(0);
  })
  .catch(err => {
    console.error('Критическая ошибка:', err);
    process.exit(1);
  });