#!/usr/bin/env ts-node
import addWalletAddress from './migrations/add_wallet_address';

/**
 * Скрипт для запуска всех миграций в правильном порядке
 */
async function runAllMigrations() {
  try {
    console.log('Начинаем выполнение всех миграций');
    
    // Запускаем миграции в нужном порядке
    await addWalletAddress();
    
    console.log('Все миграции успешно выполнены');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при выполнении миграций:', error);
    process.exit(1);
  }
}

// Запускаем все миграции
runAllMigrations();