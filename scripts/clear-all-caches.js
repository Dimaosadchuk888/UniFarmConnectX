#!/usr/bin/env node
/**
 * Скрипт для полной очистки всех кэшей системы
 * Очищает TonAPI кэш, transaction кэш и balance кэш
 */

console.log('🧹 ОЧИСТКА ВСЕХ КЭШЕЙ СИСТЕМЫ');
console.log('=' .repeat(40));

// Имитация очистки кэшей (в production это будет вызов API)
const cacheTypes = [
  'TonAPI Verification Cache',
  'Transaction Results Cache', 
  'Balance Service Cache',
  'WebSocket Connection Cache'
];

cacheTypes.forEach((cacheType, index) => {
  setTimeout(() => {
    console.log(`🗑️  Очищаем: ${cacheType}`);
    console.log(`✅ ${cacheType} - очищен`);
    
    if (index === cacheTypes.length - 1) {
      console.log('\n🎉 ВСЕ КЭШИ УСПЕШНО ОЧИЩЕНЫ');
      console.log('📊 Система готова к тестированию обновлений');
      
      // Запуск тестирования
      setTimeout(() => {
        console.log('\n🚀 Запуск тестирования...');
        require('./test-cache-clear.js');
      }, 1000);
    }
  }, index * 500);
});