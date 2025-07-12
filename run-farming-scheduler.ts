import { farmingScheduler } from './core/scheduler/farmingScheduler';

console.log('Запуск планировщика UNI farming...');

// Запускаем планировщик
farmingScheduler.start();

// Запускаем одну итерацию вручную для немедленного эффекта
console.log('Выполняем одну итерацию планировщика...');
farmingScheduler['processSchedule']().then(() => {
  console.log('Итерация завершена');
  
  // Проверяем статус
  const status = farmingScheduler.getStatus();
  console.log('Статус планировщика:', status);
  
  // Останавливаем после одной итерации
  setTimeout(() => {
    farmingScheduler.stop();
    console.log('Планировщик остановлен');
    process.exit(0);
  }, 2000);
}).catch(error => {
  console.error('Ошибка планировщика:', error);
  process.exit(1);
});