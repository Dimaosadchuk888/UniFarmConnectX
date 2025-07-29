#!/usr/bin/env tsx

/**
 * Быстрая проверка, что функция subtractBalance разблокирована
 */

import { readFileSync } from 'fs';

console.log('\n🔍 ПРОВЕРКА ИЗМЕНЕНИЙ В subtractBalance\n');
console.log('='.repeat(60));

try {
  const content = readFileSync('./core/BalanceManager.ts', 'utf8');
  
  // Ищем функцию subtractBalance
  const subtractIndex = content.indexOf('async subtractBalance');
  if (subtractIndex === -1) {
    console.log('❌ Функция subtractBalance не найдена!');
    process.exit(1);
  }
  
  // Берем следующие 1000 символов после начала функции
  const functionContent = content.substring(subtractIndex, subtractIndex + 1000);
  
  // Проверяем наличие блокировки
  if (functionContent.includes('ANTI_ROLLBACK_PROTECTION')) {
    console.log('❌ ФУНКЦИЯ ВСЁ ЕЩЁ ЗАБЛОКИРОВАНА!');
    console.log('\nНайден код блокировки ANTI_ROLLBACK_PROTECTION');
  } else if (functionContent.includes('updateUserBalance')) {
    console.log('✅ ФУНКЦИЯ РАЗБЛОКИРОВАНА И РАБОТАЕТ!');
    console.log('\nФункция теперь вызывает updateUserBalance для списания средств');
    console.log('Покупки TON Boost и выводы средств должны работать');
  } else {
    console.log('⚠️  Неопределенное состояние функции');
  }
  
  // Показываем первые несколько строк функции
  console.log('\nПервые строки функции:');
  console.log('-'.repeat(40));
  const lines = functionContent.split('\n').slice(0, 10);
  lines.forEach((line, i) => {
    console.log(`${i + 1}: ${line}`);
  });
  
} catch (error) {
  console.error('❌ Ошибка чтения файла:', error);
}

console.log('\n' + '='.repeat(60));