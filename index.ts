#!/usr/bin/env node

import { startServer } from './core/server';

// Запуск приложения
async function bootstrap() {
  try {
    console.log('🚀 Запуск UniFarm...');
    console.log('📦 Загрузка модульной архитектуры...');
    
    await startServer();
    
    console.log('✅ UniFarm успешно запущен');
  } catch (error) {
    console.error('❌ Критическая ошибка при запуске:', error);
    process.exit(1);
  }
}

// Обработка необработанных исключений
process.on('uncaughtException', (error: Error) => {
  console.error('🚨 Необработанное исключение:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('🚨 Необработанное отклонение промиса:', reason);
  console.error('Промис:', promise);
  process.exit(1);
});

// Запуск
bootstrap();