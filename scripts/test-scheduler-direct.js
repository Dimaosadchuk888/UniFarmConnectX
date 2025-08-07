#!/usr/bin/env node

/**
 * Прямой тест scheduler'ов через ES модули
 */

import dotenv from 'dotenv';
import { farmingScheduler } from '../core/scheduler/farmingScheduler.js';
import { tonBoostIncomeScheduler } from '../modules/scheduler/tonBoostIncomeScheduler.js';

// Загружаем переменные окружения
dotenv.config();

console.log('=== ПРЯМОЙ ТЕСТ SCHEDULER\'ОВ ===');
console.log(new Date().toLocaleString('ru-RU'));
console.log('');

try {
  console.log('🚀 Запуск UNI Farming Scheduler...');
  farmingScheduler.start();
  
  console.log('🚀 Запуск TON Boost Income Scheduler...');
  tonBoostIncomeScheduler.start();
  
  console.log('');
  console.log('✅ Scheduler\'ы запущены!');
  console.log('⏳ Наблюдаем за логами 60 секунд...');
  console.log('=====================================');
  console.log('');

  // Ждем 60 секунд
  setTimeout(() => {
    console.log('');
    console.log('=====================================');
    console.log('✅ Тест завершен.');
    console.log('Проверьте логи выше и транзакции в базе данных.');
    
    // Останавливаем scheduler'ы
    farmingScheduler.stop();
    tonBoostIncomeScheduler.stop();
    
    process.exit(0);
  }, 60000);

} catch (error) {
  console.error('❌ Ошибка:', error);
  process.exit(1);
}