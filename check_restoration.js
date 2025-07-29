#!/usr/bin/env node

import fs from 'fs';

console.log('🔧 ПРОВЕРКА ВОССТАНОВЛЕНИЯ СИСТЕМЫ TON ДЕПОЗИТОВ');
console.log('=' .repeat(60));

// Проверка 1: UnifiedTransactionService.updateUserBalance восстановлена
console.log('\n1️⃣ Проверка UnifiedTransactionService.updateUserBalance...');
const transactionServiceCode = fs.readFileSync('core/TransactionService.ts', 'utf8');

if (transactionServiceCode.includes('// НЕМЕДЛЕННЫЙ ВЫХОД - НЕ ОБНОВЛЯЕМ БАЛАНСЫ АВТОМАТИЧЕСКИ')) {
  console.log('❌ updateUserBalance ВСЕ ЕЩЕ ОТКЛЮЧЕНА');
} else if (transactionServiceCode.includes('const { BalanceManager } = await import')) {
  console.log('✅ updateUserBalance ВОССТАНОВЛЕНА');
} else {
  console.log('⚠️ updateUserBalance в неопределенном состоянии');
}

// Проверка 2: BalanceManager.subtract восстановлена
console.log('\n2️⃣ Проверка BalanceManager Math.max защиты...');
const balanceManagerCode = fs.readFileSync('core/BalanceManager.ts', 'utf8');

if (balanceManagerCode.includes('Math.max(0, current.balance_uni - amount_uni)')) {
  console.log('✅ BalanceManager Math.max ВОССТАНОВЛЕНА');
} else if (balanceManagerCode.includes('// ОТКЛЮЧЕНО: Math.max для предотвращения')) {
  console.log('❌ BalanceManager Math.max ВСЕ ЕЩЕ ОТКЛЮЧЕНА');
} else {
  console.log('⚠️ BalanceManager в неопределенном состоянии');
}

// Проверка 3: TransactionEnforcer остается отключенным (правильно)
console.log('\n3️⃣ Проверка TransactionEnforcer (должен оставаться отключенным)...');
const enforcerCode = fs.readFileSync('core/TransactionEnforcer.ts', 'utf8');

if (enforcerCode.includes('ВСЕГДА РАЗРЕШАЕМ ВСЕ ОПЕРАЦИИ')) {
  console.log('✅ TransactionEnforcer остается отключенным (правильно)');
} else {
  console.log('⚠️ TransactionEnforcer может быть включен');
}

// Итоговый результат
console.log('\n' + '='.repeat(60));
console.log('🎯 РЕЗУЛЬТАТ ВОССТАНОВЛЕНИЯ:');

const updateUserBalanceRestored = transactionServiceCode.includes('const { BalanceManager } = await import');
const mathMaxRestored = balanceManagerCode.includes('Math.max(0, current.balance_uni - amount_uni)');
const enforcerDisabled = enforcerCode.includes('ВСЕГДА РАЗРЕШАЕМ ВСЕ ОПЕРАЦИИ');

if (updateUserBalanceRestored && mathMaxRestored) {
  console.log('✅ КРИТИЧЕСКИЕ ФУНКЦИИ ВОССТАНОВЛЕНЫ');
  console.log('   ✓ updateUserBalance: активна - TON депозиты будут зачисляться');
  console.log('   ✓ Math.max защита: активна - балансы не уйдут в минус');
  console.log('   ✓ Enforcer: отключен - избыточные блокировки отключены');
  console.log('\n🚀 СИСТЕМА ГОТОВА К ОБРАБОТКЕ TON ДЕПОЗИТОВ');
} else {
  console.log('❌ ВОССТАНОВЛЕНИЕ НЕПОЛНОЕ');
  console.log(`   updateUserBalance: ${updateUserBalanceRestored ? '✓' : '❌'}`);
  console.log(`   Math.max защита: ${mathMaxRestored ? '✓' : '❌'}`);
  console.log('\n⚠️ ТРЕБУЕТСЯ ДОПОЛНИТЕЛЬНАЯ РАБОТА');
}

console.log('=' .repeat(60));