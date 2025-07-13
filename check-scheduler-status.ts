import { getSchedulersStatus } from './modules/scheduler/index.js';

async function checkSchedulerStatus() {
  console.log('🔍 Проверка статуса планировщиков\n');
  
  try {
    const status = getSchedulersStatus();
    console.log('Статус планировщиков:');
    console.log('- TON Boost Income Scheduler:', status.tonBoostIncomeScheduler ? '✅ Активен' : '❌ Неактивен');
  } catch (error) {
    console.error('Ошибка проверки статуса:', error);
  }
}

checkSchedulerStatus();