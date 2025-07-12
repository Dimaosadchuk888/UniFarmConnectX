import { FarmingScheduler } from './core/scheduler/farmingScheduler';
import { logger } from './core/logger';

async function runFarmingScheduler() {
  console.log('\n=== ЗАПУСК ПЛАНИРОВЩИКА UNI FARMING ===\n');
  
  try {
    // Создаем экземпляр планировщика
    const scheduler = new FarmingScheduler();
    
    // Запускаем планировщик
    console.log('Запускаем планировщик...');
    scheduler.start();
    
    // Ждем 10 секунд чтобы дать планировщику отработать
    console.log('Ожидаем выполнения планировщика (10 секунд)...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Останавливаем планировщик
    console.log('Останавливаем планировщик...');
    scheduler.stop();
    
    console.log('\n=== ПЛАНИРОВЩИК ЗАВЕРШИЛ РАБОТУ ===\n');
    
  } catch (error) {
    console.error('Ошибка при запуске планировщика:', error);
  }
  
  // Даем время на завершение всех асинхронных операций
  await new Promise(resolve => setTimeout(resolve, 2000));
  process.exit(0);
}

runFarmingScheduler();