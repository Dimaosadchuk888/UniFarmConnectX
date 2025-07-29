#!/usr/bin/env tsx

/**
 * Анализ важности 7 заблокированных ANTI_ROLLBACK_PROTECTION функций
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

console.log('\n🔍 АНАЛИЗ КРИТИЧНОСТИ ЗАБЛОКИРОВАННЫХ ФУНКЦИЙ\n');
console.log('='.repeat(80));

interface BlockedFunction {
  name: string;
  file: string;
  description: string;
  criticalityScore: number; // 1-10
  userImpact: string;
  canStayBlocked: boolean;
}

const blockedFunctions: BlockedFunction[] = [
  {
    name: "1. BalanceManager.updateUserBalance() - Math.max(0)",
    file: "core/BalanceManager.ts",
    description: "Автоматическое обнуление отрицательных балансов",
    criticalityScore: 3,
    userImpact: "Отрицательные балансы теперь разрешены (не критично)",
    canStayBlocked: true
  },
  {
    name: "2. TransactionEnforcer.enforcePolicy()",
    file: "core/TransactionEnforcer.ts", 
    description: "Блокировка операций без транзакций за 5 минут",
    criticalityScore: 5,
    userImpact: "Все операции автоматически разрешены (умеренно важно)",
    canStayBlocked: true
  },
  {
    name: "3. BatchBalanceProcessor.invalidateBatch()",
    file: "core/BatchBalanceProcessor.ts",
    description: "Массовая инвалидация кеша балансов",
    criticalityScore: 2,
    userImpact: "Кеш не сбрасывается массово (не критично)",
    canStayBlocked: true
  },
  {
    name: "4. TransactionsService.recalculateUserBalance()",
    file: "modules/transactions/service.ts",
    description: "Пересчет балансов на основе транзакций",
    criticalityScore: 8,
    userImpact: "⚠️ Балансы не пересчитываются автоматически (важно!)",
    canStayBlocked: false
  },
  {
    name: "5. TransactionEnforcer.detectDirectSQLUpdates()",
    file: "core/TransactionEnforcer.ts",
    description: "Детектор прямых SQL изменений балансов",
    criticalityScore: 2,
    userImpact: "Нет мониторинга SQL изменений (не критично)",
    canStayBlocked: true
  },
  {
    name: "6. UnifiedTransactionService.updateUserBalance()",
    file: "core/TransactionService.ts",
    description: "Автоматическое обновление балансов при транзакциях",
    criticalityScore: 9,
    userImpact: "⚠️ ТРАНЗАКЦИИ НЕ ОБНОВЛЯЮТ БАЛАНСЫ (критично!)",
    canStayBlocked: false
  },
  {
    name: "7. SQL скрипт удаления дубликатов",
    file: "scripts/sql/2_clean_duplicates.sql",
    description: "Автоматическое удаление дубликатов транзакций",
    criticalityScore: 4,
    userImpact: "Дубликаты не удаляются автоматически (умеренно)",
    canStayBlocked: true
  }
];

// Анализ каждой функции
console.log('\n📊 РЕЙТИНГ КРИТИЧНОСТИ (1-10):\n');

const criticalFunctions = blockedFunctions.filter(f => f.criticalityScore >= 8);
const moderateFunctions = blockedFunctions.filter(f => f.criticalityScore >= 5 && f.criticalityScore < 8);
const lowFunctions = blockedFunctions.filter(f => f.criticalityScore < 5);

// Критичные функции
console.log('🔴 КРИТИЧНЫЕ ФУНКЦИИ (требуют разблокировки):');
console.log('-'.repeat(60));
criticalFunctions.forEach(func => {
  console.log(`${func.name}`);
  console.log(`  Критичность: ${func.criticalityScore}/10`);
  console.log(`  Влияние: ${func.userImpact}`);
  console.log(`  Файл: ${func.file}`);
  console.log('');
});

// Умеренные функции
console.log('\n🟡 УМЕРЕННО ВАЖНЫЕ ФУНКЦИИ:');
console.log('-'.repeat(60));
moderateFunctions.forEach(func => {
  console.log(`${func.name}`);
  console.log(`  Критичность: ${func.criticalityScore}/10`);
  console.log(`  Влияние: ${func.userImpact}`);
  console.log('');
});

// Низкоприоритетные функции
console.log('\n🟢 НИЗКОПРИОРИТЕТНЫЕ ФУНКЦИИ (могут оставаться заблокированными):');
console.log('-'.repeat(60));
lowFunctions.forEach(func => {
  console.log(`${func.name}`);
  console.log(`  Критичность: ${func.criticalityScore}/10`);
  console.log(`  Влияние: ${func.userImpact}`);
  console.log('');
});

// Проверка текущего состояния критичных функций
console.log('\n🔍 ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ КРИТИЧНЫХ ФУНКЦИЙ:\n');

try {
  // Проверка UnifiedTransactionService.updateUserBalance
  const transactionServiceContent = readFileSync('./core/TransactionService.ts', 'utf8');
  const updateUserBalanceIndex = transactionServiceContent.indexOf('async updateUserBalance');
  if (updateUserBalanceIndex !== -1) {
    const functionSnippet = transactionServiceContent.substring(updateUserBalanceIndex, updateUserBalanceIndex + 500);
    if (functionSnippet.includes('ANTI_ROLLBACK_PROTECTION')) {
      console.log('❌ UnifiedTransactionService.updateUserBalance - ВСЁ ЕЩЁ ЗАБЛОКИРОВАНА!');
      console.log('   Это критично - транзакции не обновляют балансы пользователей!');
    } else {
      console.log('✅ UnifiedTransactionService.updateUserBalance - работает');
    }
  }
  
  // Проверка TransactionsService.recalculateUserBalance
  const transactionsServiceContent = readFileSync('./modules/transactions/service.ts', 'utf8');
  const recalculateIndex = transactionsServiceContent.indexOf('async recalculateUserBalance');
  if (recalculateIndex !== -1) {
    const functionSnippet = transactionsServiceContent.substring(recalculateIndex, recalculateIndex + 300);
    if (functionSnippet.includes('ANTI_ROLLBACK_PROTECTION')) {
      console.log('\n❌ TransactionsService.recalculateUserBalance - ВСЁ ЕЩЁ ЗАБЛОКИРОВАНА!');
      console.log('   Важно для корректного пересчета балансов');
    } else {
      console.log('\n✅ TransactionsService.recalculateUserBalance - работает');
    }
  }
} catch (error) {
  console.log('\n⚠️ Не удалось проверить состояние функций:', error.message);
}

// Итоговые рекомендации
console.log('\n' + '='.repeat(80));
console.log('\n📋 ИТОГОВЫЕ РЕКОМЕНДАЦИИ:\n');

console.log('1. КРИТИЧНО РАЗБЛОКИРОВАТЬ:');
console.log('   • UnifiedTransactionService.updateUserBalance() - без этого депозиты не зачисляются!');
console.log('   • TransactionsService.recalculateUserBalance() - для корректного пересчета балансов');

console.log('\n2. МОЖНО ОСТАВИТЬ ЗАБЛОКИРОВАННЫМИ:');
console.log('   • Math.max(0) защиту - отрицательные балансы не страшны');
console.log('   • BatchBalanceProcessor - кеш работает и без массовой инвалидации');
console.log('   • detectDirectSQLUpdates - мониторинг не критичен');
console.log('   • SQL скрипт дубликатов - можно чистить вручную при необходимости');

console.log('\n3. СПОРНЫЕ (требуют анализа):');
console.log('   • TransactionEnforcer.enforcePolicy() - может быть важен для безопасности');

console.log('\n' + '='.repeat(80));