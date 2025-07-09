#!/usr/bin/env node

/**
 * Безопасный запуск критических тестов UniFarm
 * 
 * Этот скрипт обеспечивает изолированное выполнение тестов
 * без влияния на production данные
 */

console.log('🔍 Проверка окружения...\n');

// Проверяем, что не используется production база данных
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PRODUCTION_TESTS) {
  console.error('❌ ОШИБКА: Попытка запуска тестов в production окружении!');
  console.error('   Для принудительного запуска установите ALLOW_PRODUCTION_TESTS=true');
  process.exit(1);
}

// Устанавливаем тестовое окружение
process.env.NODE_ENV = 'test';
process.env.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v2';

console.log('📋 Конфигурация тестов:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   API_BASE_URL: ${process.env.API_BASE_URL}`);
console.log(`   База данных: ${process.env.DATABASE_URL ? 'Настроена' : 'Не настроена'}`);
console.log('');

// Импортируем и запускаем тесты
const { runAllTests } = require('./critical-operations.test.js');

runAllTests()
  .then(() => {
    console.log('✅ Тестирование завершено');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка при выполнении тестов:', error);
    process.exit(1);
  });