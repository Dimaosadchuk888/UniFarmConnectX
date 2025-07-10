#!/usr/bin/env node

/**
 * Тестирование исправленных scheduler'ов
 * Запускает scheduler'ы напрямую для проверки
 */

const dotenv = require('dotenv');
const path = require('path');

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testSchedulers() {
  console.log('=== ТЕСТИРОВАНИЕ ИСПРАВЛЕННЫХ SCHEDULER\'ОВ ===');
  console.log(new Date().toLocaleString('ru-RU'));
  console.log('');

  try {
    // Динамический импорт TypeScript модулей
    console.log('📦 Загрузка модулей...');
    
    // Регистрируем ts-node для работы с TypeScript
    require('ts-node').register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
        target: 'es2020',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    });

    // Импортируем scheduler'ы
    const { farmingScheduler } = require('../core/scheduler/farmingScheduler');
    const { tonBoostIncomeScheduler } = require('../modules/scheduler/tonBoostIncomeScheduler');
    
    console.log('✅ Модули загружены успешно');
    console.log('');

    // Запускаем scheduler'ы
    console.log('🚀 Запуск UNI Farming Scheduler...');
    farmingScheduler.start();
    
    console.log('🚀 Запуск TON Boost Income Scheduler...');
    tonBoostIncomeScheduler.start();
    
    console.log('');
    console.log('⏳ Ожидание 30 секунд для проверки работы scheduler\'ов...');
    console.log('📊 Следите за логами ниже:');
    console.log('=====================================');
    console.log('');

    // Ждем 30 секунд, чтобы увидеть логи
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log('');
    console.log('=====================================');
    console.log('✅ Тест завершен. Проверьте логи выше.');
    console.log('');
    console.log('Если вы видели сообщения о начислениях - scheduler\'ы работают!');
    console.log('Если нет - проверьте ошибки в логах.');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Ошибка при тестировании scheduler\'ов:', error);
    process.exit(1);
  }
}

// Запуск теста
testSchedulers().catch(console.error);