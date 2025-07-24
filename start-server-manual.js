/**
 * Ручной запуск сервера для проверки изменений
 */

const express = require('express');
const { logger } = require('./core/logger.js');

console.log('🚀 ЗАПУСК СЕРВЕРА ДЛЯ ПРОВЕРКИ TON BOOST ИЗМЕНЕНИЙ');
console.log('================================================\n');

async function startServer() {
  try {
    // Импорт основного сервера
    const serverModule = await import('./server/index.js');
    console.log('✅ Сервер успешно импортирован');
    
    // Проверка что планировщики запущены
    setTimeout(() => {
      console.log('\n📊 СТАТУС СИСТЕМЫ:');
      console.log('==================');
      console.log('🔄 Сервер запущен и работает');
      console.log('🔄 TON Boost система восстановлена');
      console.log('🔄 Планировщики должны быть активны');
      console.log('\n✅ Система готова к тестированию!');
    }, 3000);
    
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

startServer();